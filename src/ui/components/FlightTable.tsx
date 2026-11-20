import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Dna, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { SimulatedFlight } from '../../types';

interface FlightTableProps {
  simulatedFlights: SimulatedFlight[];
  onSelectFlight: (flightId: string) => void;
  selectedFlightId?: string;
}

type SortField = 'flight_id' | 'origin' | 'destination' | 'scheduledDepMinutes' | 'delayMinutes' | 'status';
type SortOrder = 'asc' | 'desc';

export const FlightTable: React.FC<FlightTableProps> = ({
  simulatedFlights,
  onSelectFlight,
  selectedFlightId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELAYED' | 'CANCELLED' | 'ON_TIME'>('ALL');
  const [sortField, setSortField] = useState<SortField>('delayMinutes');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    return simulatedFlights
      .filter((sf) => {
        // Status filter
        if (statusFilter !== 'ALL' && sf.status !== statusFilter) {
          return false;
        }
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchFlight = sf.flight.flight_id.toLowerCase().includes(q);
          const matchOrigin = sf.flight.origin.toLowerCase().includes(q);
          const matchDest = sf.flight.destination.toLowerCase().includes(q);
          const matchTail = sf.tail_id.toLowerCase().includes(q);
          const matchCrew = sf.crew_id.toLowerCase().includes(q);
          return matchFlight || matchOrigin || matchDest || matchTail || matchCrew;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof SimulatedFlight];
        let valB: any = b[sortField as keyof SimulatedFlight];

        if (sortField === 'origin') {
          valA = a.flight.origin;
          valB = b.flight.origin;
        } else if (sortField === 'destination') {
          valA = a.flight.destination;
          valB = b.flight.destination;
        } else if (sortField === 'flight_id') {
          valA = a.flight.flight_id;
          valB = b.flight.flight_id;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [simulatedFlights, statusFilter, searchTerm, sortField, sortOrder]);

  const counts = useMemo(() => {
    return {
      all: simulatedFlights.length,
      delayed: simulatedFlights.filter((f) => f.status === 'DELAYED').length,
      cancelled: simulatedFlights.filter((f) => f.status === 'CANCELLED').length,
      onTime: simulatedFlights.filter((f) => f.status === 'ON_TIME').length
    };
  }, [simulatedFlights]);

  return (
    <div className="bg-radar-panel border border-radar-border rounded-xl p-4 shadow-lg space-y-3 flex flex-col">
      {/* Table Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-radar-bg border border-radar-border rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'ALL'
                ? 'bg-slate-700 text-slate-100 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('DELAYED')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'DELAYED'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Delayed ({counts.delayed})
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'CANCELLED'
                ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cancelled ({counts.cancelled})
          </button>
          <button
            onClick={() => setStatusFilter('ON_TIME')}
            className={`px-3 py-1 rounded transition ${
              statusFilter === 'ON_TIME'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            On-Time ({counts.onTime})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search flight, route, tail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-radar-bg border border-radar-border rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-radar-border/80 rounded-lg">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead className="bg-radar-bg sticky top-0 z-10 text-slate-400 border-b border-radar-border select-none">
            <tr>
              <th className="py-2 px-3 font-semibold cursor-pointer" onClick={() => handleSort('flight_id')}>
                <div className="flex items-center gap-1">
                  <span>Flight</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="py-2 px-3 font-semibold">Route</th>
              <th className="py-2 px-3 font-semibold">Aircraft Tail</th>
              <th className="py-2 px-3 font-semibold cursor-pointer" onClick={() => handleSort('scheduledDepMinutes')}>
                <div className="flex items-center gap-1">
                  <span>Sched Dep/Arr</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="py-2 px-3 font-semibold">Actual Dep/Arr</th>
              <th className="py-2 px-3 font-semibold cursor-pointer" onClick={() => handleSort('delayMinutes')}>
                <div className="flex items-center gap-1">
                  <span>Delay</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="py-2 px-3 font-semibold cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="py-2 px-3 font-semibold">Root Cause Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-radar-border/50">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  No flights match current filter.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((sf) => {
                const isSelected = sf.flight.flight_id === selectedFlightId;
                const isCancelled = sf.status === 'CANCELLED';

                return (
                  <tr
                    key={sf.flight.flight_id}
                    onClick={() => onSelectFlight(sf.flight.flight_id)}
                    className={`hover:bg-slate-800/50 cursor-pointer transition ${
                      isSelected ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    {/* Flight ID */}
                    <td className="py-2 px-3 font-bold text-slate-200">
                      {sf.flight.flight_id}
                    </td>

                    {/* Route */}
                    <td className="py-2 px-3 text-slate-300">
                      <span>{sf.flight.origin}</span>
                      <span className="text-slate-500 mx-1">➔</span>
                      <span>{sf.flight.destination}</span>
                    </td>

                    {/* Tail */}
                    <td className="py-2 px-3 text-slate-400">
                      {sf.tail_id}
                    </td>

                    {/* Sched */}
                    <td className="py-2 px-3 text-slate-400">
                      {sf.flight.dep} – {sf.flight.arr}
                    </td>

                    {/* Actual */}
                    <td className="py-2 px-3">
                      {isCancelled ? (
                        <span className="text-slate-500 line-through">--:-- – --:--</span>
                      ) : (
                        <span className={sf.delayMinutes > 0 ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                          {sf.actualDep} – {sf.actualArr}
                        </span>
                      )}
                    </td>

                    {/* Delay */}
                    <td className="py-2 px-3">
                      {isCancelled ? (
                        <span className="text-red-400 font-bold">CANCELLED</span>
                      ) : sf.delayMinutes > 0 ? (
                        <span className={`font-bold ${sf.delayMinutes >= 60 ? 'text-red-400' : 'text-amber-400'}`}>
                          +{sf.delayMinutes}m
                        </span>
                      ) : (
                        <span className="text-emerald-400">On-Time</span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCancelled
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : sf.delayMinutes >= 60
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : sf.delayMinutes > 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {sf.status}
                      </span>
                    </td>

                    {/* Root Cause Action */}
                    <td className="py-2 px-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFlight(sf.flight.flight_id);
                        }}
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        <Dna className="w-3 h-3" />
                        <span>Inspect DNA</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
