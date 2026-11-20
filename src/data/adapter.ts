import {
  RawDataset,
  ParsedDataset,
  DatasetHealth,
  DatasetValidationIssue,
  Airport,
  Flight,
  Aircraft,
  Connection,
  Crew,
  Spare
} from '../types';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.trim().split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const norm = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function loadDataset(raw: RawDataset): { dataset: ParsedDataset; health: DatasetHealth } {
  const issues: DatasetValidationIssue[] = [];

  const minTurnaround = raw.meta?.min_turnaround_minutes ?? 30;
  const seatsDefault = raw.meta?.seats_per_aircraft ?? 180;

  // 1. Airports
  const airportMap = new Map<string, Airport>();
  const airports: Airport[] = (raw.airports || []).map((ap) => {
    const item: Airport = {
      id: ap.id.trim().toUpperCase(),
      name: ap.name,
      city: ap.city,
      lat: Number(ap.lat),
      lng: Number(ap.lng),
      tier: ap.tier || 'spoke',
      capacity_per_hour: Number(ap.capacity_per_hour || 20)
    };
    airportMap.set(item.id, item);
    return item;
  });

  // 2. Flights
  const flightMap = new Map<string, Flight>();
  const tailSet = new Set<string>();

  const flights: Flight[] = (raw.flights || []).map((f) => {
    const depMin = f.depMinutes ?? timeToMinutes(f.dep);
    let arrMin = f.arrMinutes ?? timeToMinutes(f.arr);
    // Handle flights that cross midnight if any
    if (arrMin < depMin && f.block_minutes) {
      arrMin = depMin + f.block_minutes;
    }

    const flightItem: Flight = {
      flight_id: f.flight_id.trim().toUpperCase(),
      tail_id: f.tail_id.trim().toUpperCase(),
      leg_order: Number(f.leg_order),
      origin: f.origin.trim().toUpperCase(),
      destination: f.destination.trim().toUpperCase(),
      dep: f.dep,
      arr: f.arr,
      depMinutes: depMin,
      arrMinutes: arrMin,
      block_minutes: Number(f.block_minutes || (arrMin - depMin)),
      pax: Number(f.pax || 0),
      turnaround_before_min: f.turnaround_before_min != null ? Number(f.turnaround_before_min) : null
    };

    tailSet.add(flightItem.tail_id);
    flightMap.set(flightItem.flight_id, flightItem);
    return flightItem;
  });

  // Sort flights by scheduled departure
  flights.sort((a, b) => a.depMinutes - b.depMinutes);

  // Group into rotations
  const rotations = new Map<string, Flight[]>();
  for (const f of flights) {
    if (!rotations.has(f.tail_id)) {
      rotations.set(f.tail_id, []);
    }
    rotations.get(f.tail_id)!.push(f);
  }

  // Sort each rotation by leg_order
  for (const [, fls] of rotations.entries()) {
    fls.sort((a, b) => a.leg_order - b.leg_order);
  }

  // 3. Aircraft list
  const aircraftMap = new Map<string, Aircraft>();
  const aircraftList: Aircraft[] = Array.from(tailSet).map((tail) => {
    const firstLeg = rotations.get(tail)?.[0];
    const ac: Aircraft = {
      tail_id: tail,
      base: firstLeg?.origin || 'BASE',
      seats: seatsDefault
    };
    aircraftMap.set(tail, ac);
    return ac;
  });

  // 4. Spares
  const spareMap = new Map<string, Spare>();
  const spares: Spare[] = (raw.spare_aircraft || []).map((s) => {
    const sp: Spare = {
      tail_id: s.tail_id.trim().toUpperCase(),
      base: s.base.trim().toUpperCase(),
      available_from: s.available_from,
      availableFromMinutes: s.availableFromMinutes ?? timeToMinutes(s.available_from),
      seats: Number(s.seats || seatsDefault)
    };
    spareMap.set(sp.tail_id, sp);
    if (!aircraftMap.has(sp.tail_id)) {
      const ac: Aircraft = { tail_id: sp.tail_id, base: sp.base, seats: sp.seats };
      aircraftMap.set(sp.tail_id, ac);
      aircraftList.push(ac);
    }
    return sp;
  });

  // 5. Connections
  const connections: Connection[] = (raw.connections || []).map((c) => ({
    connection_id: c.connection_id.trim().toUpperCase(),
    airport: c.airport.trim().toUpperCase(),
    from_flight: c.from_flight.trim().toUpperCase(),
    to_flight: c.to_flight.trim().toUpperCase(),
    passengers: Number(c.passengers),
    min_connect_minutes: Number(c.min_connect_minutes || 45)
  }));

  // 6. Crews
  const crewMap = new Map<string, Crew>();
  const crews: Crew[] = (raw.crews || []).map((cr) => {
    const crewItem: Crew = {
      crew_id: cr.crew_id.trim().toUpperCase(),
      tail_id: cr.tail_id.trim().toUpperCase(),
      base: cr.base.trim().toUpperCase(),
      duty_start: cr.duty_start,
      dutyStartMinutes: cr.dutyStartMinutes ?? timeToMinutes(cr.duty_start),
      max_duty_mins: Number(cr.max_duty_mins || 600),
      flight_ids: (cr.flight_ids || []).map((id) => id.trim().toUpperCase())
    };
    crewMap.set(crewItem.crew_id, crewItem);
    return crewItem;
  });

  // --- HEALTH & INTEGRITY VALIDATIONS ---
  // Flight airport existence
  for (const f of flights) {
    if (!airportMap.has(f.origin)) {
      issues.push({
        type: 'error',
        code: 'ORPHAN_FLIGHT_ORIGIN',
        entityId: f.flight_id,
        message: `Flight ${f.flight_id} has origin ${f.origin} not in airport network.`
      });
    }
    if (!airportMap.has(f.destination)) {
      issues.push({
        type: 'error',
        code: 'ORPHAN_FLIGHT_DESTINATION',
        entityId: f.flight_id,
        message: `Flight ${f.flight_id} has destination ${f.destination} not in airport network.`
      });
    }
  }

  // Rotation continuity & turnarounds
  for (const [tail, rFlights] of rotations.entries()) {
    for (let i = 0; i < rFlights.length; i++) {
      const cur = rFlights[i];
      if (i > 0) {
        const prev = rFlights[i - 1];
        // Physical location continuity
        if (cur.origin !== prev.destination) {
          issues.push({
            type: 'error',
            code: 'ROTATION_LOCATION_DISCONTINUITY',
            entityId: cur.flight_id,
            message: `Aircraft ${tail} arrives at ${prev.destination} on ${prev.flight_id} but next departs from ${cur.origin} on ${cur.flight_id}.`
          });
        }
        // Impossible turnaround in published schedule
        const scheduledTurnaround = cur.depMinutes - prev.arrMinutes;
        if (scheduledTurnaround < minTurnaround) {
          issues.push({
            type: 'warning',
            code: 'TIGHT_SCHEDULE_TURNAROUND',
            entityId: cur.flight_id,
            message: `Rotation ${tail}: ${prev.flight_id} -> ${cur.flight_id} has ${scheduledTurnaround}m turnaround (minimum is ${minTurnaround}m).`
          });
        }
      }
    }
  }

  // Connection integrity
  for (const cx of connections) {
    const fromF = flightMap.get(cx.from_flight);
    const toF = flightMap.get(cx.to_flight);
    if (!fromF) {
      issues.push({
        type: 'error',
        code: 'MISSING_CONNECTION_FEEDER',
        entityId: cx.connection_id,
        message: `Connection ${cx.connection_id} references unknown feeder flight ${cx.from_flight}.`
      });
    }
    if (!toF) {
      issues.push({
        type: 'error',
        code: 'MISSING_CONNECTION_ONWARD',
        entityId: cx.connection_id,
        message: `Connection ${cx.connection_id} references unknown onward flight ${cx.to_flight}.`
      });
    }
    if (fromF && toF) {
      if (fromF.destination !== cx.airport || toF.origin !== cx.airport) {
        issues.push({
          type: 'warning',
          code: 'CONNECTION_AIRPORT_MISMATCH',
          entityId: cx.connection_id,
          message: `Connection ${cx.connection_id} airport ${cx.airport} does not match feeder dest (${fromF.destination}) or onward origin (${toF.origin}).`
        });
      }
      const scheduledConn = toF.depMinutes - fromF.arrMinutes;
      if (scheduledConn < cx.min_connect_minutes) {
        issues.push({
          type: 'warning',
          code: 'IMPOSSIBLE_SCHEDULED_CONNECTION',
          entityId: cx.connection_id,
          message: `Connection ${cx.connection_id} scheduled gap is ${scheduledConn}m (< ${cx.min_connect_minutes}m required).`
        });
      }
    }
  }

  // Crew validation
  for (const cr of crews) {
    for (const fid of cr.flight_ids) {
      if (!flightMap.has(fid)) {
        issues.push({
          type: 'error',
          code: 'CREW_UNKNOWN_FLIGHT',
          entityId: cr.crew_id,
          message: `Crew ${cr.crew_id} assigned to unknown flight ${fid}.`
        });
      }
    }
  }

  const dataset: ParsedDataset = {
    meta: {
      minTurnaroundMinutes: minTurnaround,
      seatsPerAircraft: seatsDefault
    },
    airports,
    airportMap,
    flights,
    flightMap,
    aircraft: aircraftList,
    aircraftMap,
    connections,
    crews,
    crewMap,
    spares,
    spareMap,
    rotations
  };

  const health: DatasetHealth = {
    valid: issues.filter((iss) => iss.type === 'error').length === 0,
    airportsCount: airports.length,
    flightsCount: flights.length,
    aircraftCount: aircraftList.length,
    connectionsCount: connections.length,
    crewsCount: crews.length,
    sparesCount: spares.length,
    issues
  };

  return { dataset, health };
}
