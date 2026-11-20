import React, { useMemo } from 'react';
import { SimulatedFlight, Aircraft, Spare } from '../../types';
import { minutesToTime } from '../../data/adapter';

interface GanttViewProps {
  simulatedFlights: SimulatedFlight[];
  aircraft: Aircraft[];
  spares: Spare[];
  currentTimeMinutes: number;
  onSelectFlight: (flightId: string) => void;
  selectedFlightId?: string;
}

export const GanttView: React.FC<GanttViewProps> = ({
  simulatedFlights,
  aircraft,
  spares,
  currentTimeMinutes,
  onSelectFlight,
  selectedFlightId
}) => {
  const minGanttMin = 300;  // 05:00
  const maxGanttMin = 1440; // 24:00
  const totalGanttMins = maxGanttMin - minGanttMin;

  // Group simulated flights by their ACTIVE tail
  const flightsByTail = useMemo(() => {
    const map = new Map<string, SimulatedFlight[]>();
    for (const ac of aircraft) {
      map.set(ac.tail_id, []);
    }
    for (const sp of spares) {
      if (!map.has(sp.tail_id)) map.set(sp.tail_id, []);
    }
    for (const sf of simulatedFlights) {
      if (!map.has(sf.tail_id)) map.set(sf.tail_id, []);
      map.get(sf.tail_id)!.push(sf);
    }
    // Sort each by scheduled departure
    for (const [, fls] of map.entries()) {
      fls.sort((a, b) => a.scheduledDepMinutes - b.scheduledDepMinutes);
    }
    return map;
  }, [simulatedFlights, aircraft, spares]);

  const allTails = useMemo(() => {
    return Array.from(flightsByTail.keys());
  }, [flightsByTail]);

  // Convert minute to percentage along timeline
  const getPct = (m: number) => {
    return Math.max(0, Math.min(100, ((m - minGanttMin) / totalGanttMins) * 100));
  };

  const timeTicks = [
    { label: '06:00', min: 360 },
    { label: '08:00', min: 480 },
    { label: '10:00', min: 600 },
    { label: '12:00', min: 720 },
    { label: '14:00', min: 840 },
    { label: '16:00', min: 960 },
    { label: '18:00', min: 1080 },
    { label: '20:00', min: 1200 },
    { label: '22:00', min: 1320 },
    { label: '24:00', min: 1440 }
  ];

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-4 shadow-lg overflow-hidden flex flex-col space-y-3">
      {/* Title & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
          Rotational Gantt Matrix (16 Aircraft + Spares)
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/80" /> On-Time Leg
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/80" /> Delayed Leg
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-500/80" /> Severe / Cancelled
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 border border-dashed border-slate-500" /> Sched Ghost
          </span>
        </div>
      </div>

      {/* Gantt Timeline Container */}
      <div className="relative overflow-x-auto select-none">
        <div className="min-w-[850px] relative">
          {/* Header Time Ticks */}
          <div className="h-6 flex items-center relative border-b border-radar-border/80 text-[10px] font-mono text-slate-400 pl-24">
            {timeTicks.map((tk) => {
              const leftPct = getPct(tk.min);
              return (
                <div
                  key={tk.label}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `calc(96px + ${leftPct}% * 0.88)` }}
                >
                  <span>{tk.label}</span>
                  <div className="w-px h-1.5 bg-slate-700 mt-0.5" />
                </div>
              );
            })}
          </div>

          {/* Current Time Sweep Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none shadow-[0_0_8px_#06b6d4]"
            style={{
              left: `calc(96px + ${getPct(currentTimeMinutes)}% * 0.88)`
            }}
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 -translate-x-[3px] -translate-y-1 shadow-md shadow-cyan-500" />
          </div>

          {/* Aircraft Rotation Rows */}
          <div className="divide-y divide-radar-border/40">
            {allTails.map((tail) => {
              const flights = flightsByTail.get(tail) || [];
              const isSpare = tail.startsWith('VT-DS17') || tail.startsWith('VT-DS18');

              return (
                <div
                  key={tail}
                  className="h-9 flex items-center relative hover:bg-slate-800/30 transition group"
                >
                  {/* Tail Label */}
                  <div className="w-24 flex-shrink-0 flex items-center justify-between pr-3 font-mono text-xs text-slate-300">
                    <span className={isSpare ? 'text-cyan-400 font-semibold' : 'font-medium'}>
                      {tail}
                    </span>
                    {isSpare && (
                      <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-300">SPARE</span>
                    )}
                  </div>

                  {/* Track */}
                  <div className="flex-1 relative h-7">
                    {/* Background hour grid lines */}
                    {timeTicks.map((tk) => (
                      <div
                        key={`grid-${tk.min}`}
                        className="absolute top-0 bottom-0 w-px bg-slate-800/40 pointer-events-none"
                        style={{ left: `${getPct(tk.min)}%` }}
                      />
                    ))}

                    {/* Flight Blocks */}
                    {flights.map((sf) => {
                      const isSelected = sf.flight.flight_id === selectedFlightId;
                      const isCancelled = sf.status === 'CANCELLED';

                      // Scheduled block coordinates
                      const schedLeft = getPct(sf.scheduledDepMinutes);
                      const schedWidth = Math.max(1.5, getPct(sf.scheduledArrMinutes) - schedLeft);

                      // Actual block coordinates
                      const actLeft = getPct(sf.actualDepMinutes);
                      const actWidth = Math.max(1.5, getPct(sf.actualArrMinutes) - actLeft);

                      let blockBg = 'bg-emerald-600/90 hover:bg-emerald-500';
                      let borderColor = 'border-emerald-400/80';

                      if (isCancelled) {
                        blockBg = 'bg-slate-700/80 hover:bg-slate-600';
                        borderColor = 'border-slate-500';
                      } else if (sf.delayMinutes >= 60) {
                        blockBg = 'bg-red-600/90 hover:bg-red-500';
                        borderColor = 'border-red-400';
                      } else if (sf.delayMinutes > 0) {
                        blockBg = 'bg-amber-600/90 hover:bg-amber-500';
                        borderColor = 'border-amber-400';
                      }

                      return (
                        <React.Fragment key={sf.flight.flight_id}>
                          {/* Ghost Scheduled Box if delayed */}
                          {sf.delayMinutes > 0 && !isCancelled && (
                            <div
                              className="absolute top-1 bottom-1 border border-dashed border-slate-500/50 rounded pointer-events-none opacity-40"
                              style={{ left: `${schedLeft}%`, width: `${schedWidth}%` }}
                            />
                          )}

                          {/* Actual Flight Block */}
                          <div
                            onClick={() => onSelectFlight(sf.flight.flight_id)}
                            style={{ left: `${actLeft}%`, width: `${actWidth}%` }}
                            className={`absolute top-1 bottom-1 rounded border text-[10px] font-mono flex items-center justify-between px-1.5 cursor-pointer transition shadow-md ${blockBg} ${borderColor} ${
                              isSelected ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-radar-bg z-10' : ''
                            } ${isCancelled ? 'line-through opacity-60' : ''}`}
                            title={`${sf.flight.flight_id} (${sf.flight.origin}->${sf.flight.destination})\nSched: ${sf.flight.dep}-${sf.flight.arr}\nActual: ${sf.actualDep}-${sf.actualArr}\nDelay: +${sf.delayMinutes}m`}
                          >
                            <span className="font-bold text-white truncate">
                              {sf.flight.flight_id}
                            </span>
                            <span className="hidden xl:inline text-white/80 text-[9px]">
                              {sf.flight.origin}➔{sf.flight.destination}
                            </span>
                            {sf.delayMinutes > 0 && !isCancelled && (
                              <span className="text-[9px] font-bold text-amber-200">
                                +{sf.delayMinutes}
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
