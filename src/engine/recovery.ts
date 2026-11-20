import {
  ParsedDataset,
  AirportClosure,
  SimulationResult,
  RecoveryCandidate,
  RecoveryAction,
  CostWeights,
  SimulatedFlight
} from '../types';
import { runSimulation, DEFAULT_COST_WEIGHTS, SimulationOptions } from './engine';

export function generateRecoveryCandidates(
  dataset: ParsedDataset,
  closures: AirportClosure[],
  baselineResult: SimulationResult,
  options: SimulationOptions = {}
): RecoveryCandidate[] {
  const weights = options.costWeights ?? DEFAULT_COST_WEIGHTS;
  const candidates: RecoveryCandidate[] = [];

  // If baseline is clean, no recovery needed
  if (
    baselineResult.kpis.delayedFlightsCount === 0 &&
    baselineResult.kpis.cancelledFlightsCount === 0 &&
    baselineResult.kpis.missedConnectionsCount === 0
  ) {
    return candidates;
  }

  const baseKpi = baselineResult.kpis;
  let candidateIndex = 1;

  function evaluateCandidate(
    title: string,
    description: string,
    actions: RecoveryAction[]
  ): RecoveryCandidate {
    const candidateResult = runSimulation(dataset, closures, {
      ...options,
      appliedActions: actions
    });

    const candKpi = candidateResult.kpis;

    const delta = {
      totalDelayMinutes: candKpi.totalDelayMinutes - baseKpi.totalDelayMinutes,
      cancelledFlights: candKpi.cancelledFlightsCount - baseKpi.cancelledFlightsCount,
      strandedPassengers: candKpi.strandedPassengersCount - baseKpi.strandedPassengersCount,
      crewViolations: candKpi.crewTimeoutsCount - baseKpi.crewTimeoutsCount,
      costScore: candKpi.costScore - baseKpi.costScore
    };

    const actionPenalty = actions.length * (weights.spareDeployment * 0.2);

    const costBreakdown = {
      delayCost: candKpi.totalDelayMinutes * weights.delayPerMinute,
      cancellationCost: candKpi.cancelledFlightsCount * weights.cancellationPerFlight,
      strandedCost: candKpi.strandedPassengersCount * weights.strandedPax,
      crewViolationCost: candKpi.crewTimeoutsCount * weights.crewViolation,
      actionPenaltyCost: actionPenalty,
      total: candKpi.costScore + actionPenalty
    };

    return {
      id: `CAND-${(candidateIndex++).toString().padStart(2, '0')}`,
      actions,
      title,
      description,
      delta,
      costBreakdown,
      result: candidateResult
    };
  }

  // --- STRATEGY 1: SPARE AIRCRAFT SWAPS ---
  // Check any delayed rotation with legs originating at spare bases (DEL or BLR)
  for (const spare of dataset.spares) {
    for (const sf of baselineResult.flights) {
      if (
        (sf.status === 'DELAYED' || sf.status === 'CANCELLED') &&
        sf.flight.origin === spare.base &&
        sf.scheduledDepMinutes >= spare.availableFromMinutes
      ) {
        const action: RecoveryAction = {
          id: `ACT-SPARE-${spare.tail_id}-${sf.flight.flight_id}`,
          type: 'SWAP_SPARE',
          title: `Deploy Spare ${spare.tail_id} at ${spare.base}`,
          description: `Replace delayed rotation on ${sf.tail_id} with standby spare ${spare.tail_id} from flight ${sf.flight.flight_id} onwards.`,
          spareTailId: spare.tail_id,
          targetTailId: sf.tail_id,
          flightId: sf.flight.flight_id
        };

        const cand = evaluateCandidate(
          `Deploy Spare ${spare.tail_id} (${spare.base} Hub)`,
          `Substitute fresh spare aircraft ${spare.tail_id} on ${sf.tail_id} rotation starting at ${sf.flight.flight_id} (${sf.flight.origin}->${sf.flight.destination}).`,
          [action]
        );
        candidates.push(cand);
      }
    }
  }

  // --- STRATEGY 2: TACTICAL FLIGHT CANCELLATION ---
  // For any delayed flight (delay >= 30m), evaluate isolating the cascade
  const delayedFlights = baselineResult.flights
    .filter((f) => f.status === 'DELAYED' && f.delayMinutes >= 30)
    .sort((a, b) => b.delayMinutes - a.delayMinutes);

  for (const df of delayedFlights.slice(0, 3)) {
    const action: RecoveryAction = {
      id: `ACT-CANCEL-${df.flight.flight_id}`,
      type: 'CANCEL_FLIGHT',
      title: `Tactically Cancel ${df.flight.flight_id}`,
      description: `Cancel ${df.flight.flight_id} (${df.delayMinutes}m delay, ${df.flight.origin}->${df.flight.destination}) to isolate cascade and reset rotation ${df.tail_id}.`,
      flightId: df.flight.flight_id
    };

    const cand = evaluateCandidate(
      `Tactical Cancellation: ${df.flight.flight_id}`,
      `Cancel flight ${df.flight.flight_id} (${df.flight.origin}->${df.flight.destination}) to reset subsequent legs of aircraft ${df.tail_id} to on-time.`,
      [action]
    );
    candidates.push(cand);
  }

  // --- STRATEGY 3: CONNECTION PROTECTION HOLDS ---
  for (const sc of baselineResult.connections) {
    if (sc.missed) {
      const onward = baselineResult.flightMap.get(sc.toFlightId);
      const feeder = baselineResult.flightMap.get(sc.fromFlightId);
      if (onward && feeder && feeder.status !== 'CANCELLED' && onward.status !== 'CANCELLED') {
        const shortfall = sc.minRequiredMinutes - sc.availableMinutes;
        if (shortfall > 0 && shortfall <= 60) {
          const holdMinutes = shortfall + 5; // buffer
          const action: RecoveryAction = {
            id: `ACT-HOLD-${onward.flight.flight_id}`,
            type: 'HOLD_CONNECTION',
            title: `Hold ${onward.flight.flight_id} by ${holdMinutes}m`,
            description: `Hold departure at ${sc.connection.airport} by ${holdMinutes} min to protect ${sc.connection.passengers} connecting passengers from ${feeder.flight.flight_id}.`,
            flightId: onward.flight.flight_id,
            connectionId: sc.connection.connection_id,
            holdMinutes
          };

          const cand = evaluateCandidate(
            `Protect Connection: Hold ${onward.flight.flight_id} (${holdMinutes}m)`,
            `Hold flight ${onward.flight.flight_id} at ${sc.connection.airport} for ${holdMinutes}m to protect ${sc.connection.passengers} passengers from feeder ${feeder.flight.flight_id}.`,
            [action]
          );
          candidates.push(cand);
        }
      }
    }
  }

  // --- STRATEGY 4: CREW STANDBY REASSIGNMENT ---
  for (const cr of baselineResult.crews) {
    if (cr.timedOut) {
      const action: RecoveryAction = {
        id: `ACT-CREW-${cr.crew.crew_id}`,
        type: 'REASSIGN_CREW',
        title: `Deploy Standby Crew for ${cr.crew.crew_id}`,
        description: `Swap in rested standby crew at ${cr.crew.base} to eliminate ${cr.timeoutExceededBy}m duty violation.`,
        crewId: cr.crew.crew_id,
        newCrewId: `STANDBY-${cr.crew.crew_id}`
      };

      const cand = evaluateCandidate(
        `Deploy Standby Crew (${cr.crew.crew_id})`,
        `Replace timed-out crew ${cr.crew.crew_id} with standby crew to avoid cascading crew wait delays.`,
        [action]
      );
      candidates.push(cand);
    }
  }

  // --- STRATEGY 5: COMBINED TOP PAIRS ---
  const singleActions = candidates
    .filter((c) => c.actions.length === 1 && c.delta.costScore < 0)
    .sort((a, b) => a.delta.costScore - b.delta.costScore);

  if (singleActions.length >= 2) {
    const actA = singleActions[0].actions[0];
    const actB = singleActions.find((c) => c.actions[0].type !== actA.type)?.actions[0];
    if (actB) {
      const combined = evaluateCandidate(
        `Dual Action: ${actA.title} + ${actB.title}`,
        `Comprehensive plan combining ${actA.title} and ${actB.title} for maximum cascade containment.`,
        [actA, actB]
      );
      candidates.push(combined);
    }
  }

  // Sort candidates by cost reduction (best savings first)
  candidates.sort((a, b) => a.delta.costScore - b.delta.costScore);

  return candidates;
}
