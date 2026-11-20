import React, { useState } from 'react';
import { CloudLightning, Plus, Trash2, Clock, MapPin, Zap } from 'lucide-react';
import { Airport, AirportClosure } from '../../types';
import { minutesToTime, timeToMinutes } from '../../data/adapter';

interface DisruptionControllerProps {
  airports: Airport[];
  activeClosures: AirportClosure[];
  onAddClosure: (closure: AirportClosure) => void;
  onRemoveClosure: (id: string) => void;
  onClearClosures: () => void;
}

export const DisruptionController: React.FC<DisruptionControllerProps> = ({
  airports,
  activeClosures,
  onAddClosure,
  onRemoveClosure,
  onClearClosures
}) => {
  const [selectedAirport, setSelectedAirport] = useState('BOM');
  const [startTimeStr, setStartTimeStr] = useState('14:00');
  const [durationMins, setDurationMins] = useState(90);

  const presets = [30, 90, 180];
  const quickAirports = ['BOM', 'DEL', 'BLR', 'HYD', 'CCU'];

  const handleDisrupt = () => {
    const startMins = timeToMinutes(startTimeStr);
    const endMins = startMins + durationMins;
    const endStr = minutesToTime(endMins);

    const closure: AirportClosure = {
      id: `${selectedAirport}_${startMins}_${endMins}_${Date.now()}`,
      airport: selectedAirport,
      start: startTimeStr,
      end: endStr,
      startMinutes: startMins,
      endMinutes: endMins
    };

    onAddClosure(closure);
  };

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-4 shadow-lg space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudLightning className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Airport Disruption Injector
          </h2>
        </div>
        {activeClosures.length > 0 && (
          <button
            onClick={onClearClosures}
            className="text-[10px] text-red-400 hover:text-red-300 font-mono underline"
          >
            Clear All Closures ({activeClosures.length})
          </button>
        )}
      </div>

      {/* Disruption Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Airport Picker */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            Airport
          </label>
          <div className="flex gap-1.5 mb-1.5">
            {quickAirports.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedAirport(code)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                  selectedAirport === code
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-radar-bg text-slate-400 hover:text-white border border-radar-border'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          <select
            value={selectedAirport}
            onChange={(e) => setSelectedAirport(e.target.value)}
            className="w-full bg-radar-bg border border-radar-border text-slate-200 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {airports.map((ap) => (
              <option key={ap.id} value={ap.id}>
                {ap.id} — {ap.city} ({ap.name})
              </option>
            ))}
          </select>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            Closure Start (IST)
          </label>
          <input
            type="time"
            value={startTimeStr}
            onChange={(e) => setStartTimeStr(e.target.value)}
            className="w-full bg-radar-bg border border-radar-border text-slate-200 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          />
          <div className="flex gap-1 mt-1.5">
            {['08:00', '12:00', '14:00', '16:00', '19:00'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setStartTimeStr(t)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-radar-bg hover:bg-slate-800 text-slate-400 hover:text-white border border-radar-border"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Duration & Trigger */}
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            Duration: <strong className="text-amber-400 font-mono">{durationMins}m</strong>
          </label>
          <div className="flex gap-1.5 mb-2">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDurationMins(p)}
                className={`flex-1 py-1 rounded text-xs font-mono font-bold transition ${
                  durationMins === p
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-radar-bg text-slate-400 hover:text-white border border-radar-border'
                }`}
              >
                {p}m
              </button>
            ))}
          </div>

          <button
            onClick={handleDisrupt}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gradient-to-r from-red-500/30 to-amber-500/30 hover:from-red-500/40 hover:to-amber-500/40 border border-red-500/50 text-red-200 text-xs font-mono font-bold transition active:scale-98"
          >
            <CloudLightning className="w-3.5 h-3.5 text-red-400" />
            <span>DISRUPT AIRPORT</span>
          </button>
        </div>
      </div>

      {/* Active Closures Pill List */}
      {activeClosures.length > 0 && (
        <div className="pt-2 border-t border-radar-border/60">
          <span className="text-[11px] font-mono text-slate-400 mb-1.5 block">
            Active Closures ({activeClosures.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {activeClosures.map((cl) => (
              <div
                key={cl.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-200"
              >
                <CloudLightning className="w-3.5 h-3.5 text-red-400" />
                <span>
                  <strong>{cl.airport}</strong> ({cl.start} – {cl.end}) [{cl.endMinutes - cl.startMinutes}m]
                </span>
                <button
                  onClick={() => onRemoveClosure(cl.id)}
                  className="text-red-400 hover:text-white transition ml-1"
                  title="Remove closure"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
