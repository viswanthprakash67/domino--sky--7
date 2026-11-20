import React from 'react';
import { HeartPulse, ShieldAlert, Award, FileText } from 'lucide-react';
import { SimulationKPIs, SimulatedFlight, SimulatedConnection } from '../../types';

interface PassengerMiseryIndexProps {
  kpis: SimulationKPIs;
  flights: SimulatedFlight[];
  connections: SimulatedConnection[];
}

export const PassengerMiseryIndex: React.FC<PassengerMiseryIndexProps> = ({
  kpis,
  flights,
  connections
}) => {
  // Compute Total Passenger Delay Hours
  let totalPaxDelayMinutes = 0;
  for (const sf of flights) {
    if (sf.status === 'DELAYED') {
      totalPaxDelayMinutes += sf.delayMinutes * sf.flight.pax;
    }
  }
  const totalPaxDelayHours = Math.round(totalPaxDelayMinutes / 60);

  // Compute DGCA CAR Section 3 statutory compensation liability:
  // Delays > 2h: ₹5,000 per pax compensation or refreshments/hotel
  // Flight cancellations: ₹10,000 statutory compensation
  let dgcaLiability = 0;
  for (const sf of flights) {
    if (sf.status === 'CANCELLED') {
      dgcaLiability += sf.flight.pax * 10000;
    } else if (sf.delayMinutes >= 120) {
      dgcaLiability += sf.flight.pax * 5000;
    }
  }
  // Stranded connecting passengers care (overnight hotel @ ₹6,000 per pax)
  const hotelCareCosts = kpis.strandedPassengersCount * 6000;
  const totalRegulatoryLiability = dgcaLiability + hotelCareCosts;

  // Passenger Misery Score (0 to 100)
  // 0 = serene, 100 = catastrophic terminal gridlock
  const miseryScore = Math.min(
    100,
    Math.round((totalPaxDelayHours / 250) * 35 + (kpis.strandedPassengersCount / 150) * 45 + (kpis.cancelledFlightsCount / 5) * 20)
  );

  let miseryColor = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  let miseryLabel = 'EXCELLENT (PASSENGERS CONTENT)';
  if (miseryScore > 65) {
    miseryColor = 'text-red-400 bg-red-500/20 border-red-500/50';
    miseryLabel = 'CRITICAL (AIRPORT GRIDLOCK & PROTESTS)';
  } else if (miseryScore > 25) {
    miseryColor = 'text-amber-400 bg-amber-500/20 border-amber-500/50';
    miseryLabel = 'ELEVATED DISCOMFORT & DELAYS';
  }

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-4 shadow-lg space-y-3 font-mono">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-radar-border pb-2">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            PASSENGER MISERY INDEX (PMI) & DGCA CAR COMPLIANCE
          </h3>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${miseryColor}`}>
          PMI SCORE: {miseryScore}/100 · {miseryLabel}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Lost Passenger Hours */}
        <div className="p-2.5 rounded-lg bg-radar-bg border border-radar-border">
          <span className="text-[10px] text-slate-400 block">Total Lost Pax Hours</span>
          <strong className="text-sm font-bold text-slate-100">{totalPaxDelayHours.toLocaleString()} hrs</strong>
          <span className="text-[9px] text-slate-500 block">Cumulative passenger delay</span>
        </div>

        {/* Stranded Pax */}
        <div className="p-2.5 rounded-lg bg-radar-bg border border-radar-border">
          <span className="text-[10px] text-slate-400 block">Overnight Stranded</span>
          <strong className="text-sm font-bold text-red-400">{kpis.strandedPassengersCount} pax</strong>
          <span className="text-[9px] text-slate-500 block">Require hotel accommodations</span>
        </div>

        {/* DGCA Section 3 Liability */}
        <div className="p-2.5 rounded-lg bg-radar-bg border border-radar-border">
          <span className="text-[10px] text-slate-400 block">DGCA CAR Sec 3 Liability</span>
          <strong className="text-sm font-bold text-amber-300">
            ₹{Math.round(totalRegulatoryLiability).toLocaleString('en-IN')}
          </strong>
          <span className="text-[9px] text-slate-500 block">Statutory passenger compensation</span>
        </div>

        {/* Hotel & Care Costs */}
        <div className="p-2.5 rounded-lg bg-radar-bg border border-radar-border">
          <span className="text-[10px] text-slate-400 block">Hospitality Care Obligation</span>
          <strong className="text-sm font-bold text-cyan-300">
            ₹{Math.round(hotelCareCosts).toLocaleString('en-IN')}
          </strong>
          <span className="text-[9px] text-slate-500 block">Food, transit & lodging</span>
        </div>
      </div>
    </div>
  );
};
