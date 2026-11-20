import { describe, it, expect } from 'vitest';
import defaultRawDataset from '../data/defaultDataset.json';
import { loadDataset } from '../data/adapter';
import { runSimulation } from '../engine/engine';
import { generateRecoveryCandidates } from '../engine/recovery';
import { validateNumbers, generateVerifiedTemplateExplanation } from '../validator/numberGuard';
import { RawDataset, AirportClosure } from '../types';

describe('Number Guard Trust Layer Validator', () => {
  const { dataset } = loadDataset(defaultRawDataset as unknown as RawDataset);

  const stormClosure: AirportClosure[] = [{
    id: 'BOM_STORM',
    airport: 'BOM',
    start: '14:00',
    end: '15:30',
    startMinutes: 840,
    endMinutes: 930
  }];

  const baselineResult = runSimulation(dataset, stormClosure);
  const candidates = generateRecoveryCandidates(dataset, stormClosure, baselineResult);
  const selectedCandidate = candidates[0];

  it('verifies 100% of numbers when claims match engine output', () => {
    const verifiedText = generateVerifiedTemplateExplanation({
      baselineResult,
      selectedCandidate
    });

    const result = validateNumbers(verifiedText, {
      baselineResult,
      selectedCandidate
    });

    expect(result.verified).toBe(true);
    expect(result.mismatchedNumbers).toBe(0);
    expect(result.blockedSentences.length).toBe(0);
    expect(result.matchedNumbers).toBeGreaterThan(0);
  });

  it('detects hallucinated / tampered numbers and blocks offending sentences', () => {
    // Inject a false numeric claim: "recovers 999 minutes" and "protects 4810 passengers"
    const tamperedText = `Executing recovery plan recovers 999 minutes of delay. In addition, it protects 4810 passengers from stranding.`;

    const result = validateNumbers(tamperedText, {
      baselineResult,
      selectedCandidate
    }, true);

    expect(result.verified).toBe(false);
    expect(result.mismatchedNumbers).toBeGreaterThan(0);
    expect(result.blockedSentences.length).toBeGreaterThan(0);
  });

  it('associates verified numbers with their exact engine source', () => {
    const delaySaved = Math.abs(selectedCandidate.delta.totalDelayMinutes);
    const text = `The plan recovers ${delaySaved} minutes of rotational delay.`;

    const result = validateNumbers(text, {
      baselineResult,
      selectedCandidate
    });

    expect(result.verified).toBe(true);
    const delayCheck = result.checks.find(c => c.claimedValue === delaySaved);
    expect(delayCheck).toBeDefined();
    expect(delayCheck?.matched).toBe(true);
    expect(delayCheck?.source).toBeTruthy();
  });
});
