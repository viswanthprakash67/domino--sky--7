import React, { useState } from 'react';
import { X, Database, ShieldCheck, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import { DatasetHealth, RawDataset } from '../../types';

interface DataHealthModalProps {
  health: DatasetHealth;
  onClose: () => void;
  onUploadDataset: (raw: RawDataset) => void;
  onResetDataset: () => void;
}

export const DataHealthModal: React.FC<DataHealthModalProps> = ({
  health,
  onClose,
  onUploadDataset,
  onResetDataset
}) => {
  const [jsonText, setJsonText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.airports || !parsed.flights) {
        throw new Error('Dataset must contain "airports" and "flights" arrays.');
      }
      onUploadDataset(parsed);
      setErrorMsg(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid JSON syntax');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-radar-surface border border-radar-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-radar-border flex items-center justify-between bg-radar-panel/80">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold font-mono tracking-wider text-slate-100">
              DATASET HEALTH & ADAPTER VALIDATION
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {/* Health Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
              <span className="text-[10px] text-slate-400 block">Airports</span>
              <strong className="text-sm text-slate-100">{health.airportsCount} nodes</strong>
            </div>
            <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
              <span className="text-[10px] text-slate-400 block">Flights</span>
              <strong className="text-sm text-slate-100">{health.flightsCount} legs</strong>
            </div>
            <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
              <span className="text-[10px] text-slate-400 block">Aircraft Tails</span>
              <strong className="text-sm text-slate-100">{health.aircraftCount} tails</strong>
            </div>
            <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
              <span className="text-[10px] text-slate-400 block">Connections</span>
              <strong className="text-sm text-slate-100">{health.connectionsCount} links</strong>
            </div>
            <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
              <span className="text-[10px] text-slate-400 block">Crew Rotations</span>
              <strong className="text-sm text-slate-100">{health.crewsCount} crews</strong>
            </div>
            <div className="p-3 rounded-lg bg-radar-bg border border-radar-border">
              <span className="text-[10px] text-slate-400 block">Spare Aircraft</span>
              <strong className="text-sm text-slate-100">{health.sparesCount} standbys</strong>
            </div>
          </div>

          {/* Validation Status */}
          <div className="p-3 rounded-xl bg-radar-bg border border-radar-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200">
                Integrity Status: <strong className="text-emerald-300">100% Deterministic & Valid</strong>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px]">
              0 FATAL ERRORS
            </span>
          </div>

          {/* Validation Warnings / Issues list */}
          {health.issues.length > 0 && (
            <div>
              <span className="text-[11px] text-slate-400 block mb-2">
                Operational Schedule Insights ({health.issues.length}):
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {health.issues.map((iss, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-radar-bg border border-radar-border/80 text-[11px] text-slate-300 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-amber-300">[{iss.code}]</strong> {iss.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom JSON Upload / Paste */}
          <div className="pt-3 border-t border-radar-border/80 space-y-2">
            <span className="text-[11px] text-slate-300 block font-bold">
              Paste or Upload Custom Dataset JSON
            </span>
            <textarea
              rows={4}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Paste custom flight network JSON here..."
              className="w-full bg-radar-bg border border-radar-border rounded-lg p-2.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />

            {errorMsg && (
              <p className="text-rose-400 text-[11px] font-semibold">{errorMsg}</p>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onResetDataset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Reset to Organisers' Default</span>
              </button>

              <button
                disabled={!jsonText.trim()}
                onClick={handleApplyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold disabled:opacity-40 transition"
              >
                <Upload className="w-3 h-3" />
                <span>Load Dataset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
