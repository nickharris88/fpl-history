'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Users, X } from 'lucide-react';
import PositionBadge from '@/components/PositionBadge';
import { parseDisambiguatedName, profileHref } from '@/lib/playerName';

interface PlayerIndex {
  name: string;
  seasons: string[];
  positions: string[];
  primaryPosition: string;
  total_points: number;
  goals: number;
  assists: number;
  clean_sheets: number;
}

function getSecondaryStats(p: PlayerIndex) {
  const pos = p.primaryPosition;
  if (pos === 'GKP') return [
    { label: 'Points', value: p.total_points.toLocaleString() },
    { label: 'Clean Sheets', value: p.clean_sheets },
    { label: 'Assists', value: p.assists },
  ];
  if (pos === 'DEF') return [
    { label: 'Points', value: p.total_points.toLocaleString() },
    { label: 'Clean Sheets', value: p.clean_sheets },
    { label: 'Goals', value: p.goals },
  ];
  if (pos === 'FWD') return [
    { label: 'Points', value: p.total_points.toLocaleString() },
    { label: 'Goals', value: p.goals },
    { label: 'Assists', value: p.assists },
  ];
  // MID default
  return [
    { label: 'Points', value: p.total_points.toLocaleString() },
    { label: 'Goals', value: p.goals },
    { label: 'Assists', value: p.assists },
  ];
}

function PlayersPageInner() {
  const searchParams = useSearchParams();
  const [players, setPlayers] = useState<PlayerIndex[]>([]);
  const [search, setSearch] = useState(searchParams?.get('q') || '');
  const [posFilter, setPosFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'total_points' | 'goals' | 'assists' | 'clean_sheets'>('total_points');

  useEffect(() => {
    fetch('/data/search-index.json').then(r => r.json()).then(setPlayers);
  }, []);

  const filtersActive = search !== '' || posFilter !== 'ALL' || sortBy !== 'total_points';
  const resetFilters = () => { setSearch(''); setPosFilter('ALL'); setSortBy('total_points'); };

  const filtered = players
    .filter(p => {
      if (posFilter !== 'ALL' && !p.positions.includes(posFilter)) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">
        <span className="gradient-text">Player Search</span>
      </h1>
      <p className="text-muted mb-6">Browse and search all 2,600+ players from 9 seasons of FPL history.</p>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                posFilter === pos
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-card border-border text-muted hover:text-foreground'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-muted text-sm">Sort by:</span>
        {([['total_points', 'Points'], ['goals', 'Goals'], ['assists', 'Assists'], ['clean_sheets', 'Clean Sheets']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
              sortBy === key
                ? 'bg-purple/15 text-purple border-purple/30'
                : 'bg-card border-border text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-muted text-xs">{filtered.length} players found</p>
        {filtersActive && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
          >
            <X size={12} /> Reset filters
          </button>
        )}
      </div>

      {/* Player Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.slice(0, 60).map((p, i) => {
          const { displayName, team } = parseDisambiguatedName(p.name);
          const stats = getSecondaryStats(p);
          return (
            <Link
              key={p.name}
              href={profileHref(p.name)}
              className="glass rounded-xl p-4 hover:bg-card-hover hover:border-accent/20 transition-all group animate-fade-in"
              style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-accent transition-colors">{displayName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-muted">{p.seasons.length} season{p.seasons.length !== 1 ? 's' : ''}</p>
                    {team && (
                      <span className="text-xs text-muted/60 bg-card-hover px-1.5 py-0.5 rounded border border-border/50">{team}</span>
                    )}
                  </div>
                </div>
                <PositionBadge position={p.primaryPosition || p.positions[0]} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {stats.map(s => (
                  <div key={s.label}>
                    <p className="text-xs text-muted">{s.label}</p>
                    <p className="font-mono text-sm text-accent">{s.value}</p>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length > 60 && (
        <p className="text-center text-muted text-sm mt-6">
          Showing 60 of {filtered.length} players. Use search to narrow results.
        </p>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Users size={48} className="text-muted mx-auto mb-4" />
          <p className="text-muted">No players found matching your search.</p>
        </div>
      )}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-muted">Loading…</div>}>
      <PlayersPageInner />
    </Suspense>
  );
}
