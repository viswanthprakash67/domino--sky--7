import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock } from 'lucide-react';
import { minutesToTime } from '../../data/adapter';
import { AirportClosure, SimulatedFlight } from '../../types';

interface TimeScrubberProps {
  currentTimeMinutes: number;
  onChangeTime: (minutes: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playSpeed: number;
  onChangeSpeed: (speed: number) => void;
  closures: AirportClosure[];
  simulatedFlights: SimulatedFlight[];
}

export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  currentTimeMinutes,
  onChangeTime,
  isPlaying,
  onTogglePlay,
  playSpeed,
  onChangeSpeed,
  closures,
  simulatedFlights
}) => {
  const minTime = 300;  // 05:00
  const maxTime = 1439; // 23:59

  // Calculate live counts at scrubbed time
  const airborneCount = simulatedFlights.filter(
    (sf) =>
      sf.status !== 'CANCELLED' &&
      currentTimeMinutes >= sf.actualDepMinutes &&
      currentTimeMinutes <= sf.actualArrMinutes
  ).length;

  const delayedUpToNow = simulatedFlights.filter(
    (sf) =>
      currentTimeMinutes >= sf.scheduledDepMinutes &&
      sf.status === 'DELAYED'
  ).length;

  const cancelledUpToNow = simulatedFlights.filter(
    (sf) =>
      currentTimeMinutes >= sf.scheduledDepMinutes &&
      sf.status === 'CANCELLED'
  ).length;

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-3.5 shadow-lg space-y-3">
      {/* Top bar: Live clock & Playback controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Digital chronometer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-radar-bg border border-cyan-500/30 text-cyan-300 font-mono">
            <Clock className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span className="text-lg font-bold tracking-widest">
              {minutesToTime(currentTimeMinutes)}
            </span>
            <span className="text-[10px] text-cyan-500/80 font-semibold uppercase">IST</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>
              Airborne: <strong className="text-cyan-300">{airborneCount}</strong>
            </span>
            <span>·</span>
            <span>
              Delayed: <strong className="text-amber-300">{delayedUpToNow}</strong>
            </span>
            <span>·</span>
            <span>
              Cancelled: <strong className="text-red-400">{cancelledUpToNow}</strong>
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition active:scale-95 ${
              isPlaying
                ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                : 'bg-cyan-500/20 border border-cyan-500 text-cyan-300 hover:bg-cyan-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'REPLAY'}</span>
          </button>

          {/* Speed toggles */}
          <div className="flex items-center rounded-lg bg-radar-bg border border-radar-border p-0.5 text-xs font-mono">
            {[1, 5, 15, 30].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-1 rounded transition ${
                  playSpeed === spd
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Reset to morning 05:00 */}
          <button
            onClick={() => onChangeTime(minTime)}
            className="p-1.5 rounded-lg bg-radar-bg hover:bg-slate-800 border border-radar-border text-slate-400 hover:text-white transition"
            title="Reset Time to 05:00"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrubber slider track with closure markers */}
      <div className="relative pt-1 pb-1">
        {/* Closure bands along slider */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-800/80 rounded pointer-events-none overflow-hidden">
          {closures.map((cl) => {
            const leftPct = ((cl.startMinutes - minTime) / (maxTime - minTime)) * 100;
            const widthPct = ((cl.endMinutes - cl.startMinutes) / (maxTime - minTime)) * 100;
            return (
              <div
                key={`closure-band-${cl.id}`}
                className="absolute top-0 bottom-0 bg-red-500/40 border-l border-r border-red-500/80"
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={`${cl.airport} Closure: ${cl.start}-${cl.end}`}
              />
            );
          })}
        </div>

        {/* Input slider */}
        <input
          type="range"
          min={minTime}
          max={maxTime}
          step={5}
          value={currentTimeMinutes}
          onChange={(e) => onChangeTime(Number(e.target.value))}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer accent-cyan-400 focus:outline-none z-10"
        />

        {/* Time markers */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
          <span>05:00</span>
          <span>08:00</span>
          <span>11:00</span>
          <span>14:00 (Storm)</span>
          <span>17:00</span>
          <span>20:00</span>
          <span>23:59</span>
        </div>
      </div>
    </div>
  );
};
