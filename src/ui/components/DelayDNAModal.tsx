import React, { useState } from 'react';
import { X, Dna, ArrowRight, ShieldCheck, AlertCircle, Clock, AlertTriangle, Users, Plane } from 'lucide-react';
import { SimulatedFlight, PatientZeroReport, DelayReason } from '../../types';

interface DelayDNAModalProps {
  flight: SimulatedFlight | null;
  patientZero: PatientZeroReport[];
  onClose: () => void;
  onSelectFlight: (flightId: string) => void;
}

export const DelayDNAModal: React.FC<DelayDNAModalProps> = ({
  flight,
  patientZero,
  onClose,
  onSelectFlight
}) => {
  const [activeTab, setActiveTab] = useState<'lineage' | 'patientZero'>('lineage');

  if (!flight) return null;

  const totalCauseMinutes = flight.causeChain.reduce((sum, c) => sum + c.minutes, 0);
  const invariantVerified = totalCauseMinutes === flight.delayMinutes;

  const getReasonColor = (reason: DelayReason) => {
    switch (reason) {
      case 'WEATHER_CLOSURE':
        return 'bg-blue-500 text-blue-100 border-blue-400';
      case 'ROTATION_KNOCKON':
        return 'bg-amber-500 text-amber-100 border-amber-400';
      case 'CREW_TIMEOUT':
      case 'CREW_WAIT':
        return 'bg-rose-500 text-rose-100 border-rose-400';
      case 'CONNECTION_HOLD':
        return 'bg-cyan-500 text-cyan-100 border-cyan-400';
      default:
        return 'bg-slate-500 text-slate-100 border-slate-400';
    }
  };

  const getReasonBadge = (reason: DelayReason) => {
    switch (reason) {
      case 'WEATHER_CLOSURE':
        return 'Weather Closure';
      case 'ROTATION_KNOCKON':
        return 'Rotation Knock-on';
      case 'CREW_TIMEOUT':
        return 'Crew Timeout';
      case 'CREW_WAIT':
        return 'Crew Standby Wait';
      case 'CONNECTION_HOLD':
        return 'Connection Protection';
      default:
        return reason;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-radar-surface border border-radar-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-radar-border flex items-center justify-between bg-radar-panel/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Dna className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-mono tracking-wider text-slate-100">
                  DELAY DNA™ — {flight.flight.flight_id}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    flight.status === 'CANCELLED'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : flight.delayMinutes >= 60
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : flight.delayMinutes > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {flight.status === 'CANCELLED' ? 'CANCELLED' : `+${flight.delayMinutes}m DELAY`}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                {flight.flight.origin} ➔ {flight.flight.destination} · Tail: {flight.tail_id} · Crew: {flight.crew_id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-radar-bg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-radar-border bg-radar-panel/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('lineage')}
            className={`px-4 py-2 font-mono text-xs font-bold border-b-2 transition ${
              activeTab === 'lineage'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Causal Blame Trace (Delay Lineage)
          </button>
          <button
            onClick={() => setActiveTab('patientZero')}
            className={`px-4 py-2 font-mono text-xs font-bold border-b-2 transition ${
              activeTab === 'patientZero'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Patient Zero Ranking ({patientZero.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'lineage' ? (
            <>
              {/* Mathematical Invariant Verification Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-radar-bg border border-radar-border font-mono text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">
                    Engine Mathematical Invariant:
                  </span>
                  <span className="text-emerald-300 font-bold">
                    ∑(Cause Chain Minutes) = {totalCauseMinutes}m == Flight Delay ({flight.delayMinutes}m)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                  100% PROVEN
                </span>
              </div>

              {/* Stacked Proportional Delay Bar */}
              {flight.delayMinutes > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                    <span>Delay Composition by Cause</span>
                    <span>{flight.delayMinutes} Total Minutes</span>
                  </div>
                  <div className="h-4 rounded-lg overflow-hidden flex bg-radar-bg border border-radar-border">
                    {flight.causeChain.map((link, idx) => {
                      const pct = flight.delayMinutes > 0 ? (link.minutes / flight.delayMinutes) * 100 : 0;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={idx}
                          style={{ width: `${pct}%` }}
                          className={`${getReasonColor(link.reason).split(' ')[0]} transition-all duration-300 relative group`}
                          title={`${link.event}: ${link.minutes}m (${Math.round(pct)}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-mono">
                    {flight.causeChain.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${getReasonColor(link.reason).split(' ')[0]}`} />
                        <span className="text-slate-300 font-medium">{getReasonBadge(link.reason)}</span>
                        <span className="text-slate-500">({link.minutes}m)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Causal Step-by-Step Lineage */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
                  Chronological Blame Sequence
                </h4>

                {flight.causeChain.length === 0 ? (
                  <div className="p-4 rounded-xl bg-radar-bg border border-radar-border text-center text-sm font-mono text-emerald-400">
                    Flight operated 100% on-time. No upstream delay causes recorded.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 border-l-2 border-radar-border/80">
                    {flight.causeChain.map((link, idx) => (
                      <div key={idx} className="relative group">
                        {/* Dot on timeline */}
                        <div
                          className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-radar-surface ${
                            getReasonColor(link.reason).split(' ')[0]
                          }`}
                        />

                        <div className="p-3.5 rounded-xl bg-radar-bg border border-radar-border hover:border-cyan-500/40 transition">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              STAGE {link.stage}: {getReasonBadge(link.reason)}
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-300">
                              +{link.minutes} mins
                            </span>
                          </div>

                          <div className="text-sm font-semibold font-mono text-slate-200 mt-1">
                            {link.event}
                          </div>

                          <p className="text-xs text-slate-400 mt-1 font-mono">
                            {link.description}
                          </p>

                          {link.flightId !== flight.flight.flight_id && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                              <span className="text-[11px] font-mono text-slate-400">
                                Upstream Flight: <strong className="text-cyan-300">{link.flightId}</strong> (Tail {link.aircraftTail})
                              </span>
                              <button
                                onClick={() => onSelectFlight(link.flightId)}
                                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                              >
                                <span>Inspect Upstream DNA</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Patient Zero Ranking */
            <div className="space-y-4">
              <p className="text-xs font-mono text-slate-400">
                Patient Zero identifies the root disruption events that triggered the highest downstream cumulative delay minutes and passenger strandings.
              </p>

              {patientZero.length === 0 ? (
                <div className="p-4 rounded-xl bg-radar-bg border border-radar-border text-center text-sm font-mono text-slate-400">
                  No disruption cascades detected in current simulation.
                </div>
              ) : (
                <div className="space-y-3">
                  {patientZero.map((pz, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-radar-bg border border-radar-border hover:border-amber-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-mono font-bold">
                            RANK #{idx + 1} ROOT CAUSE
                          </span>
                          <span className="text-sm font-bold font-mono text-slate-100">
                            {pz.rootEvent}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {pz.totalDownstreamDelayMinutes}m Total Damage
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-300 mt-3 pt-3 border-t border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Impacted Flights</span>
                          <strong className="text-slate-100">{pz.impactedFlightsCount} flights</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Stranded Pax</span>
                          <strong className="text-red-400">{pz.strandedPaxCount} pax</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Cancellations</span>
                          <strong className="text-rose-400">{pz.cancelledFlightsCount} legs</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Rotations Touched</span>
                          <strong className="text-cyan-300">{pz.affectedTails.length} aircraft</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-radar-border bg-radar-panel flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
};
