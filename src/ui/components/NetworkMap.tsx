import React, { useMemo, useState } from 'react';
import { Airport, SimulatedFlight, AirportClosure } from '../../types';
import { CloudLightning, Plane, Compass } from 'lucide-react';

interface NetworkMapProps {
  airports: Airport[];
  simulatedFlights: SimulatedFlight[];
  closures: AirportClosure[];
  currentTimeMinutes: number;
  onSelectFlight: (flightId: string) => void;
  onSelectAirport: (airportId: string) => void;
  selectedFlightId?: string;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  airports,
  simulatedFlights,
  closures,
  currentTimeMinutes,
  onSelectFlight,
  onSelectAirport,
  selectedFlightId
}) => {
  const [showFIR, setShowFIR] = useState(true);

  // Bounding box for Indian subcontinent coordinates
  const minLng = 69.5;
  const maxLng = 94.5;
  const minLat = 7.5;
  const maxLat = 33.0;

  const width = 640;
  const height = 680;

  // Coordinate projection
  const project = useMemo(() => {
    return (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * (width - 100) + 50;
      const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 90) + 40;
      return { x, y };
    };
  }, []);

  const airportMap = useMemo(() => {
    const map = new Map<string, { airport: Airport; x: number; y: number }>();
    for (const ap of airports) {
      const { x, y } = project(ap.lat, ap.lng);
      map.set(ap.id, { airport: ap, x, y });
    }
    return map;
  }, [airports, project]);

  // Active closures at current simulated time
  const activeClosures = useMemo(() => {
    return closures.filter(
      (c) => currentTimeMinutes >= c.startMinutes && currentTimeMinutes <= c.endMinutes
    );
  }, [closures, currentTimeMinutes]);

  // Compute curved path for flight arcs
  const getCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const offset = Math.min(45, dist * 0.15);
    const midX = (x1 + x2) / 2 - (dy / dist) * offset;
    const midY = (y1 + y2) / 2 + (dx / dist) * offset;
    return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
  };

  const getPointOnCurve = (x1: number, y1: number, x2: number, y2: number, t: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const offset = Math.min(45, dist * 0.15);
    const midX = (x1 + x2) / 2 - (dy / dist) * offset;
    const midY = (y1 + y2) / 2 + (dx / dist) * offset;

    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * y2;

    const tx = 2 * (1 - t) * (midX - x1) + 2 * t * (x2 - midX);
    const ty = 2 * (1 - t) * (midY - y1) + 2 * t * (y2 - midY);
    const angle = (Math.atan2(ty, tx) * 180) / Math.PI;

    return { x, y, angle };
  };

  return (
    <div className="relative w-full h-[520px] bg-radar-bg border border-radar-border rounded-xl overflow-hidden shadow-2xl flex items-center justify-center select-none font-mono">
      {/* Radar grid backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Rotating Radar Sweep Line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <div className="w-[1200px] h-[1200px] absolute -top-[260px] -left-[280px] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(6,182,212,0.18)_0deg,transparent_60deg)] animate-spin-slow rounded-full" />
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full max-h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="stormPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. FIR (Flight Information Region) Airspace Boundaries */}
        {showFIR && (
          <g opacity={0.25} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4,6" fill="none">
            {/* Delhi FIR - Mumbai FIR boundary */}
            <line x1={80} y1={250} x2={350} y2={290} />
            {/* Mumbai FIR - Chennai FIR boundary */}
            <line x1={80} y1={450} x2={380} y2={470} />
            {/* Delhi FIR - Kolkata FIR boundary */}
            <line x1={350} y1={290} x2={520} y2={300} />
            {/* Kolkata FIR - Chennai FIR boundary */}
            <line x1={380} y1={470} x2={580} y2={430} />

            {/* FIR Sector Labels */}
            <text x={180} y={150} fill="#38bdf8" fontSize={9} opacity={0.6}>DELHI FIR (VIDF)</text>
            <text x={120} y={390} fill="#38bdf8" fontSize={9} opacity={0.6}>MUMBAI FIR (VABF)</text>
            <text x={420} y={260} fill="#38bdf8" fontSize={9} opacity={0.6}>KOLKATA FIR (VECF)</text>
            <text x={260} y={550} fill="#38bdf8" fontSize={9} opacity={0.6}>CHENNAI FIR (VOMF)</text>
          </g>
        )}

        {/* 2. Route Paths */}
        <g opacity={0.35}>
          {simulatedFlights.map((sf) => {
            const orig = airportMap.get(sf.flight.origin);
            const dest = airportMap.get(sf.flight.destination);
            if (!orig || !dest) return null;
            return (
              <path
                key={`route-${sf.flight.flight_id}`}
                d={getCurvePath(orig.x, orig.y, dest.x, dest.y)}
                fill="none"
                stroke="#334155"
                strokeWidth={1}
                strokeDasharray="2,3"
              />
            );
          })}
        </g>

        {/* 3. Active Flight Arcs & Cascades */}
        <g>
          {simulatedFlights.map((sf) => {
            const orig = airportMap.get(sf.flight.origin);
            const dest = airportMap.get(sf.flight.destination);
            if (!orig || !dest) return null;

            const isSelected = sf.flight.flight_id === selectedFlightId;
            const isCancelled = sf.status === 'CANCELLED';

            const isAirborne =
              !isCancelled &&
              currentTimeMinutes >= sf.actualDepMinutes &&
              currentTimeMinutes <= sf.actualArrMinutes;

            const hasDepartedOrCancelled =
              currentTimeMinutes >= sf.scheduledDepMinutes;

            let strokeColor = '#10b981'; // Green on-time
            if (isCancelled) {
              strokeColor = '#64748b'; // Grey cancelled
            } else if (sf.delayMinutes >= 60) {
              strokeColor = '#ef4444'; // Red severe
            } else if (sf.delayMinutes > 0) {
              strokeColor = '#f59e0b'; // Amber delayed
            }

            const opacity = isSelected ? 1 : isAirborne ? 0.95 : hasDepartedOrCancelled && sf.delayMinutes > 0 ? 0.65 : 0.2;
            const strokeWidth = isSelected ? 3.5 : isAirborne ? 2.5 : 1.5;

            return (
              <g
                key={`arc-${sf.flight.flight_id}`}
                className="cursor-pointer transition-opacity duration-300"
                onClick={() => onSelectFlight(sf.flight.flight_id)}
              >
                <path
                  d={getCurvePath(orig.x, orig.y, dest.x, dest.y)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeDasharray={isCancelled ? '4,4' : undefined}
                />

                {/* Airborne Plane Icon with heading vector */}
                {isAirborne && (
                  (() => {
                    const block = sf.actualArrMinutes - sf.actualDepMinutes || 1;
                    const progress = Math.min(1, Math.max(0, (currentTimeMinutes - sf.actualDepMinutes) / block));
                    const pt = getPointOnCurve(orig.x, orig.y, dest.x, dest.y, progress);

                    return (
                      <g transform={`translate(${pt.x}, ${pt.y}) rotate(${pt.angle})`}>
                        <circle r={8} fill={strokeColor} opacity={0.3} className="animate-ping" />
                        <circle r={4.5} fill="#0a0e17" stroke={strokeColor} strokeWidth={1.5} />
                        <path
                          d="M -3 -3 L 4 0 L -3 3 Z"
                          fill={strokeColor}
                        />
                      </g>
                    );
                  })()
                )}
              </g>
            );
          })}
        </g>

        {/* 4. Airport Closure Storm Pulses */}
        <g>
          {activeClosures.map((cl) => {
            const ap = airportMap.get(cl.airport);
            if (!ap) return null;
            return (
              <g key={`closure-pulse-${cl.id}`} transform={`translate(${ap.x}, ${ap.y})`}>
                <circle r={38} fill="url(#stormPulse)" className="animate-ping" opacity={0.5} />
                <circle r={26} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,3" opacity={0.8} />
                <circle r={14} fill="#ef4444" opacity={0.3} />
              </g>
            );
          })}
        </g>

        {/* 5. Airport Nodes */}
        <g>
          {airports.map((ap) => {
            const pos = airportMap.get(ap.id);
            if (!pos) return null;

            const isClosed = activeClosures.some((c) => c.airport === ap.id);
            const radius = ap.tier === 'mega_hub' ? 7 : ap.tier === 'regional_hub' ? 5.5 : 4;

            return (
              <g
                key={`airport-${ap.id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => onSelectAirport(ap.id)}
              >
                {ap.tier === 'mega_hub' && (
                  <circle r={12} fill="#06b6d4" opacity={0.15} />
                )}

                <circle
                  r={radius}
                  fill={isClosed ? '#ef4444' : ap.tier === 'mega_hub' ? '#06b6d4' : '#94a3b8'}
                  stroke="#0a0e17"
                  strokeWidth={2}
                  className="transition-colors duration-200 group-hover:scale-125"
                />

                {isClosed && (
                  <CloudLightning className="w-3.5 h-3.5 -translate-x-2 -translate-y-5 text-red-400 animate-bounce" />
                )}

                <text
                  x={8}
                  y={4}
                  fill={isClosed ? '#f87171' : '#cbd5e1'}
                  fontSize={ap.tier === 'mega_hub' ? 11 : 9.5}
                  fontWeight={ap.tier === 'mega_hub' ? 700 : 500}
                  fontFamily="monospace"
                  className="pointer-events-none group-hover:fill-cyan-300"
                >
                  {ap.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Controls Overlay: FIR Toggle & Legend */}
      <div className="absolute bottom-3 left-3 bg-radar-panel/90 backdrop-blur border border-radar-border px-3 py-2 rounded-lg text-[11px] font-mono flex items-center gap-3">
        <button
          onClick={() => setShowFIR(!showFIR)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
            showFIR ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
          }`}
          title="Toggle Indian FIR airspace boundaries"
        >
          <Compass className="w-3 h-3" />
          <span>FIR Grid</span>
        </button>
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> On-Time
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Delay &lt;60m
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-red-400" /> Severe &gt;60m
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-slate-500" /> Cancelled
        </span>
      </div>

      {/* Active Closure Warning Banner */}
      {activeClosures.length > 0 && (
        <div className="absolute top-3 right-3 bg-red-950/80 border border-red-500/50 px-3 py-1.5 rounded-lg text-xs font-mono text-red-200 flex items-center gap-2 animate-pulse">
          <CloudLightning className="w-4 h-4 text-red-400" />
          <span>
            STORM ALERT: {activeClosures.map((c) => `${c.airport} (${c.start}-${c.end})`).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};
