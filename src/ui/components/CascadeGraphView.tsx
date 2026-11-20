import React, { useMemo, useState } from 'react';
import { GitCommit, AlertTriangle, ArrowRight, Dna, Plane, Users, XCircle, ShieldAlert } from 'lucide-react';
import { SimulatedFlight, AirportClosure, SimulatedConnection, SimulatedCrew } from '../../types';

interface CascadeGraphViewProps {
  closures: AirportClosure[];
  simulatedFlights: SimulatedFlight[];
  connections: SimulatedConnection[];
  crews: SimulatedCrew[];
  onSelectFlight: (flightId: string) => void;
  selectedFlightId?: string;
}

interface TreeNode {
  id: string;
  type: 'closure' | 'flight' | 'connection' | 'crew';
  title: string;
  subtitle: string;
  delayMins?: number;
  status?: string;
  depth: number;
  parentId?: string;
  children: TreeNode[];
  paxImpacted?: number;
}

export const CascadeGraphView: React.FC<CascadeGraphViewProps> = ({
  closures,
  simulatedFlights,
  connections,
  crews,
  onSelectFlight,
  selectedFlightId
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  // Build the hierarchical causal DAG (Directed Acyclic Graph)
  const graphTree = useMemo(() => {
    if (closures.length === 0) return null;

    const rootClosure = closures[0];
    const rootNode: TreeNode = {
      id: 'root',
      type: 'closure',
      title: `${rootClosure.airport} Airport Disruption (${rootClosure.start}-${rootClosure.end})`,
      subtitle: `Ground stop window: ${rootClosure.endMinutes - rootClosure.startMinutes}m`,
      depth: 0,
      children: []
    };

    // Find Level 1: Flights directly affected at closure airport during window
    const level1Flights = simulatedFlights.filter((sf) => {
      const origMatch =
        sf.flight.origin === rootClosure.airport &&
        sf.scheduledDepMinutes >= rootClosure.startMinutes &&
        sf.scheduledDepMinutes < rootClosure.endMinutes;
      const destMatch =
        sf.flight.destination === rootClosure.airport &&
        sf.scheduledArrMinutes >= rootClosure.startMinutes &&
        sf.scheduledArrMinutes < rootClosure.endMinutes;
      return origMatch || destMatch;
    });

    for (const f1 of level1Flights) {
      const f1Node: TreeNode = {
        id: f1.flight.flight_id,
        type: 'flight',
        title: `${f1.flight.flight_id} (${f1.flight.origin}➔${f1.flight.destination})`,
        subtitle: `Direct Weather Delay: +${f1.delayMinutes}m · Tail ${f1.tail_id}`,
        delayMins: f1.delayMinutes,
        status: f1.status,
        depth: 1,
        parentId: 'root',
        paxImpacted: f1.flight.pax,
        children: []
      };

      // Find Level 2: Downstream flights on the same aircraft rotation
      const downstreamRotation = simulatedFlights.filter(
        (sf) =>
          sf.tail_id === f1.tail_id &&
          sf.scheduledDepMinutes > f1.scheduledDepMinutes &&
          sf.status !== 'ON_TIME'
      );

      for (const f2 of downstreamRotation) {
        const f2Node: TreeNode = {
          id: f2.flight.flight_id,
          type: 'flight',
          title: `${f2.flight.flight_id} (${f2.flight.origin}➔${f2.flight.destination})`,
          subtitle: `Rotational Knock-on: +${f2.delayMinutes}m via ${f2.tail_id}`,
          delayMins: f2.delayMinutes,
          status: f2.status,
          depth: 2,
          parentId: f1.flight.flight_id,
          paxImpacted: f2.flight.pax,
          children: []
        };

        // Find Level 3: Passenger connections broken by f2 or f1
        const brokenConns = connections.filter(
          (c) => c.missed && (c.fromFlightId === f2.flight.flight_id || c.fromFlightId === f1.flight.flight_id)
        );

        for (const cx of brokenConns) {
          f2Node.children.push({
            id: cx.connection.connection_id,
            type: 'connection',
            title: `Missed Connection: ${cx.fromFlightId} ➔ ${cx.toFlightId}`,
            subtitle: `${cx.strandedPax} Stranded Pax at ${cx.connection.airport}`,
            depth: 3,
            parentId: f2.flight.flight_id,
            paxImpacted: cx.strandedPax,
            children: []
          });
        }

        f1Node.children.push(f2Node);
      }

      rootNode.children.push(f1Node);
    }

    return rootNode;
  }, [closures, simulatedFlights, connections]);

  if (!graphTree || closures.length === 0) {
    return (
      <div className="bg-radar-panel border border-radar-border rounded-xl p-8 shadow-lg text-center font-mono">
        <GitCommit className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-300">
          Cascade Dependency Graph Idle
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Inject an airport disruption or run the 2-minute demo scenario to visualize the kinetic branching DAG of knock-on delays.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-4 shadow-lg space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-radar-border pb-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-cyan-400 rotate-90" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            KINETIC DOMINO CASCADE GRAPH (CAUSAL DAG)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Root Trigger
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Primary Held Leg
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> Rotation Knock-On
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Stranded Passengers
          </span>
        </div>
      </div>

      {/* DAG Visualization Tree */}
      <div className="space-y-4 overflow-x-auto py-2">
        {/* Root Node */}
        <div className="p-3.5 rounded-xl bg-red-950/40 border-2 border-red-500/60 max-w-xl shadow-lg shadow-red-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-black">
                PATIENT ZERO TRIGGER
              </span>
              <strong className="text-red-200 text-xs">{graphTree.title}</strong>
            </div>
            <span className="text-[10px] text-red-300 font-semibold">{graphTree.subtitle}</span>
          </div>
        </div>

        {/* Level 1 Direct Branches */}
        <div className="pl-6 border-l-2 border-dashed border-red-500/40 space-y-4">
          {graphTree.children.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No flights scheduled during this closure window.</p>
          ) : (
            graphTree.children.map((lvl1) => (
              <div key={lvl1.id} className="space-y-3">
                {/* Level 1 Card */}
                <div
                  onClick={() => onSelectFlight(lvl1.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition max-w-lg flex items-center justify-between gap-3 ${
                    selectedFlightId === lvl1.id
                      ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-radar-bg border-amber-500/40 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <div>
                      <strong className="text-amber-200 text-xs">{lvl1.title}</strong>
                      <p className="text-[10px] text-slate-400">{lvl1.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-300">+{lvl1.delayMins}m</span>
                    <span className="text-[10px] text-slate-500 block">{lvl1.paxImpacted} pax</span>
                  </div>
                </div>

                {/* Level 2 Downstream Rotation Knock-Ons */}
                {lvl1.children.length > 0 && (
                  <div className="pl-6 border-l-2 border-cyan-500/30 space-y-2.5">
                    {lvl1.children.map((lvl2) => (
                      <div key={lvl2.id} className="space-y-2">
                        <div
                          onClick={() => onSelectFlight(lvl2.id)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition max-w-md flex items-center justify-between gap-2 ${
                            selectedFlightId === lvl2.id
                              ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/40'
                              : 'bg-radar-bg border-radar-border hover:border-cyan-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Plane className="w-3.5 h-3.5 text-cyan-400" />
                            <div>
                              <strong className="text-slate-200 text-xs">{lvl2.title}</strong>
                              <p className="text-[10px] text-slate-400">{lvl2.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-cyan-300">+{lvl2.delayMins}m</span>
                        </div>

                        {/* Level 3 Stranded Connections */}
                        {lvl2.children.length > 0 && (
                          <div className="pl-6 border-l-2 border-rose-500/30 space-y-1.5">
                            {lvl2.children.map((lvl3) => (
                              <div
                                key={lvl3.id}
                                className="p-2 rounded bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-200 max-w-sm flex items-center justify-between"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-rose-400" />
                                  <span>{lvl3.title}</span>
                                </div>
                                <strong className="text-rose-300">+{lvl3.paxImpacted} Stranded Pax</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
