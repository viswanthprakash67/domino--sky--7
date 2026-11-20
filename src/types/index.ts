export interface Airport {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: 'mega_hub' | 'regional_hub' | 'spoke';
  capacity_per_hour: number;
}

export interface Flight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  dep: string; // HH:MM
  arr: string; // HH:MM
  depMinutes: number;
  arrMinutes: number;
  block_minutes: number;
  pax: number;
  turnaround_before_min: number | null;
}

export interface Aircraft {
  tail_id: string;
  base?: string;
  seats: number;
}

export interface Connection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
}

export interface Crew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string;
  dutyStartMinutes: number;
  max_duty_mins: number;
  flight_ids: string[];
}

export interface Spare {
  tail_id: string;
  base: string;
  available_from: string;
  availableFromMinutes: number;
  seats: number;
}

export interface RawDataset {
  meta?: {
    dataset?: string;
    operating_day?: string;
    min_turnaround_minutes?: number;
    seats_per_aircraft?: number;
    notes?: string[];
  };
  airports: Airport[];
  flights: Array<Omit<Flight, 'depMinutes' | 'arrMinutes'> & { depMinutes?: number; arrMinutes?: number }>;
  connections: Connection[];
  crews: Array<Omit<Crew, 'dutyStartMinutes'> & { dutyStartMinutes?: number }>;
  spare_aircraft: Spare[];
}

export interface ParsedDataset {
  meta: {
    minTurnaroundMinutes: number;
    seatsPerAircraft: number;
  };
  airports: Airport[];
  airportMap: Map<string, Airport>;
  flights: Flight[];
  flightMap: Map<string, Flight>;
  aircraft: Aircraft[];
  aircraftMap: Map<string, Aircraft>;
  connections: Connection[];
  crews: Crew[];
  crewMap: Map<string, Crew>;
  spares: Spare[];
  spareMap: Map<string, Spare>;
  rotations: Map<string, Flight[]>; // tail_id -> flights sorted by leg_order
}

export interface AirportClosure {
  id: string;
  airport: string;
  start: string; // HH:MM
  end: string;   // HH:MM
  startMinutes: number;
  endMinutes: number;
}

export type DelayReason =
  | 'WEATHER_CLOSURE'
  | 'ROTATION_KNOCKON'
  | 'CREW_TIMEOUT'
  | 'CREW_WAIT'
  | 'CONNECTION_HOLD';

export interface CauseChainLink {
  stage: number;
  flightId: string;
  aircraftTail: string;
  event: string;
  reason: DelayReason;
  minutes: number;
  description: string;
}

export type FlightStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED';

export interface SimulatedFlight {
  flight: Flight;
  tail_id: string;
  crew_id: string;
  status: FlightStatus;
  scheduledDepMinutes: number;
  scheduledArrMinutes: number;
  actualDepMinutes: number;
  actualArrMinutes: number;
  scheduledDep: string;
  scheduledArr: string;
  actualDep: string;
  actualArr: string;
  depDelay: number;
  arrDelay: number;
  delayMinutes: number;
  cancelledReason?: string;
  causeChain: CauseChainLink[];
  delayByReason: Record<DelayReason, number>;
}

export interface SimulatedConnection {
  connection: Connection;
  fromFlightId: string;
  toFlightId: string;
  fromActualArrMinutes: number;
  toActualDepMinutes: number;
  availableMinutes: number;
  minRequiredMinutes: number;
  missed: boolean;
  strandedPax: number;
  reason?: string;
}

export interface SimulatedCrew {
  crew: Crew;
  tail_id: string;
  totalDutyMinutes: number;
  timedOut: boolean;
  timeoutExceededBy: number;
  firstViolationFlightId?: string;
}

export interface SimulationKPIs {
  totalDelayMinutes: number;
  delayedFlightsCount: number;
  cancelledFlightsCount: number;
  onTimeFlightsCount: number;
  missedConnectionsCount: number;
  strandedPassengersCount: number;
  crewTimeoutsCount: number;
  costScore: number;
}

export interface PatientZeroReport {
  rootEvent: string;
  airport: string;
  rootFlightId: string;
  impactedFlightsCount: number;
  totalDownstreamDelayMinutes: number;
  strandedPaxCount: number;
  cancelledFlightsCount: number;
  affectedTails: string[];
}

export interface SimulationResult {
  flights: SimulatedFlight[];
  flightMap: Map<string, SimulatedFlight>;
  connections: SimulatedConnection[];
  crews: SimulatedCrew[];
  kpis: SimulationKPIs;
  patientZero: PatientZeroReport[];
  timestamp: number;
}

export interface DatasetValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  entityId: string;
  message: string;
}

export interface DatasetHealth {
  valid: boolean;
  airportsCount: number;
  flightsCount: number;
  aircraftCount: number;
  connectionsCount: number;
  crewsCount: number;
  sparesCount: number;
  issues: DatasetValidationIssue[];
}

export type RecoveryActionType =
  | 'CANCEL_FLIGHT'
  | 'SWAP_SPARE'
  | 'SWAP_AIRCRAFT'
  | 'HOLD_CONNECTION'
  | 'REASSIGN_CREW';

export interface RecoveryAction {
  id: string;
  type: RecoveryActionType;
  title: string;
  description: string;
  flightId?: string;
  spareTailId?: string;
  targetTailId?: string;
  tailA?: string;
  tailB?: string;
  holdMinutes?: number;
  connectionId?: string;
  crewId?: string;
  newCrewId?: string;
}

export interface CostWeights {
  delayPerMinute: number;         // e.g. 1500
  cancellationPerFlight: number;  // e.g. 400000
  strandedPax: number;            // e.g. 8000
  crewViolation: number;          // e.g. 250000
  spareDeployment: number;        // e.g. 150000
}

export interface RecoveryCandidate {
  id: string;
  actions: RecoveryAction[];
  title: string;
  description: string;
  delta: {
    totalDelayMinutes: number;
    cancelledFlights: number;
    strandedPassengers: number;
    crewViolations: number;
    costScore: number;
  };
  costBreakdown: {
    delayCost: number;
    cancellationCost: number;
    strandedCost: number;
    crewViolationCost: number;
    actionPenaltyCost: number;
    total: number;
  };
  result: SimulationResult;
}

export interface NumberGuardCheck {
  claimedValue: number;
  unit: string;
  metricKey: string;
  groundTruthValue: number;
  matched: boolean;
  diff: number;
  snippet: string;
  source: string;
}

export interface NumberGuardResult {
  verified: boolean;
  totalNumbers: number;
  matchedNumbers: number;
  mismatchedNumbers: number;
  checks: NumberGuardCheck[];
  verifiedText: string;
  blockedSentences: string[];
  isTampered: boolean;
}

export interface AIDispatcherPlan {
  recommendationId: string;
  title: string;
  actions: RecoveryAction[];
  executiveSummary: string;
  operationalReasoning: string;
  citedMetrics: {
    delayMinutesSaved: number;
    cancellationsAvoided: number;
    strandedPaxSaved: number;
    crewViolationsPrevented: number;
    costReduction: number;
  };
}
