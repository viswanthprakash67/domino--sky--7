import React from 'react';
import { X, Sliders, RotateCcw } from 'lucide-react';
import { CostWeights } from '../../types';
import { DEFAULT_COST_WEIGHTS } from '../../engine/engine';

interface CostWeightsModalProps {
  weights: CostWeights;
  cancellationThreshold: number;
  onUpdateWeights: (newWeights: CostWeights) => void;
  onUpdateThreshold: (threshold: number) => void;
  onClose: () => void;
}

export const CostWeightsModal: React.FC<CostWeightsModalProps> = ({
  weights,
  cancellationThreshold,
  onUpdateWeights,
  onUpdateThreshold,
  onClose
}) => {
  const resetToDefault = () => {
    onUpdateWeights(DEFAULT_COST_WEIGHTS);
    onUpdateThreshold(180);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-radar-surface border border-radar-border rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-radar-border flex items-center justify-between bg-radar-panel/80">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wider text-slate-100">
              COST WEIGHTS & THRESHOLD CALIBRATION
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sliders */}
        <div className="p-6 space-y-5">
          {/* Cancellation Threshold */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-slate-300 font-semibold">Automatic Cancellation Delay Threshold</span>
              <span className="text-amber-400 font-bold">{cancellationThreshold} minutes</span>
            </div>
            <input
              type="range"
              min={60}
              max={360}
              step={15}
              value={cancellationThreshold}
              onChange={(e) => onUpdateThreshold(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>60m (Aggressive)</span>
              <span>180m (Default DGCA standard)</span>
              <span>360m (Lenient)</span>
            </div>
          </div>

          <div className="h-px bg-radar-border/80 my-2" />

          {/* Cost Weight Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Delay Cost per Minute</span>
                <span className="text-cyan-400 font-bold">₹{weights.delayPerMinute.toLocaleString('en-IN')}/min</span>
              </div>
              <input
                type="range"
                min={500}
                max={5000}
                step={250}
                value={weights.delayPerMinute}
                onChange={(e) => onUpdateWeights({ ...weights, delayPerMinute: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Cancellation Cost per Flight</span>
                <span className="text-cyan-400 font-bold">₹{weights.cancellationPerFlight.toLocaleString('en-IN')}/flight</span>
              </div>
              <input
                type="range"
                min={100000}
                max={1000000}
                step={50000}
                value={weights.cancellationPerFlight}
                onChange={(e) => onUpdateWeights({ ...weights, cancellationPerFlight: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Stranded Passenger Cost (Overnight Hotel/Care)</span>
                <span className="text-cyan-400 font-bold">₹{weights.strandedPax.toLocaleString('en-IN')}/pax</span>
              </div>
              <input
                type="range"
                min={2000}
                max={25000}
                step={1000}
                value={weights.strandedPax}
                onChange={(e) => onUpdateWeights({ ...weights, strandedPax: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Crew Duty Legal Violation Penalty</span>
                <span className="text-cyan-400 font-bold">₹{weights.crewViolation.toLocaleString('en-IN')}/crew</span>
              </div>
              <input
                type="range"
                min={50000}
                max={500000}
                step={25000}
                value={weights.crewViolation}
                onChange={(e) => onUpdateWeights({ ...weights, crewViolation: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Spare Aircraft Deployment Overhead</span>
                <span className="text-cyan-400 font-bold">₹{weights.spareDeployment.toLocaleString('en-IN')}/use</span>
              </div>
              <input
                type="range"
                min={50000}
                max={500000}
                step={25000}
                value={weights.spareDeployment}
                onChange={(e) => onUpdateWeights({ ...weights, spareDeployment: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Reset button */}
          <div className="pt-2 flex justify-between items-center border-t border-radar-border/80">
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
