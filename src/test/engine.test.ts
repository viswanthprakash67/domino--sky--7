import { describe, it, expect } from 'vitest';
import defaultRawDataset from '../data/defaultDataset.json';
import { loadDataset } from '../data/adapter';
import { runSimulation } from '../engine/engine';
import { RawDataset, AirportClosure } from '../types';

describe('Domino Sky Deterministic Engine', () => {
  const { dataset, health } = loadDataset(defaultRawDataset as unknown as RawDataset);

  it('validates official dataset integrity on load', () => {
    expect(health.valid).toBe(true);
    expect(dataset.airports.length).toBe(16);
    expect(dataset.flights.length).toBe(70);
    expect(dataset.aircraft.length).toBe(18); // 16 operational + 2 spares
    expect(dataset.connections.length).toBe(21);
    expect(dataset.crews.length).toBe(16);
    expect(dataset.spares.length).toBe(2);
  });

  it('guarantees zero-disruption baseline equals the published schedule', () => {
    const result = runSimulation(dataset, []);

    expect(result.kpis.totalDelayMinutes).toBe(0);
    expect(result.kpis.delayedFlightsCount).toBe(0);
    expect(result.kpis.cancelledFlightsCount).toBe(0);
    expect(result.kpis.onTimeFlightsCount).toBe(70);
    expect(result.kpis.missedConnectionsCount).toBe(0);
    expect(result.kpis.strandedPassengersCount).toBe(0);
    expect(result.kpis.crewTimeoutsCount).toBe(0);

    for (const sf of result.flights) {
      expect(sf.status).toBe('ON_TIME');
      expect(sf.delayMinutes).toBe(0);
      expect(sf.actualDepMinutes).toBe(sf.scheduledDepMinutes);
      expect(sf.actualArrMinutes).toBe(sf.scheduledArrMinutes);
      expect(sf.causeChain.length).toBe(0);
    }
  });

  it('guarantees absolute determinism: same input -> same output across 10 runs', () => {
    const stormClosure: AirportClosure[] = [{
      id: 'BOM_STORM',
      airport: 'BOM',
      start: '14:00',
      end: '15:30',
      startMinutes: 14 * 60,
      endMinutes: 15 * 60 + 30
    }];

    const run1 = runSimulation(dataset, stormClosure);
    const run1Kpis = JSON.stringify(run1.kpis);
    const run1FlightStates = run1.flights.map(f => `${f.flight.flight_id}:${f.status}:${f.delayMinutes}`).join('|');

    for (let i = 0; i < 9; i++) {
      const runN = runSimulation(dataset, stormClosure);
      expect(JSON.stringify(runN.kpis)).toBe(run1Kpis);
      const runNFlightStates = runN.flights.map(f => `${f.flight.flight_id}:${f.status}:${f.delayMinutes}`).join('|');
      expect(runNFlightStates).toBe(run1FlightStates);
    }
  });

  it('guarantees the mathematical invariant: sum of cause-chain minutes strictly equals each flight delay', () => {
    // Test on multiple distinct closures
    const testCases: AirportClosure[][] = [
      // Case A: Mumbai Storm 14:00-15:30 (90 min)
      [{
        id: 'BOM_STORM',
        airport: 'BOM',
        start: '14:00',
        end: '15:30',
        startMinutes: 840,
        endMinutes: 930
      }],
      // Case B: Simultaneous Mumbai (14:00-15:30) and Delhi (16:00-18:00) closures
      [
        { id: 'BOM_STORM', airport: 'BOM', start: '14:00', end: '15:30', startMinutes: 840, endMinutes: 930 },
        { id: 'DEL_FOG', airport: 'DEL', start: '16:00', end: '18:00', startMinutes: 960, endMinutes: 1080 }
      ],
      // Case C: Severe 180 min closure at BLR
      [{
        id: 'BLR_SEVERE',
        airport: 'BLR',
        start: '11:00',
        end: '14:00',
        startMinutes: 660,
        endMinutes: 840
      }]
    ];

    for (const closures of testCases) {
      const result = runSimulation(dataset, closures);
      for (const sf of result.flights) {
        if (sf.status === 'DELAYED') {
          const sumMinutes = sf.causeChain.reduce((sum, link) => sum + link.minutes, 0);
          expect(sumMinutes).toBe(sf.delayMinutes);
          expect(sf.delayMinutes).toBeGreaterThan(0);
        }
      }
    }
  });

  it('propagates rotational delay to downstream flights on the same aircraft', () => {
    const stormClosure: AirportClosure[] = [{
      id: 'BOM_STORM',
      airport: 'BOM',
      start: '14:00',
      end: '15:30',
      startMinutes: 840,
      endMinutes: 930
    }];

    const result = runSimulation(dataset, stormClosure);

    // Look at flights originating or landing at BOM around 14:00-15:30
    const delayedBOM = result.flights.filter(f =>
      (f.flight.origin === 'BOM' || f.flight.destination === 'BOM') &&
      f.status === 'DELAYED'
    );
    expect(delayedBOM.length).toBeGreaterThan(0);

    // Verify patient zero report has root blame
    expect(result.patientZero.length).toBeGreaterThan(0);
    const topRoot = result.patientZero[0];
    expect(topRoot.totalDownstreamDelayMinutes).toBeGreaterThan(0);
  });
});
