import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import defaultRawDataset from './data/defaultDataset.json';
import { loadDataset } from './data/adapter';
import { runSimulation, DEFAULT_COST_WEIGHTS } from './engine/engine';
import { generateRecoveryCandidates } from './engine/recovery';
import { getAIDispatchPlan } from './ai/dispatcher';
import {
  RawDataset,
  AirportClosure,
  RecoveryAction,
  RecoveryCandidate,
  CostWeights,
  AIDispatcherPlan,
  NumberGuardResult
} from './types';

import { Navbar } from './ui/components/Navbar';
import { KPIStrip } from './ui/components/KPIStrip';
import { NetworkMap } from './ui/components/NetworkMap';
import { TimeScrubber } from './ui/components/TimeScrubber';
import { DisruptionController } from './ui/components/DisruptionController';
import { GanttView } from './ui/components/GanttView';
import { FlightTable } from './ui/components/FlightTable';
import { CrewMeters } from './ui/components/CrewMeters';
import { RecoveryDispatcher } from './ui/components/RecoveryDispatcher';
import { DelayDNAModal } from './ui/components/DelayDNAModal';
import { DataHealthModal } from './ui/components/DataHealthModal';
import { CostWeightsModal } from './ui/components/CostWeightsModal';
import { CascadeGraphView } from './ui/components/CascadeGraphView';
import { ATCCommunications } from './ui/components/ATCCommunications';
import { PassengerMiseryIndex } from './ui/components/PassengerMiseryIndex';
import { TimelineComparison } from './ui/components/TimelineComparison';

export const App: React.FC = () => {
  // 1. DATASET STATE
  const [rawDataset, setRawDataset] = useState<RawDataset>(defaultRawDataset as unknown as RawDataset);
  const { dataset, health } = useMemo(() => loadDataset(rawDataset), [rawDataset]);

  // 2. CONFIGURATION & WEIGHTS
  const [costWeights, setCostWeights] = useState<CostWeights>(DEFAULT_COST_WEIGHTS);
  const [cancellationThreshold, setCancellationThreshold] = useState<number>(180);

  // 3. AIRPORT CLOSURES STATE
  const [closures, setClosures] = useState<AirportClosure[]>([]);

  // 4. RECOVERY ACTIONS STATE
  const [appliedActions, setAppliedActions] = useState<RecoveryAction[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RecoveryCandidate | null>(null);

  // 5. AI DISPATCHER & NUMBER GUARD STATE
  const [aiPlan, setAiPlan] = useState<AIDispatcherPlan | null>(null);
  const [guardResult, setGuardResult] = useState<NumberGuardResult | null>(null);
  const [isTampered, setIsTampered] = useState<boolean>(false);

  // 6. TIME SCRUBBER & PLAYBACK STATE
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(840); // 14:00 default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(5);

  // 7. UI SELECTIONS & MODALS
  const [selectedFlightId, setSelectedFlightId] = useState<string | undefined>(undefined);
  const [isDelayDNAModalOpen, setIsDelayDNAModalOpen] = useState<boolean>(false);
  const [isDataHealthModalOpen, setIsDataHealthModalOpen] = useState<boolean>(false);
  const [isCostWeightsModalOpen, setIsCostWeightsModalOpen] = useState<boolean>(false);
  const [bottomTab, setBottomTab] = useState<'gantt' | 'table' | 'dag' | 'timeline' | 'crews'>('gantt');

  // --- DETERMINISTIC SIMULATION RUNS ---
  const baselineResult = useMemo(() => {
    return runSimulation(dataset, closures, {
      cancellationThresholdMinutes: cancellationThreshold,
      costWeights
    });
  }, [dataset, closures, cancellationThreshold, costWeights]);

  const activeResult = useMemo(() => {
    return runSimulation(dataset, closures, {
      cancellationThresholdMinutes: cancellationThreshold,
      appliedActions,
      costWeights
    });
  }, [dataset, closures, cancellationThreshold, appliedActions, costWeights]);

  const candidates = useMemo(() => {
    return generateRecoveryCandidates(dataset, closures, baselineResult, {
      cancellationThresholdMinutes: cancellationThreshold,
      costWeights
    });
  }, [dataset, closures, baselineResult, cancellationThreshold, costWeights]);

  useEffect(() => {
    if (candidates.length > 0) {
      if (!selectedCandidate || !candidates.some((c) => c.id === selectedCandidate.id)) {
        setSelectedCandidate(candidates[0]);
      }
    } else {
      setSelectedCandidate(null);
    }
  }, [candidates]);

  useEffect(() => {
    let isCancelled = false;
    async function updateAI() {
      const activeCand = selectedCandidate || (candidates.length > 0 ? candidates[0] : undefined);
      const res = await getAIDispatchPlan({
        baselineResult,
        candidates: activeCand ? [activeCand, ...candidates.filter(c => c.id !== activeCand.id)] : candidates,
        tamper: isTampered
      });
      if (!isCancelled) {
        setAiPlan(res.plan);
        setGuardResult(res.guardResult);
      }
    }
    updateAI();
    return () => {
      isCancelled = true;
    };
  }, [selectedCandidate, baselineResult, candidates, isTampered]);

  // --- TIME SCRUBBER ANIMATION TICK ---
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeMinutes((prev) => {
        if (prev >= 1439) {
          setIsPlaying(false);
          return 1439;
        }
        return prev + playSpeed;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed]);

  // --- HANDLERS ---
  const handleTriggerDemo = () => {
    const stormClosure: AirportClosure = {
      id: 'BOM_FLAGSHIP_STORM',
      airport: 'BOM',
      start: '14:00',
      end: '15:30',
      startMinutes: 840,
      endMinutes: 930
    };
    setClosures([stormClosure]);
    setAppliedActions([]);
    setIsTampered(false);
    setCurrentTimeMinutes(840);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setClosures([]);
    setAppliedActions([]);
    setSelectedCandidate(null);
    setIsTampered(false);
    setCurrentTimeMinutes(300); // 05:00
    setIsPlaying(false);
    setSelectedFlightId(undefined);
  };

  const handleAddClosure = (closure: AirportClosure) => {
    setClosures((prev) => [...prev, closure]);
  };

  const handleRemoveClosure = (id: string) => {
    setClosures((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearClosures = () => {
    setClosures([]);
  };

  const handleSelectFlight = (flightId: string) => {
    setSelectedFlightId(flightId);
    setIsDelayDNAModalOpen(true);
  };

  const handleApplyCandidate = (cand: RecoveryCandidate) => {
    setAppliedActions(cand.actions);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const selectedFlightObj = useMemo(() => {
    if (!selectedFlightId) return null;
    return activeResult.flightMap.get(selectedFlightId) || null;
  }, [selectedFlightId, activeResult]);

  return (
    <div className="min-h-screen bg-radar-bg text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. TOP NAVIGATION BAR */}
      <Navbar
        onTriggerDemo={handleTriggerDemo}
        onReset={handleReset}
        onOpenDataHealth={() => setIsDataHealthModalOpen(true)}
        onOpenCostWeights={() => setIsCostWeightsModalOpen(true)}
        onToggleTamper={() => setIsTampered((prev) => !prev)}
        isTampered={isTampered}
        activeClosuresCount={closures.length}
        health={health}
      />

      <main className="max-w-7xl w-full mx-auto p-4 space-y-4 flex-1">
        {/* 2. KPI STRIP */}
        <KPIStrip
          currentKpis={activeResult.kpis}
          baselineKpis={appliedActions.length > 0 ? baselineResult.kpis : undefined}
          isDiffMode={appliedActions.length > 0}
        />

        {/* 3. UNIQUE FEATURE: PASSENGER MISERY INDEX & DGCA CAR COMPLIANCE */}
        <PassengerMiseryIndex
          kpis={activeResult.kpis}
          flights={activeResult.flights}
          connections={activeResult.connections}
        />

        {/* 4. MIDDLE SECTION: RADAR MAP, ATC DISPATCH & CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Network Map & Scrubber (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <NetworkMap
              airports={dataset.airports}
              simulatedFlights={activeResult.flights}
              closures={closures}
              currentTimeMinutes={currentTimeMinutes}
              onSelectFlight={handleSelectFlight}
              onSelectAirport={() => {}}
              selectedFlightId={selectedFlightId}
            />

            <TimeScrubber
              currentTimeMinutes={currentTimeMinutes}
              onChangeTime={setCurrentTimeMinutes}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              playSpeed={playSpeed}
              onChangeSpeed={setPlaySpeed}
              closures={closures}
              simulatedFlights={activeResult.flights}
            />
          </div>

          {/* Right Column: ATC Radio, Disruption Injector & Recovery Dispatcher (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* UNIQUE FEATURE: Tactical ATC Voice Communications */}
            <ATCCommunications
              activeClosures={closures}
              currentTimeMinutes={currentTimeMinutes}
              simulatedFlights={activeResult.flights}
            />

            <DisruptionController
              airports={dataset.airports}
              activeClosures={closures}
              onAddClosure={handleAddClosure}
              onRemoveClosure={handleRemoveClosure}
              onClearClosures={handleClearClosures}
            />

            <RecoveryDispatcher
              candidates={candidates}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={setSelectedCandidate}
              onApplyCandidate={handleApplyCandidate}
              isApplied={appliedActions.length > 0}
              baselineKpis={baselineResult.kpis}
              aiPlan={aiPlan}
              guardResult={guardResult}
              onToggleTamper={() => setIsTampered((p) => !p)}
              isTampered={isTampered}
            />
          </div>
        </div>

        {/* 5. BOTTOM SECTION: GANTT / FLIGHT TABLE / CASCADE DAG / TIMELINE / CREW METERS */}
        <div className="space-y-3">
          {/* Bottom Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-radar-border pb-1 font-mono text-xs">
            <button
              onClick={() => setBottomTab('gantt')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                bottomTab === 'gantt'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rotational Gantt Matrix
            </button>
            <button
              onClick={() => setBottomTab('dag')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                bottomTab === 'dag'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⚡ Kinetic Domino DAG (Causal Graph)</span>
            </button>
            <button
              onClick={() => setBottomTab('timeline')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                bottomTab === 'timeline'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌌 Multiverse What-If Timeline</span>
            </button>
            <button
              onClick={() => setBottomTab('table')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                bottomTab === 'table'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Flight Operations Table ({activeResult.flights.length})
            </button>
            <button
              onClick={() => setBottomTab('crews')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                bottomTab === 'crews'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Crew Duty Compliance ({activeResult.crews.length})
            </button>
          </div>

          {/* Active Tab Views */}
          {bottomTab === 'gantt' && (
            <GanttView
              simulatedFlights={activeResult.flights}
              aircraft={dataset.aircraft}
              spares={dataset.spares}
              currentTimeMinutes={currentTimeMinutes}
              onSelectFlight={handleSelectFlight}
              selectedFlightId={selectedFlightId}
            />
          )}

          {bottomTab === 'dag' && (
            <CascadeGraphView
              closures={closures}
              simulatedFlights={activeResult.flights}
              connections={activeResult.connections}
              crews={activeResult.crews}
              onSelectFlight={handleSelectFlight}
              selectedFlightId={selectedFlightId}
            />
          )}

          {bottomTab === 'timeline' && (
            <TimelineComparison
              baselineResult={baselineResult}
              recoveredResult={activeResult}
              selectedCandidate={selectedCandidate}
            />
          )}

          {bottomTab === 'table' && (
            <FlightTable
              simulatedFlights={activeResult.flights}
              onSelectFlight={handleSelectFlight}
              selectedFlightId={selectedFlightId}
            />
          )}

          {bottomTab === 'crews' && (
            <CrewMeters
              crews={activeResult.crews}
            />
          )}
        </div>
      </main>

      {/* 6. MODALS */}
      {isDelayDNAModalOpen && selectedFlightObj && (
        <DelayDNAModal
          flight={selectedFlightObj}
          patientZero={activeResult.patientZero}
          onClose={() => setIsDelayDNAModalOpen(false)}
          onSelectFlight={(fid) => setSelectedFlightId(fid)}
        />
      )}

      {isDataHealthModalOpen && (
        <DataHealthModal
          health={health}
          onClose={() => setIsDataHealthModalOpen(false)}
          onUploadDataset={(newRaw) => setRawDataset(newRaw)}
          onResetDataset={() => setRawDataset(defaultRawDataset as unknown as RawDataset)}
        />
      )}

      {isCostWeightsModalOpen && (
        <CostWeightsModal
          weights={costWeights}
          cancellationThreshold={cancellationThreshold}
          onUpdateWeights={setCostWeights}
          onUpdateThreshold={setCancellationThreshold}
          onClose={() => setIsCostWeightsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
