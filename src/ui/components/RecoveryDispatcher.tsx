import React from 'react';
import { Bot, Check, ArrowRight, Zap, TrendingDown, Clock, Users, XCircle, UserX, AlertCircle } from 'lucide-react';
import { RecoveryCandidate, SimulationKPIs, NumberGuardResult, AIDispatcherPlan } from '../../types';
import { NumberGuardBadge, VerifiedTextRenderer } from './NumberGuardBadge';

interface RecoveryDispatcherProps {
  candidates: RecoveryCandidate[];
  selectedCandidate: RecoveryCandidate | null;
  onSelectCandidate: (candidate: RecoveryCandidate) => void;
  onApplyCandidate: (candidate: RecoveryCandidate) => void;
  isApplied: boolean;
  baselineKpis: SimulationKPIs;
  aiPlan: AIDispatcherPlan | null;
  guardResult: NumberGuardResult | null;
  onToggleTamper: () => void;
  isTampered: boolean;
}

export const RecoveryDispatcher: React.FC<RecoveryDispatcherProps> = ({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  onApplyCandidate,
  isApplied,
  baselineKpis,
  aiPlan,
  guardResult,
  onToggleTamper,
  isTampered
}) => {
  const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  if (candidates.length === 0) {
    return (
      <div className="bg-radar-panel border border-radar-border rounded-xl p-6 shadow-lg text-center font-mono">
        <Bot className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-bounce" />
        <h3 className="text-sm font-bold text-slate-200">
          AI Dispatcher Standby — Schedule On-Time
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          No disruption cascades detected. Engine recovery search is on standby until airport closures or flight delays occur.
        </p>
      </div>
    );
  }

  const activeCandidate = selectedCandidate || candidates[0];
  const candKpis = activeCandidate.result.kpis;

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-radar-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
                AI Recovery Dispatcher
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Engine Proposes · AI Disposes
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Evaluated {candidates.length} candidate recovery interventions using deterministic re-simulation.
            </p>
          </div>
        </div>

        {/* Apply Action Button */}
        <button
          onClick={() => onApplyCandidate(activeCandidate)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition shadow-lg active:scale-95 ${
            isApplied
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300 shadow-emerald-950/40'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-cyan-950/40'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{isApplied ? 'RECOVERY PLAN APPLIED' : 'ACCEPT & APPLY PLAN'}</span>
        </button>
      </div>

      {/* Number Guard Trust Layer Badge */}
      {guardResult && (
        <NumberGuardBadge
          guardResult={guardResult}
          onToggleTamper={onToggleTamper}
          isTampered={isTampered}
        />
      )}

      {/* AI Explanation Box */}
      {aiPlan && guardResult && (
        <div className="p-4 rounded-xl bg-radar-bg border border-cyan-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>AI Operations Officer Recommendation:</span>
          </div>

          <p className="text-xs font-mono text-slate-300 font-medium">
            {aiPlan.executiveSummary}
          </p>

          <div className="pt-2 border-t border-radar-border/60">
            <VerifiedTextRenderer
              text={aiPlan.operationalReasoning}
              guardResult={guardResult}
            />
          </div>
        </div>
      )}

      {/* Before vs After Side-by-Side Comparison Grid */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2.5">
          Side-by-Side Operational Impact (Before vs After Plan)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
          {/* Delay */}
          <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
            <span className="text-[10px] text-slate-400 block mb-1">Total Delay</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400 line-through">{baselineKpis.totalDelayMinutes}m</span>
              <span className="text-xs font-bold text-emerald-400">{candKpis.totalDelayMinutes}m</span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">
              Δ {activeCandidate.delta.totalDelayMinutes}m
            </span>
          </div>

          {/* Cancellations */}
          <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
            <span className="text-[10px] text-slate-400 block mb-1">Cancellations</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">{baselineKpis.cancelledFlightsCount}</span>
              <span className="text-xs font-bold text-slate-100">{candKpis.cancelledFlightsCount}</span>
            </div>
            <span className={`text-[10px] block mt-1 font-semibold ${activeCandidate.delta.cancelledFlights <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Δ {activeCandidate.delta.cancelledFlights > 0 ? `+${activeCandidate.delta.cancelledFlights}` : activeCandidate.delta.cancelledFlights}
            </span>
          </div>

          {/* Stranded Pax */}
          <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
            <span className="text-[10px] text-slate-400 block mb-1">Stranded Pax</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400 line-through">{baselineKpis.strandedPassengersCount}</span>
              <span className="text-xs font-bold text-emerald-400">{candKpis.strandedPassengersCount}</span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">
              Δ {activeCandidate.delta.strandedPassengers} pax
            </span>
          </div>

          {/* Crew Timeouts */}
          <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
            <span className="text-[10px] text-slate-400 block mb-1">Crew Violations</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400 line-through">{baselineKpis.crewTimeoutsCount}</span>
              <span className="text-xs font-bold text-emerald-400">{candKpis.crewTimeoutsCount}</span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">
              Δ {activeCandidate.delta.crewViolations}
            </span>
          </div>

          {/* Net Cost Delta */}
          <div className="p-3 rounded-lg bg-radar-bg border border-radar-border col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block mb-1">Disruption Cost</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400 line-through">{formatCurrency(baselineKpis.costScore)}</span>
              <span className="text-xs font-bold text-cyan-300">{formatCurrency(candKpis.costScore)}</span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">
              Save {formatCurrency(Math.abs(activeCandidate.delta.costScore))}
            </span>
          </div>
        </div>
      </div>

      {/* Candidate Selector List */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
          Ranked Engine Recovery Options ({candidates.length})
        </h4>

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {candidates.map((cand, idx) => {
            const isSelected = cand.id === activeCandidate.id;
            return (
              <div
                key={cand.id}
                onClick={() => onSelectCandidate(cand)}
                className={`p-3 rounded-xl border font-mono text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md'
                    : 'bg-radar-bg border-radar-border hover:border-slate-600'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      #{idx + 1}
                    </span>
                    <strong className="text-slate-100">{cand.title}</strong>
                  </div>
                  <p className="text-[11px] text-slate-400">{cand.description}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-emerald-400">
                    {cand.delta.costScore < 0 ? `-${formatCurrency(Math.abs(cand.delta.costScore))}` : '0'}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {cand.delta.totalDelayMinutes}m delay · {cand.delta.strandedPassengers} pax
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
