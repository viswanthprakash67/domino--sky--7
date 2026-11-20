import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Radio, Mic, Wifi } from 'lucide-react';
import { AirportClosure, SimulatedFlight } from '../../types';

interface ATCCommunicationsProps {
  activeClosures: AirportClosure[];
  currentTimeMinutes: number;
  simulatedFlights: SimulatedFlight[];
}

export const ATCCommunications: React.FC<ATCCommunicationsProps> = ({
  activeClosures,
  currentTimeMinutes,
  simulatedFlights
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; channel: string }>>([
    {
      id: 'init-1',
      time: '05:00 IST',
      channel: '121.90 MHz (DEL GND)',
      text: 'DELHI OPERATIONS: Network clear. All 70 domestic legs operating on schedule.'
    }
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenRef = useRef<string>('');

  // Audio squelch beep synthesis using Web Audio API (100% offline)
  const playRadioBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz beep
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // AudioContext unavailable
    }
  };

  const speakTransmission = (text: string, channel: string) => {
    // Add to text log regardless of mute
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setLogs((prev) => [
      { id: `${Date.now()}_${Math.random()}`, time: `${timeStr} IST`, text, channel },
      ...prev.slice(0, 9)
    ]);

    if (isMuted || !('speechSynthesis' in window)) return;

    playRadioBeep();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.volume = 0.9;

    // Pick English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('George') || v.name.includes('Male')));
    if (enVoice) utterance.voice = enVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      playRadioBeep();
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Monitor airport closure triggers to transmit voice announcements
  useEffect(() => {
    if (activeClosures.length > 0) {
      const topClosure = activeClosures[0];
      const key = `${topClosure.airport}_${topClosure.start}_${topClosure.end}`;
      if (lastSpokenRef.current !== key) {
        lastSpokenRef.current = key;
        speakTransmission(
          `PRIORITY NOTAM: ${topClosure.airport} International runway closure in effect from ${topClosure.start} to ${topClosure.end} IST. All departures and arrivals ground-stopped. Cascade knock-on active.`,
          `${topClosure.airport} APP 127.90 MHz`
        );
      }
    }
  }, [activeClosures]);

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-3.5 shadow-lg space-y-2.5 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-radar-border/80 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span>TACTICAL ATC VOICE DISPATCH</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Visualizer Waves */}
          <div className="flex items-center gap-0.5 h-3">
            {[12, 24, 16, 28, 14].map((h, i) => (
              <div
                key={i}
                style={{ height: isSpeaking ? `${h}px` : '4px' }}
                className={`w-1 rounded-full transition-all duration-100 ${
                  isSpeaking ? 'bg-cyan-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1 rounded transition text-xs flex items-center gap-1 px-2 ${
              isMuted
                ? 'bg-slate-800 text-slate-400 hover:text-white'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}
            title={isMuted ? 'Unmute tactical audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="text-[10px]">{isMuted ? 'RADIO MUTED' : 'LIVE RADIO'}</span>
          </button>
        </div>
      </div>

      {/* Latest Transmissions Stream */}
      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 text-[11px]">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-2 rounded bg-radar-bg border border-radar-border/60 text-slate-300 space-y-0.5"
          >
            <div className="flex justify-between text-[9px] text-slate-500">
              <span className="text-cyan-400 font-semibold">{log.channel}</span>
              <span>{log.time}</span>
            </div>
            <p className="leading-snug text-slate-200">{log.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
