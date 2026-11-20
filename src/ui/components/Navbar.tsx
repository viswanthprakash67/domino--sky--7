import React from 'react';
import { Plane, AlertTriangle, ShieldCheck, Database, RefreshCw, Sliders, Zap, ShieldAlert } from 'lucide-react';
import { DatasetHealth } from '../../types';

interface NavbarProps {
  onTriggerDemo: () => void;
  onReset: () => void;
  onOpenDataHealth: () => void;
  onOpenCostWeights: () => void;
  onToggleTamper: () => void;
  isTampered: boolean;
  activeClosuresCount: number;
  health: DatasetHealth;
}

export const Navbar: React.FC<NavbarProps> = ({
  onTriggerDemo,
  onReset,
  onOpenDataHealth,
  onOpenCostWeights,
  onToggleTamper,
  isTampered,
  activeClosuresCount,
  health
}) => {
  return (
    <header className="border-b border-radar-border bg-radar-surface/90 backdrop-blur sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Plane className="w-5 h-5 -rotate-45" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-wider text-slate-100 flex items-center gap-1.5 font-mono">
                DOMINO<span className="text-cyan-400">SKY</span>
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-widest bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded">
                v1.0 ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Flight Disruption Cascade & Deterministic Recovery Simulator
            </p>
          </div>
        </div>

        {/* Center quick scenario & active indicators */}
        <div className="flex items-center gap-2">
          {/* Seeded Demo Scenario Button */}
          <button
            onClick={onTriggerDemo}
            className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-red-500/30 border border-amber-500/50 text-amber-200 text-xs font-medium transition shadow-lg shadow-amber-950/40 active:scale-95"
            title="Load Seeded 2-Minute Demo: Mumbai 90-min Storm at 14:00"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-mono font-semibold">2-Min Demo Scenario</span>
            <span className="hidden md:inline text-[10px] text-amber-300/80 font-mono">(BOM Storm 14:00)</span>
          </button>

          {/* AI Tamper Test Button */}
          <button
            onClick={onToggleTamper}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition active:scale-95 ${
              isTampered
                ? 'bg-red-500/20 border-red-500 text-red-200 animate-pulse'
                : 'bg-radar-panel hover:bg-slate-800 border-radar-border text-slate-300'
            }`}
            title="Inject deliberate wrong number to test Number Guard validator"
          >
            {isTampered ? (
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>AI Tamper Test</span>
            {isTampered && <span className="w-2 h-2 rounded-full bg-red-500" />}
          </button>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2">
          {/* Cost weights configuration */}
          <button
            onClick={onOpenCostWeights}
            className="p-1.5 rounded-md bg-radar-panel hover:bg-slate-800 border border-radar-border text-slate-300 hover:text-white transition"
            title="Customize Cost Weights & Thresholds"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Dataset health */}
          <button
            onClick={onOpenDataHealth}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-radar-panel hover:bg-slate-800 border border-radar-border text-xs font-mono text-slate-300 transition"
            title="View Dataset Health & Adapter Status"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Health: {health.valid ? '100%' : 'Issues'}</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 transition"
            title="Clear all closures and restore clean baseline"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
