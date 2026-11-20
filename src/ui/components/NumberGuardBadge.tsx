import React from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { NumberGuardResult } from '../../types';

interface NumberGuardBadgeProps {
  guardResult: NumberGuardResult;
  onToggleTamper: () => void;
  isTampered: boolean;
}

export const NumberGuardBadge: React.FC<NumberGuardBadgeProps> = ({
  guardResult,
  onToggleTamper,
  isTampered
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-radar-bg border border-radar-border font-mono text-xs">
      {/* Verification status */}
      <div className="flex items-center gap-2">
        {guardResult.verified ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">
              Verified by Engine: {guardResult.matchedNumbers}/{guardResult.totalNumbers} numbers match 100%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-rose-400 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="font-bold">
              NUMBER GUARD ALERT: {guardResult.mismatchedNumbers} unverified claim(s) detected & blocked!
            </span>
          </div>
        )}
      </div>

      {/* Trust layer metadata & Tamper toggle */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-slate-400 hidden sm:inline">
          Anti-Hallucination Trust Layer
        </span>
        <button
          onClick={onToggleTamper}
          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition active:scale-95 ${
            isTampered
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              : 'bg-radar-panel text-slate-300 hover:text-white border border-radar-border'
          }`}
          title="Deliberately inject wrong numbers to observe Number Guard catch them"
        >
          {isTampered ? 'Reset AI Tamper' : '⚡ AI Tamper Test'}
        </button>
      </div>
    </div>
  );
};

interface VerifiedTextRendererProps {
  text: string;
  guardResult: NumberGuardResult;
}

export const VerifiedTextRenderer: React.FC<VerifiedTextRendererProps> = ({
  text,
  guardResult
}) => {
  // If tampered and blocked sentences exist, render with red warning blocks
  if (guardResult.isTampered && guardResult.blockedSentences.length > 0) {
    return (
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/60 text-xs font-mono text-red-200">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-red-400">
            <AlertOctagon className="w-4 h-4" />
            <span>NUMBER GUARD INTERCEPTED HALLUCINATIONS:</span>
          </div>
          {guardResult.blockedSentences.map((s, idx) => (
            <p key={idx} className="line-through opacity-75 my-1">
              "{s}"
            </p>
          ))}
          <p className="mt-2 text-[11px] text-emerald-400 font-semibold">
            ✓ Guard automatically blocked hallucinated claims. Showing engine ground-truth:
          </p>
        </div>

        {/* Verified fallback text */}
        <p className="text-xs font-mono text-slate-200 leading-relaxed">
          {guardResult.verifiedText}
        </p>
      </div>
    );
  }

  // Render text with interactive tooltips on numbers
  const numberRegex = /(?<![A-Za-z0-9:])(?:\b|\b₹)(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?!\s*:\s*\d{2})(?!\s*[A-Za-z0-9_-]*\b[A-Z])/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = numberRegex.exec(text)) !== null) {
    const rawNumber = match[0];
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    const matchedCheck = guardResult.checks.find((c) => c.claimedValue === parsed && c.matched);

    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (matchedCheck) {
      parts.push(
        <span
          key={`num-${match.index}`}
          className="inline-flex items-center gap-0.5 px-1 py-0.2 mx-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold cursor-help hover:bg-emerald-500/25 transition group relative"
          title={`Verified by engine: ${matchedCheck.source}`}
        >
          <span>{rawNumber}</span>
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 inline" />
        </span>
      );
    } else {
      parts.push(rawNumber);
    }

    lastIndex = match.index + rawNumber.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <div className="text-xs font-mono text-slate-200 leading-relaxed">
      {parts}
    </div>
  );
};
