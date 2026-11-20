import React from 'react';
import { UserCheck, UserX, AlertTriangle, ShieldAlert } from 'lucide-react';
import { SimulatedCrew } from '../../types';

interface CrewMetersProps {
  crews: SimulatedCrew[];
  onReassignCrew?: (crewId: string) => void;
}

export const CrewMeters: React.FC<CrewMetersProps> = ({ crews, onReassignCrew }) => {
  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-4 shadow-lg space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span>Flight Crew Legal Duty Meters (DGCA 600m Cap)</span>
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          {crews.filter((c) => c.timedOut).length > 0 ? (
            <span className="text-rose-400 font-bold">
              {crews.filter((c) => c.timedOut).length} CREWS TIMED OUT
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold">All 16 Crews Legal</span>
          )}
        </span>
      </div>

      {/* Grid of crew cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pr-1">
        {crews.map((cr) => {
          const maxDuty = cr.crew.max_duty_mins;
          const currentDuty = cr.totalDutyMinutes;
          const pct = Math.min(100, Math.round((currentDuty / maxDuty) * 100));

          let barColor = 'bg-emerald-500';
          let textColor = 'text-emerald-300';
          let borderColor = 'border-radar-border';

          if (cr.timedOut) {
            barColor = 'bg-rose-500';
            textColor = 'text-rose-400';
            borderColor = 'border-rose-500/50 bg-rose-950/20';
          } else if (pct >= 85) {
            barColor = 'bg-amber-500';
            textColor = 'text-amber-300';
            borderColor = 'border-amber-500/30';
          }

          return (
            <div
              key={cr.crew.crew_id}
              className={`p-3 rounded-lg bg-radar-bg border ${borderColor} font-mono text-xs space-y-2 transition`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{cr.crew.crew_id}</span>
                <span className="text-[10px] text-slate-400">Base: {cr.crew.base}</span>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Duty: {currentDuty}m / {maxDuty}m</span>
                  <span className={`font-bold ${textColor}`}>{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  />
                </div>
              </div>

              {/* Status and Action */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 truncate">
                  Tail {cr.tail_id} ({cr.crew.flight_ids.length} legs)
                </span>
                {cr.timedOut ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    +{cr.timeoutExceededBy}m VIOLATION
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">Compliant</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
