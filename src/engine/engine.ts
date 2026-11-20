import {
  ParsedDataset,
  AirportClosure,
  Flight,
  SimulatedFlight,
  SimulatedConnection,
  SimulatedCrew,
  SimulationResult,
  SimulationKPIs,
  CauseChainLink,
  DelayReason,
  PatientZeroReport,
  CostWeights,
  RecoveryAction
} from '../types';
import { minutesToTime } from '../data/adapter';

export const DEFAULT_COST_WEIGHTS: CostWeights = {
  delayPerMinute: 1500,
  cancellationPerFlight: 400000,
  strandedPax: 8000,
  crewViolation: 250000,
  spareDeployment: 150000
};

export interface SimulationOptions {
  cancellationThresholdMinutes?: number; // default 180 min
  appliedActions?: RecoveryAction[];
  costWeights?: CostWeights;
}

/**
 * Checks if a time window overlaps with an airport closure.
 */
function getClosureDelay(
  timeMin: number,
  airportId: string,
  closures: AirportClosure[]
): { delayedUntil: number; closure: AirportClosure } | null {
  for (const c of closures) {
    if (c.airport === airportId) {
      if (timeMin >= c.startMinutes && timeMin < c.endMinutes) {
        return { delayedUntil: c.endMinutes, closure: c };
      }
    }
  }
  return null;
}

/**
 * Pure, deterministic simulation engine.
 * Same input -> Same output. No randomness, no LLM, no network.
 */
export function runSimulation(
  dataset: ParsedDataset,
  closures: AirportClosure[],
  options: SimulationOptions = {}
): SimulationResult {
  const threshold = options.cancellationThresholdMinutes ?? 180;
  const weights = options.costWeights ?? DEFAULT_COST_WEIGHTS;
  const appliedActions = options.appliedActions || [];

  // Track actions by type
  const cancelledFlightIds = new Set<string>();
  const spareSwaps = new Map<string, { spareTail: string; startFlightId: string }>(); // targetTail -> spare info
  const aircraftSwaps = new Map<string, string>(); // tailA <-> tailB
  const heldFlights = new Map<string, number>(); // flightId -> holdMinutes
  const crewReassignments = new Map<string, string>(); // crewId -> newCrewId (or flightId -> newCrew)

  for (const act of appliedActions) {
    if (act.type === 'CANCEL_FLIGHT' && act.flightId) {
      cancelledFlightIds.add(act.flightId);
    } else if (act.type === 'SWAP_SPARE' && act.targetTailId && act.spareTailId) {
      spareSwaps.set(act.targetTailId, {
        spareTail: act.spareTailId,
        startFlightId: act.flightId || ''
      });
    } else if (act.type === 'SWAP_AIRCRAFT' && act.tailA && act.tailB) {
      aircraftSwaps.set(act.tailA, act.tailB);
      aircraftSwaps.set(act.tailB, act.tailA);
    } else if (act.type === 'HOLD_CONNECTION' && act.flightId && act.holdMinutes) {
      heldFlights.set(act.flightId, act.holdMinutes);
    } else if (act.type === 'REASSIGN_CREW' && act.crewId && act.newCrewId) {
      crewReassignments.set(act.crewId, act.newCrewId);
    }
  }

  // Map flights to their active aircraft tail
  const flightActiveTail = new Map<string, string>();
  for (const f of dataset.flights) {
    let activeTail = f.tail_id;
    if (aircraftSwaps.has(activeTail)) {
      activeTail = aircraftSwaps.get(activeTail)!;
    }
    flightActiveTail.set(f.flight_id, activeTail);
  }

  // Handle spare swaps
  for (const [targetTail, swapInfo] of spareSwaps.entries()) {
    const rotation = dataset.rotations.get(targetTail) || [];
    let swapActive = false;
    for (const f of rotation) {
      if (!swapInfo.startFlightId || f.flight_id === swapInfo.startFlightId) {
        swapActive = true;
      }
      if (swapActive) {
        flightActiveTail.set(f.flight_id, swapInfo.spareTail);
      }
    }
  }

  // Group flights by active aircraft rotation
  const activeRotations = new Map<string, Flight[]>();
  for (const f of dataset.flights) {
    const tail = flightActiveTail.get(f.flight_id)!;
    if (!activeRotations.has(tail)) {
      activeRotations.set(tail, []);
    }
    activeRotations.get(tail)!.push(f);
  }

  // Sort each rotation by leg_order or scheduled departure
  for (const [, fls] of activeRotations.entries()) {
    fls.sort((a, b) => a.leg_order - b.leg_order);
  }

  // Simulation output structures
  const simulatedFlightMap = new Map<string, SimulatedFlight>();
  const simulatedFlights: SimulatedFlight[] = [];

  // Track crew assignments
  const flightToCrew = new Map<string, string>();
  for (const cr of dataset.crews) {
    for (const fid of cr.flight_ids) {
      flightToCrew.set(fid, cr.crew_id);
    }
  }

  // Simulate each rotation in order
  for (const [tail, rotationFlights] of activeRotations.entries()) {
    let prevActualArr = -1;
    let prevCauseChain: CauseChainLink[] = [];
    let prevCancelled = false;

    for (let i = 0; i < rotationFlights.length; i++) {
      const f = rotationFlights[i];
      const crewId = flightToCrew.get(f.flight_id) || `CR-${tail}`;
      const effectiveCrewId = crewReassignments.get(crewId) || crewId;

      const causeChain: CauseChainLink[] = [];
      const delayByReason: Record<DelayReason, number> = {
        WEATHER_CLOSURE: 0,
        ROTATION_KNOCKON: 0,
        CREW_TIMEOUT: 0,
        CREW_WAIT: 0,
        CONNECTION_HOLD: 0
      };

      // Check if flight was manually cancelled via recovery action
      if (cancelledFlightIds.has(f.flight_id)) {
        const simF: SimulatedFlight = {
          flight: f,
          tail_id: tail,
          crew_id: effectiveCrewId,
          status: 'CANCELLED',
          scheduledDepMinutes: f.depMinutes,
          scheduledArrMinutes: f.arrMinutes,
          actualDepMinutes: f.depMinutes,
          actualArrMinutes: f.arrMinutes,
          scheduledDep: f.dep,
          scheduledArr: f.arr,
          actualDep: f.dep,
          actualArr: f.arr,
          depDelay: 0,
          arrDelay: 0,
          delayMinutes: 0,
          cancelledReason: 'Manually cancelled via recovery action',
          causeChain: [{
            stage: 1,
            flightId: f.flight_id,
            aircraftTail: tail,
            event: 'Recovery Action: Planned Flight Cancellation',
            reason: 'WEATHER_CLOSURE',
            minutes: 0,
            description: `Flight ${f.flight_id} cancelled as part of network recovery plan.`
          }],
          delayByReason
        };
        simulatedFlightMap.set(f.flight_id, simF);
        simulatedFlights.push(simF);
        prevCancelled = true;
        continue;
      }

      // Check if rotation was broken by previous cancellation without spare
      if (prevCancelled && !spareSwaps.has(f.tail_id)) {
        // Plane is out of position
        const simF: SimulatedFlight = {
          flight: f,
          tail_id: tail,
          crew_id: effectiveCrewId,
          status: 'CANCELLED',
          scheduledDepMinutes: f.depMinutes,
          scheduledArrMinutes: f.arrMinutes,
          actualDepMinutes: f.depMinutes,
          actualArrMinutes: f.arrMinutes,
          scheduledDep: f.dep,
          scheduledArr: f.arr,
          actualDep: f.dep,
          actualArr: f.arr,
          depDelay: 0,
          arrDelay: 0,
          delayMinutes: 0,
          cancelledReason: 'Aircraft unavailable due to upstream cancellation',
          causeChain: [{
            stage: 1,
            flightId: f.flight_id,
            aircraftTail: tail,
            event: 'Aircraft out of position due to prior cancellation',
            reason: 'ROTATION_KNOCKON',
            minutes: 0,
            description: `Upstream flight in rotation ${tail} cancelled.`
          }],
          delayByReason
        };
        simulatedFlightMap.set(f.flight_id, simF);
        simulatedFlights.push(simF);
        continue;
      }

      let readyDepTime = f.depMinutes;

      // 1. ROTATION KNOCKON: Must satisfy turnaround after previous arrival
      const minTurnaround = f.turnaround_before_min ?? dataset.meta.minTurnaroundMinutes;
      if (prevActualArr > 0) {
        const requiredDep = prevActualArr + minTurnaround;
        if (requiredDep > readyDepTime) {
          const knockOnMinutes = requiredDep - readyDepTime;
          readyDepTime = requiredDep;

          // Propagate previous cause chain links with proportionally reduced/absorbed delay
          if (prevCauseChain.length > 0) {
            const prevTotal = prevCauseChain.reduce((sum, c) => sum + c.minutes, 0);
            if (prevTotal > 0) {
              for (const prevLink of prevCauseChain) {
                const allocated = Math.round((prevLink.minutes / prevTotal) * knockOnMinutes);
                if (allocated > 0) {
                  causeChain.push({
                    stage: causeChain.length + 1,
                    flightId: prevLink.flightId,
                    aircraftTail: prevLink.aircraftTail,
                    event: `${prevLink.event} (Propagated to ${f.flight_id})`,
                    reason: prevLink.reason,
                    minutes: allocated,
                    description: `Propagated ${allocated}m delay via aircraft ${tail} turnaround.`
                  });
                  delayByReason[prevLink.reason] = (delayByReason[prevLink.reason] || 0) + allocated;
                }
              }
            }
          }

          // Invariant check: if rounding left a slight discrepancy, adjust to match exact knockOnMinutes
          const currentSum = causeChain.reduce((sum, c) => sum + c.minutes, 0);
          if (currentSum !== knockOnMinutes) {
            const diff = knockOnMinutes - currentSum;
            if (causeChain.length > 0) {
              causeChain[causeChain.length - 1].minutes += diff;
              delayByReason[causeChain[causeChain.length - 1].reason] += diff;
            } else {
              causeChain.push({
                stage: 1,
                flightId: f.flight_id,
                aircraftTail: tail,
                event: `Turnaround knock-on from prior leg`,
                reason: 'ROTATION_KNOCKON',
                minutes: knockOnMinutes,
                description: `Previous flight arrival delayed ready time by ${knockOnMinutes}m.`
              });
              delayByReason.ROTATION_KNOCKON += knockOnMinutes;
            }
          }
        }
      }

      // 2. CONNECTION HOLD ACTION: Check if flight is intentionally held
      const holdMins = heldFlights.get(f.flight_id) || 0;
      if (holdMins > 0) {
        readyDepTime += holdMins;
        causeChain.push({
          stage: causeChain.length + 1,
          flightId: f.flight_id,
          aircraftTail: tail,
          event: `Connection protection hold (${holdMins}m)`,
          reason: 'CONNECTION_HOLD',
          minutes: holdMins,
          description: `Dispatched hold of ${holdMins}m to protect inbound passenger connections.`
        });
        delayByReason.CONNECTION_HOLD += holdMins;
      }

      // 3. WEATHER / AIRPORT CLOSURE: Check origin closure
      let originClosureDelay = 0;
      const originBlock = getClosureDelay(readyDepTime, f.origin, closures);
      if (originBlock) {
        originClosureDelay = originBlock.delayedUntil - readyDepTime;
        readyDepTime = originBlock.delayedUntil;
        causeChain.push({
          stage: causeChain.length + 1,
          flightId: f.flight_id,
          aircraftTail: tail,
          event: `${f.origin} Airport Closure (${originBlock.closure.start}-${originBlock.closure.end})`,
          reason: 'WEATHER_CLOSURE',
          minutes: originClosureDelay,
          description: `Origin airport ${f.origin} closed during scheduled departure.`
        });
        delayByReason.WEATHER_CLOSURE += originClosureDelay;
      }

      // 4. WEATHER / AIRPORT CLOSURE: Check destination closure
      let destClosureDelay = 0;
      let estArr = readyDepTime + f.block_minutes;
      const destBlock = getClosureDelay(estArr, f.destination, closures);
      if (destBlock) {
        destClosureDelay = destBlock.delayedUntil - estArr;
        readyDepTime += destClosureDelay;
        estArr = destBlock.delayedUntil;
        causeChain.push({
          stage: causeChain.length + 1,
          flightId: f.flight_id,
          aircraftTail: tail,
          event: `${f.destination} Airport Closure (${destBlock.closure.start}-${destBlock.closure.end})`,
          reason: 'WEATHER_CLOSURE',
          minutes: destClosureDelay,
          description: `Ground hold issued: destination airport ${f.destination} closed at projected arrival.`
        });
        delayByReason.WEATHER_CLOSURE += destClosureDelay;
      }

      // 5. CREW DUTY CHECK (preliminary during flight calculation)
      const crew = dataset.crewMap.get(effectiveCrewId);
      let crewDelay = 0;
      if (crew) {
        const projectedDuty = estArr - crew.dutyStartMinutes;
        if (projectedDuty > crew.max_duty_mins && !crewReassignments.has(crewId)) {
          // If crew times out, wait 60m for standby crew swap or ground hold
          const swapWait = 60;
          crewDelay = swapWait;
          readyDepTime += swapWait;
          estArr += swapWait;
          causeChain.push({
            stage: causeChain.length + 1,
            flightId: f.flight_id,
            aircraftTail: tail,
            event: `Crew ${crew.crew_id} Max Duty Exceeded (${crew.max_duty_mins}m limit)`,
            reason: 'CREW_TIMEOUT',
            minutes: swapWait,
            description: `Crew duty limit exceeded by ${projectedDuty - crew.max_duty_mins}m. Standby crew called.`
          });
          delayByReason.CREW_TIMEOUT += swapWait;
        }
      }

      // Compute final delays
      const actualDepMinutes = readyDepTime;
      const actualArrMinutes = actualDepMinutes + f.block_minutes;
      const depDelay = actualDepMinutes - f.depMinutes;
      const arrDelay = actualArrMinutes - f.arrMinutes;
      const totalDelay = Math.max(depDelay, arrDelay);

      // Check cancellation threshold
      let status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' = 'ON_TIME';
      let cancelledReason: string | undefined = undefined;

      if (totalDelay > threshold) {
        status = 'CANCELLED';
        cancelledReason = `Delay of ${totalDelay}m exceeds cancellation threshold of ${threshold}m`;
        prevCancelled = true;
      } else if (totalDelay > 0) {
        status = 'DELAYED';
        prevCancelled = false;
        prevActualArr = actualArrMinutes;
        prevCauseChain = causeChain;
      } else {
        status = 'ON_TIME';
        prevCancelled = false;
        prevActualArr = actualArrMinutes;
        prevCauseChain = [];
      }

      // STRICT INVARIANT ENFORCEMENT:
      // If the flight is delayed, sum of cause chain minutes MUST strictly equal flight delay!
      if (status === 'DELAYED') {
        const sumMinutes = causeChain.reduce((sum, link) => sum + link.minutes, 0);
        if (sumMinutes !== totalDelay) {
          const diff = totalDelay - sumMinutes;
          if (causeChain.length > 0) {
            causeChain[causeChain.length - 1].minutes += diff;
            const r = causeChain[causeChain.length - 1].reason;
            delayByReason[r] = (delayByReason[r] || 0) + diff;
          } else {
            causeChain.push({
              stage: 1,
              flightId: f.flight_id,
              aircraftTail: tail,
              event: 'Disruption cascade knock-on',
              reason: 'ROTATION_KNOCKON',
              minutes: totalDelay,
              description: `Accumulated rotation delay.`
            });
            delayByReason.ROTATION_KNOCKON += totalDelay;
          }
        }
      }

      const simF: SimulatedFlight = {
        flight: f,
        tail_id: tail,
        crew_id: effectiveCrewId,
        status,
        scheduledDepMinutes: f.depMinutes,
        scheduledArrMinutes: f.arrMinutes,
        actualDepMinutes,
        actualArrMinutes,
        scheduledDep: f.dep,
        scheduledArr: f.arr,
        actualDep: minutesToTime(actualDepMinutes),
        actualArr: minutesToTime(actualArrMinutes),
        depDelay,
        arrDelay,
        delayMinutes: status === 'CANCELLED' ? 0 : totalDelay,
        cancelledReason,
        causeChain,
        delayByReason
      };

      simulatedFlightMap.set(f.flight_id, simF);
      simulatedFlights.push(simF);
    }
  }

  // Sort simulated flights in chronological order of scheduled departure
  simulatedFlights.sort((a, b) => a.scheduledDepMinutes - b.scheduledDepMinutes);

  // 6. CONNECTIONS EVALUATION
  const simulatedConnections: SimulatedConnection[] = [];
  let totalMissedConnections = 0;
  let connectionStrandedPax = 0;

  for (const cx of dataset.connections) {
    const feeder = simulatedFlightMap.get(cx.from_flight);
    const onward = simulatedFlightMap.get(cx.to_flight);

    if (!feeder || !onward) {
      continue;
    }

    let missed = false;
    let reason: string | undefined = undefined;
    const availableMinutes = onward.actualDepMinutes - feeder.actualArrMinutes;

    if (feeder.status === 'CANCELLED') {
      missed = true;
      reason = `Inbound flight ${feeder.flight.flight_id} cancelled`;
    } else if (onward.status === 'CANCELLED') {
      missed = true;
      reason = `Connecting flight ${onward.flight.flight_id} cancelled`;
    } else if (availableMinutes < cx.min_connect_minutes) {
      missed = true;
      reason = `Available connect time ${availableMinutes}m < ${cx.min_connect_minutes}m required (feeder arrived ${feeder.arrDelay}m late)`;
    }

    const strandedPax = missed ? cx.passengers : 0;
    if (missed) {
      totalMissedConnections++;
      connectionStrandedPax += strandedPax;
    }

    simulatedConnections.push({
      connection: cx,
      fromFlightId: cx.from_flight,
      toFlightId: cx.to_flight,
      fromActualArrMinutes: feeder.actualArrMinutes,
      toActualDepMinutes: onward.actualDepMinutes,
      availableMinutes,
      minRequiredMinutes: cx.min_connect_minutes,
      missed,
      strandedPax,
      reason
    });
  }

  // 7. TOTAL STRANDED PASSENGERS CALCULATION
  // Point-to-point passengers on cancelled flights + missed connecting passengers
  let cancelledFlightPax = 0;
  for (const sf of simulatedFlights) {
    if (sf.status === 'CANCELLED') {
      cancelledFlightPax += sf.flight.pax;
    }
  }
  const totalStrandedPax = cancelledFlightPax + connectionStrandedPax;

  // 8. CREW DUTY FINAL EVALUATION
  const simulatedCrews: SimulatedCrew[] = [];
  let crewTimeoutsCount = 0;

  for (const cr of dataset.crews) {
    const activeCrewId = crewReassignments.get(cr.crew_id) || cr.crew_id;
    let maxArr = cr.dutyStartMinutes;
    let timedOut = false;
    let violationFlightId: string | undefined = undefined;

    for (const fid of cr.flight_ids) {
      const sf = simulatedFlightMap.get(fid);
      if (sf && sf.status !== 'CANCELLED') {
        if (sf.actualArrMinutes > maxArr) {
          maxArr = sf.actualArrMinutes;
        }
        const duty = sf.actualArrMinutes - cr.dutyStartMinutes;
        if (duty > cr.max_duty_mins && !timedOut && !crewReassignments.has(cr.crew_id)) {
          timedOut = true;
          violationFlightId = fid;
        }
      }
    }

    const totalDutyMinutes = Math.max(0, maxArr - cr.dutyStartMinutes);
    const timeoutExceededBy = Math.max(0, totalDutyMinutes - cr.max_duty_mins);

    if (timedOut) {
      crewTimeoutsCount++;
    }

    simulatedCrews.push({
      crew: cr,
      tail_id: cr.tail_id,
      totalDutyMinutes,
      timedOut,
      timeoutExceededBy,
      firstViolationFlightId: violationFlightId
    });
  }

  // 9. KPIS & COST CALCULATION
  let totalDelayMinutes = 0;
  let delayedFlightsCount = 0;
  let cancelledFlightsCount = 0;
  let onTimeFlightsCount = 0;

  for (const sf of simulatedFlights) {
    if (sf.status === 'DELAYED') {
      delayedFlightsCount++;
      totalDelayMinutes += sf.delayMinutes;
    } else if (sf.status === 'CANCELLED') {
      cancelledFlightsCount++;
    } else {
      onTimeFlightsCount++;
    }
  }

  const delayCost = totalDelayMinutes * weights.delayPerMinute;
  const cancellationCost = cancelledFlightsCount * weights.cancellationPerFlight;
  const strandedCost = totalStrandedPax * weights.strandedPax;
  const crewViolationCost = crewTimeoutsCount * weights.crewViolation;
  const spareCost = spareSwaps.size * weights.spareDeployment;
  const totalCostScore = delayCost + cancellationCost + strandedCost + crewViolationCost + spareCost;

  const kpis: SimulationKPIs = {
    totalDelayMinutes,
    delayedFlightsCount,
    cancelledFlightsCount,
    onTimeFlightsCount,
    missedConnectionsCount: totalMissedConnections,
    strandedPassengersCount: totalStrandedPax,
    crewTimeoutsCount,
    costScore: totalCostScore
  };

  // 10. PATIENT ZERO RANKING
  // Trace which root cause created the most downstream damage
  const rootBlameMap = new Map<string, {
    rootEvent: string;
    airport: string;
    rootFlightId: string;
    impactedFlights: Set<string>;
    totalDelayMinutes: number;
    strandedPax: number;
    cancellations: number;
    tails: Set<string>;
  }>();

  for (const sf of simulatedFlights) {
    if (sf.causeChain.length > 0) {
      const rootLink = sf.causeChain[0];
      const key = `${rootLink.event}_${rootLink.flightId}`;
      if (!rootBlameMap.has(key)) {
        rootBlameMap.set(key, {
          rootEvent: rootLink.event,
          airport: rootLink.event.split(' ')[0] || 'NETWORK',
          rootFlightId: rootLink.flightId,
          impactedFlights: new Set(),
          totalDelayMinutes: 0,
          strandedPax: 0,
          cancellations: 0,
          tails: new Set()
        });
      }
      const record = rootBlameMap.get(key)!;
      record.impactedFlights.add(sf.flight.flight_id);
      record.totalDelayMinutes += sf.delayMinutes;
      record.tails.add(sf.tail_id);
      if (sf.status === 'CANCELLED') {
        record.cancellations++;
        record.strandedPax += sf.flight.pax;
      }
    }
  }

  const patientZero: PatientZeroReport[] = Array.from(rootBlameMap.values())
    .map((r) => ({
      rootEvent: r.rootEvent,
      airport: r.airport,
      rootFlightId: r.rootFlightId,
      impactedFlightsCount: r.impactedFlights.size,
      totalDownstreamDelayMinutes: r.totalDelayMinutes,
      strandedPaxCount: r.strandedPax,
      cancelledFlightsCount: r.cancellations,
      affectedTails: Array.from(r.tails)
    }))
    .sort((a, b) => (b.totalDownstreamDelayMinutes + b.strandedPaxCount * 10) - (a.totalDownstreamDelayMinutes + a.strandedPaxCount * 10));

  return {
    flights: simulatedFlights,
    flightMap: simulatedFlightMap,
    connections: simulatedConnections,
    crews: simulatedCrews,
    kpis,
    patientZero,
    timestamp: Date.now()
  };
}
