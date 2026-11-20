import React from 'react';
import { GitCompare, ArrowRight, ShieldCheck, TrendingDown, Clock, Users, XCircle, UserX } from 'lucide-react';
import { SimulationResult, RecoveryCandidate } from '../../types';

interface TimelineComparisonProps {
  baselineResult: SimulationResult;
  recoveredResult: SimulationResult;
  selectedCandidate?: RecoveryCandidate | null;
}

export const TimelineComparison: React.FC<TimelineComparisonProps> = ({
  baselineResult,
  recoveredResult,
  selectedCandidate
}) => {
  const baseKpi = baselineResult.kpis;
  const recKpi = recoveredResult.kpis;

  const savedDelay = baseKpi.totalDelayMinutes - recKpi.totalDelayMinutes;
  const savedCancels = baseKpi.cancelledFlightsCount - recKpi.cancelledFlightsCount;
  const savedPax = baseKpi.strandedPassengersCount - recKpi.strandedPassengersCount;
  const savedCrews = baseKpi.crewTimeoutsCount - recKpi.crewTimeoutsCount;
  const savedCost = baseKpi.costScore - recKpi.costScore;

  const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-4 shadow-lg space-y-4 font-mono">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-radar-border pb-2.5">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            MULTIVERSE "WHAT-IF" DIVERGENCE (TIMELINE α VS TIMELINE β)
          </h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
          Divergence Dividend: {savedDelay > 0 ? `+${savedDelay}m Saved` : 'Synchronized'}
        </span>
      </div>

      {/* Side-by-side Multiverse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timeline Alpha: Unmitigated Disaster */}
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 space-y-3">
          <div className="flex items-center justify-between border-b border-red-500/30 pb-2">
            <span className="text-xs font-bold text-red-300">
              TIMELINE α: UNMITIGATED CASCADE
            </span>
            <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20">
              No Recovery Dispatched
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Total Delay</span>
              <strong className="text-amber-400 text-sm">{baseKpi.totalDelayMinutes}m</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Cancellations</span>
              <strong className="text-red-400 text-sm">{baseKpi.cancelledFlightsCount} flights</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Stranded Pax</span>
              <strong className="text-rose-400 text-sm">{baseKpi.strandedPassengersCount} pax</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Crew Timeouts</span>
              <strong className="text-rose-400 text-sm">{baseKpi.crewTimeoutsCount} violations</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-red-500/20 flex justify-between items-center text-xs">
            <span className="text-slate-400">Total Damage Cost:</span>
            <strong className="text-red-300 font-bold">{formatCurrency(baseKpi.costScore)}</strong>
          </div>
        </div>

        {/* Timeline Beta: Domino Sky Recovery */}
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 space-y-3">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
            <span className="text-xs font-bold text-cyan-300">
              TIMELINE β: DOMINO SKY OPTIMIZED
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">
              AI Dispatch Plan Applied
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Post-Recovery Delay</span>
              <strong className="text-emerald-400 text-sm">{recKpi.totalDelayMinutes}m</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Cancellations</span>
              <strong className="text-slate-200 text-sm">{recKpi.cancelledFlightsCount} flights</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Stranded Pax</span>
              <strong className="text-emerald-400 text-sm">{recKpi.strandedPassengersCount} pax</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Crew Timeouts</span>
              <strong className="text-emerald-400 text-sm">{recKpi.crewTimeoutsCount} violations</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-cyan-500/20 flex justify-between items-center text-xs">
            <span className="text-slate-400">Stabilized Cost:</span>
            <strong className="text-cyan-300 font-bold">{formatCurrency(recKpi.costScore)}</strong>
          </div>
        </div>
      </div>

      {/* Divergence Net Savings Banner */}
      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            <strong>DIVERGENCE DIVIDEND:</strong> Plan recovers {Math.max(0, savedDelay)} minutes of delay, protects {Math.max(0, savedPax)} passengers, and saves {formatCurrency(Math.max(0, savedCost))}.
          </span>
        </div>
        <span className="text-[10px] font-bold text-emerald-400 font-mono">
          PROVEN DETERMINISTIC DELTA
        </span>
      </div>
    </div>
  );
};
