import React from 'react';
import { Clock, AlertTriangle, XCircle, Users, GitFork, UserX, TrendingDown } from 'lucide-react';
import { SimulationKPIs } from '../../types';

interface KPIStripProps {
  currentKpis: SimulationKPIs;
  baselineKpis?: SimulationKPIs;
  isDiffMode?: boolean;
}

export const KPIStrip: React.FC<KPIStripProps> = ({
  currentKpis,
  baselineKpis,
  isDiffMode = false
}) => {
  const formatCurrency = (val: number) => {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  const getDeltaBadge = (current: number, base: number, inverse = false) => {
    if (!isDiffMode || base === undefined) return null;
    const diff = current - base;
    if (diff === 0) return <span className="text-[10px] text-slate-500 font-mono">±0</span>;

    // For delays/cancellations, negative diff is good (green)
    const isGood = inverse ? diff > 0 : diff < 0;
    const sign = diff > 0 ? '+' : '';

    return (
      <span
        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
          isGood
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}
      >
        {sign}{diff}
      </span>
    );
  };

  const cards = [
    {
      label: 'Cascading Delay',
      value: `${currentKpis.totalDelayMinutes} m`,
      sub: `${currentKpis.delayedFlightsCount} delayed legs`,
      icon: Clock,
      color: currentKpis.totalDelayMinutes > 0 ? 'text-amber-400' : 'text-slate-400',
      bgColor: currentKpis.totalDelayMinutes > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-radar-border bg-radar-panel/50',
      delta: baselineKpis ? getDeltaBadge(currentKpis.totalDelayMinutes, baselineKpis.totalDelayMinutes) : null
    },
    {
      label: 'Cancellations',
      value: `${currentKpis.cancelledFlightsCount}`,
      sub: currentKpis.cancelledFlightsCount > 0 ? 'Flights terminated' : 'None scheduled',
      icon: XCircle,
      color: currentKpis.cancelledFlightsCount > 0 ? 'text-red-400' : 'text-slate-400',
      bgColor: currentKpis.cancelledFlightsCount > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-radar-border bg-radar-panel/50',
      delta: baselineKpis ? getDeltaBadge(currentKpis.cancelledFlightsCount, baselineKpis.cancelledFlightsCount) : null
    },
    {
      label: 'Missed Connections',
      value: `${currentKpis.missedConnectionsCount}`,
      sub: `${21 - currentKpis.missedConnectionsCount} protected`,
      icon: GitFork,
      color: currentKpis.missedConnectionsCount > 0 ? 'text-amber-400' : 'text-slate-400',
      bgColor: currentKpis.missedConnectionsCount > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-radar-border bg-radar-panel/50',
      delta: baselineKpis ? getDeltaBadge(currentKpis.missedConnectionsCount, baselineKpis.missedConnectionsCount) : null
    },
    {
      label: 'Stranded Passengers',
      value: `${currentKpis.strandedPassengersCount}`,
      sub: currentKpis.strandedPassengersCount > 0 ? 'Overnight stranding risk' : 'Zero stranded',
      icon: Users,
      color: currentKpis.strandedPassengersCount > 0 ? 'text-red-400' : 'text-slate-400',
      bgColor: currentKpis.strandedPassengersCount > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-radar-border bg-radar-panel/50',
      delta: baselineKpis ? getDeltaBadge(currentKpis.strandedPassengersCount, baselineKpis.strandedPassengersCount) : null
    },
    {
      label: 'Crew Duty Violations',
      value: `${currentKpis.crewTimeoutsCount}`,
      sub: currentKpis.crewTimeoutsCount > 0 ? 'DGCA limit exceeded' : 'All compliant',
      icon: UserX,
      color: currentKpis.crewTimeoutsCount > 0 ? 'text-rose-400' : 'text-slate-400',
      bgColor: currentKpis.crewTimeoutsCount > 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-radar-border bg-radar-panel/50',
      delta: baselineKpis ? getDeltaBadge(currentKpis.crewTimeoutsCount, baselineKpis.crewTimeoutsCount) : null
    },
    {
      label: 'Disruption Cost',
      value: formatCurrency(currentKpis.costScore),
      sub: 'Transparent cost index',
      icon: TrendingDown,
      color: currentKpis.costScore > 0 ? 'text-cyan-400' : 'text-slate-400',
      bgColor: currentKpis.costScore > 0 ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-radar-border bg-radar-panel/50',
      delta: baselineKpis ? (
        (() => {
          const diff = currentKpis.costScore - baselineKpis.costScore;
          if (diff === 0) return null;
          const isGood = diff < 0;
          return (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                isGood
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {diff < 0 ? '-' : '+'}{formatCurrency(Math.abs(diff))}
            </span>
          );
        })()
      ) : null
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`border rounded-lg p-3 transition-all duration-200 relative overflow-hidden ${c.bgColor}`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                {c.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${c.color}`} />
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xl font-bold font-mono tracking-tight text-slate-100">
                {c.value}
              </div>
              {c.delta}
            </div>

            <div className="text-[11px] text-slate-400 mt-1 truncate font-mono">
              {c.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
