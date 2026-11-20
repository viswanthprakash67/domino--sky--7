import { SimulationResult, RecoveryCandidate, NumberGuardResult, NumberGuardCheck } from '../types';

export interface GroundTruthContext {
  baselineResult: SimulationResult;
  selectedCandidate?: RecoveryCandidate;
}

export interface GroundTruthEntry {
  key: string;
  value: number;
  label: string;
  unit: string;
}

/**
 * Builds a comprehensive lookup of all legitimate ground-truth numeric values
 * produced by the deterministic engine.
 */
export function buildGroundTruthLookup(context: GroundTruthContext): GroundTruthEntry[] {
  const entries: GroundTruthEntry[] = [];
  const baseKpi = context.baselineResult.kpis;

  // Baseline KPIs
  entries.push({ key: 'base.totalDelayMinutes', value: baseKpi.totalDelayMinutes, label: 'Baseline Total Delay', unit: 'minutes' });
  entries.push({ key: 'base.delayedFlightsCount', value: baseKpi.delayedFlightsCount, label: 'Baseline Delayed Flights', unit: 'flights' });
  entries.push({ key: 'base.cancelledFlightsCount', value: baseKpi.cancelledFlightsCount, label: 'Baseline Cancelled Flights', unit: 'flights' });
  entries.push({ key: 'base.onTimeFlightsCount', value: baseKpi.onTimeFlightsCount, label: 'Baseline On-Time Flights', unit: 'flights' });
  entries.push({ key: 'base.missedConnectionsCount', value: baseKpi.missedConnectionsCount, label: 'Baseline Missed Connections', unit: 'connections' });
  entries.push({ key: 'base.strandedPassengersCount', value: baseKpi.strandedPassengersCount, label: 'Baseline Stranded Passengers', unit: 'passengers' });
  entries.push({ key: 'base.crewTimeoutsCount', value: baseKpi.crewTimeoutsCount, label: 'Baseline Crew Timeouts', unit: 'crews' });
  entries.push({ key: 'base.costScore', value: Math.round(baseKpi.costScore), label: 'Baseline Estimated Cost', unit: 'cost' });

  // Selected Candidate deltas & post-recovery KPIs
  if (context.selectedCandidate) {
    const cand = context.selectedCandidate;
    const candKpi = cand.result.kpis;
    const delta = cand.delta;

    entries.push({ key: 'cand.delayMinutesSaved', value: Math.abs(delta.totalDelayMinutes), label: 'Delay Minutes Saved', unit: 'minutes' });
    entries.push({ key: 'cand.cancellationsAvoided', value: Math.abs(delta.cancelledFlights), label: 'Cancellations Prevented', unit: 'flights' });
    entries.push({ key: 'cand.strandedPaxSaved', value: Math.abs(delta.strandedPassengers), label: 'Stranded Passengers Protected', unit: 'passengers' });
    entries.push({ key: 'cand.crewViolationsPrevented', value: Math.abs(delta.crewViolations), label: 'Crew Violations Resolved', unit: 'crews' });
    entries.push({ key: 'cand.costReduction', value: Math.abs(Math.round(delta.costScore)), label: 'Net Cost Reduction', unit: 'cost' });

    // Result KPIs
    entries.push({ key: 'cand.postDelayMinutes', value: candKpi.totalDelayMinutes, label: 'Post-Recovery Delay', unit: 'minutes' });
    entries.push({ key: 'cand.postCancelledCount', value: candKpi.cancelledFlightsCount, label: 'Post-Recovery Cancellations', unit: 'flights' });
    entries.push({ key: 'cand.postStrandedCount', value: candKpi.strandedPassengersCount, label: 'Post-Recovery Stranded Pax', unit: 'passengers' });
    entries.push({ key: 'cand.postCrewTimeouts', value: candKpi.crewTimeoutsCount, label: 'Post-Recovery Crew Violations', unit: 'crews' });
    entries.push({ key: 'cand.postCostScore', value: Math.round(candKpi.costScore), label: 'Post-Recovery Cost Score', unit: 'cost' });

    // Action specific values (hold minutes, etc.)
    for (const act of cand.actions) {
      if (act.holdMinutes) {
        entries.push({ key: `act.holdMinutes.${act.id}`, value: act.holdMinutes, label: `Hold Time for ${act.flightId}`, unit: 'minutes' });
      }
    }
  }

  // Individual flight delay values & passengers
  for (const sf of context.baselineResult.flights) {
    if (sf.delayMinutes > 0) {
      entries.push({ key: `flight.delay.${sf.flight.flight_id}`, value: sf.delayMinutes, label: `${sf.flight.flight_id} Delay`, unit: 'minutes' });
    }
    entries.push({ key: `flight.pax.${sf.flight.flight_id}`, value: sf.flight.pax, label: `${sf.flight.flight_id} Passengers`, unit: 'passengers' });
  }

  // Connections
  for (const sc of context.baselineResult.connections) {
    entries.push({ key: `conn.pax.${sc.connection.connection_id}`, value: sc.connection.passengers, label: `Connection ${sc.connection.connection_id} Passengers`, unit: 'passengers' });
  }

  return entries;
}

/**
 * Validates text against the engine ground-truth.
 */
export function validateNumbers(
  rawText: string,
  context: GroundTruthContext,
  isTampered: boolean = false
): NumberGuardResult {
  const groundTruth = buildGroundTruthLookup(context);
  const gtValues = groundTruth.map((gt) => gt.value);

  // Extract sentences
  const sentences = rawText.split(/(?<=[.!?])\s+/);
  const checks: NumberGuardCheck[] = [];
  const blockedSentences: string[] = [];
  const verifiedSentences: string[] = [];

  // Match numbers like 90, 1,240, 1500, etc. (excluding flight numbers like DS0101 or 08:00 times)
  const numberRegex = /(?<![A-Za-z0-9:])(?:\b|\b₹)(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?!\s*:\s*\d{2})(?!\s*[A-Za-z0-9_-]*\b[A-Z])/g;

  let totalNumbers = 0;
  let matchedNumbers = 0;
  let mismatchedNumbers = 0;

  for (const sentence of sentences) {
    if (!sentence.trim()) continue;

    let sentenceHasMismatch = false;
    let match;

    // Reset regex index for this sentence
    numberRegex.lastIndex = 0;

    while ((match = numberRegex.exec(sentence)) !== null) {
      const numStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(numStr);

      // Ignore trivial numbers like 1, 2 for indexing or standard hour lengths unless matched
      if (isNaN(parsed)) continue;

      totalNumbers++;

      // Check against ground truth
      const exactMatch = groundTruth.find((gt) => gt.value === parsed);
      const closeMatch = groundTruth.find((gt) => Math.abs(gt.value - parsed) <= 1); // 1 unit tolerance for rounding

      const matchedGt = exactMatch || closeMatch;

      if (matchedGt) {
        matchedNumbers++;
        checks.push({
          claimedValue: parsed,
          unit: matchedGt.unit,
          metricKey: matchedGt.key,
          groundTruthValue: matchedGt.value,
          matched: true,
          diff: 0,
          snippet: sentence.trim(),
          source: `${matchedGt.label}: ${matchedGt.value} ${matchedGt.unit}`
        });
      } else {
        // Did not match any known engine output!
        mismatchedNumbers++;
        sentenceHasMismatch = true;
        checks.push({
          claimedValue: parsed,
          unit: 'unknown',
          metricKey: 'UNVERIFIED',
          groundTruthValue: -1,
          matched: false,
          diff: parsed,
          snippet: sentence.trim(),
          source: 'Engine check failed: number not found in simulation ground truth'
        });
      }
    }

    if (sentenceHasMismatch) {
      blockedSentences.push(sentence.trim());
    } else {
      verifiedSentences.push(sentence.trim());
    }
  }

  const allVerified = mismatchedNumbers === 0 && totalNumbers > 0;

  return {
    verified: allVerified,
    totalNumbers,
    matchedNumbers,
    mismatchedNumbers,
    checks,
    verifiedText: verifiedSentences.join(' '),
    blockedSentences,
    isTampered
  };
}

/**
 * Creates a 100% verified, engine-grounded template explanation
 * when AI response fails verification or is tampered.
 */
export function generateVerifiedTemplateExplanation(context: GroundTruthContext): string {
  const baseKpi = context.baselineResult.kpis;
  const cand = context.selectedCandidate;

  if (!cand) {
    return `Current simulation state: ${baseKpi.delayedFlightsCount} delayed flights, ${baseKpi.cancelledFlightsCount} cancellations, and ${baseKpi.strandedPassengersCount} stranded passengers across ${baseKpi.totalDelayMinutes} total delay minutes.`;
  }

  const savedDelay = Math.abs(cand.delta.totalDelayMinutes);
  const savedPax = Math.abs(cand.delta.strandedPassengers);
  const avoidedCancels = Math.abs(cand.delta.cancelledFlights);
  const avoidedCrews = Math.abs(cand.delta.crewViolations);

  let explanation = `Plan ${cand.title} executes ${cand.actions.length} deterministic recovery actions. `;

  if (savedDelay > 0) {
    explanation += `It recovers ${savedDelay} minutes of cascading rotational delay. `;
  }
  if (savedPax > 0) {
    explanation += `It protects ${savedPax} passengers from missed connections and overnight stranding. `;
  }
  if (avoidedCancels > 0) {
    explanation += `It prevents ${avoidedCancels} flight cancellations. `;
  }
  if (avoidedCrews > 0) {
    explanation += `It resolves ${avoidedCrews} legal crew duty timeouts. `;
  }

  explanation += `Post-recovery state stabilizes at ${cand.result.kpis.totalDelayMinutes} delay minutes and ${cand.result.kpis.strandedPassengersCount} stranded passengers.`;

  return explanation;
}
