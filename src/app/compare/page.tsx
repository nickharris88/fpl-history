'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Search, GitCompare, X } from 'lucide-react';
import ChartWrapper from '@/components/ChartWrapper';
import PositionBadge from '@/components/PositionBadge';
import { parseDisambiguatedName } from '@/lib/playerName';

interface PlayerIndex {
  name: string;
  seasons: string[];
  positions: string[];
  primaryPosition: string;
  total_points: number;
  goals: number;
  assists: number;
}

interface ProfileIndex { name: string; chunk: number; }

interface SeasonStats {
  season: string;
  total_points: number;
  goals: number;
  assists: number;
  minutes: number;
  clean_sheets: number;
  bonus: number;
  ict_index: number;
  creativity: number;
  influence: number;
  threat: number;
}

interface PlayerProfile {
  name: string;
  career: {
    total_points: number;
    goals: number;
    assists: number;
    minutes: number;
    clean_sheets: number;
    bonus: number;
    seasonCount: number;
    positions: string[];
  };
  seasons: SeasonStats[];
}

const COLORS = ['#00ff87', '#963cff', '#04f5ff'];
const DEFAULT_PLAYERS = ['Mohamed Salah', 'Harry Kane', 'Kevin De Bruyne'];

export default function ComparePage() {
  const [searchIndex, setSearchIndex] = useState<PlayerIndex[]>([]);
  const [profileIndex, setProfileIndex] = useState<ProfileIndex[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [search, setSearch] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/search-index.json').then(r => r.json()),
      fetch('/data/profile-index.json').then(r => r.json()),
    ]).then(([s, p]) => {
      setSearchIndex(s);
      setProfileIndex(p);

      // Auto-load default comparison
      const defaults = DEFAULT_PLAYERS.filter(name => p.find((e: ProfileIndex) => e.name === name));
      if (defaults.length > 0) {
        setSelected(defaults);
        const chunksNeeded = new Map<number, string[]>();
        defaults.forEach(name => {
          const entry = p.find((e: ProfileIndex) => e.name === name);
          if (entry) {
            if (!chunksNeeded.has(entry.chunk)) chunksNeeded.set(entry.chunk, []);
            chunksNeeded.get(entry.chunk)!.push(name);
          }
        });
        Promise.all(
          Array.from(chunksNeeded.entries()).map(([chunk]) =>
            fetch(`/data/profiles-${chunk}.json`).then(r => r.json())
          )
        ).then(results => {
          const merged: Record<string, PlayerProfile> = {};
          for (const data of results) {
            for (const name of defaults) {
              if (data[name]) merged[name] = data[name];
            }
          }
          setProfiles(merged);
        });
      }
    });
  }, []);

  const addPlayer = async (name: string) => {
    if (selected.includes(name)) return;
    if (selected.length >= 3) {
      setWarning('Maximum 3 players. Remove one to add another.');
      setTimeout(() => setWarning(null), 3000);
      return;
    }
    setSelected(prev => [...prev, name]);
    setSearch('');

    if (!profiles[name]) {
      const entry = profileIndex.find(e => e.name === name);
      if (entry) {
        const data = await fetch(`/data/profiles-${entry.chunk}.json`).then(r => r.json());
        if (data[name]) {
          setProfiles(prev => ({ ...prev, [name]: data[name] }));
        }
      }
    }
  };

  const removePlayer = (name: string) => {
    setSelected(prev => prev.filter(n => n !== name));
  };

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return searchIndex
      .filter(p => p.name.toLowerCase().includes(q) && !selected.includes(p.name))
      .slice(0, 8);
  }, [search, searchIndex, selected]);

  // Build comparison data
  const selectedProfiles = selected.map(name => profiles[name]).filter(Boolean);

  const careerComparison = selectedProfiles.length > 0 ? [
    { stat: 'Points', ...Object.fromEntries(selectedProfiles.map(p => [p.name, p.career.total_points])) },
    { stat: 'Goals', ...Object.fromEntries(selectedProfiles.map(p => [p.name, p.career.goals])) },
    { stat: 'Assists', ...Object.fromEntries(selectedProfiles.map(p => [p.name, p.career.assists])) },
    { stat: 'Clean Sheets', ...Object.fromEntries(selectedProfiles.map(p => [p.name, p.career.clean_sheets])) },
    { stat: 'Bonus', ...Object.fromEntries(selectedProfiles.map(p => [p.name, p.career.bonus])) },
  ] : [];

  // Season-by-season points
  const allSeasons = Array.from(new Set(selectedProfiles.flatMap(p => p.seasons.map(s => s.season)))).sort();
  const seasonPoints = allSeasons.map(season => {
    const row: Record<string, string | number | null> = { season };
    selectedProfiles.forEach(p => {
      const s = p.seasons.find(s => s.season === season);
      // Use null (not 0) for "didn't play" so the bar disappears entirely
      row[p.name] = s ? s.total_points : null;
    });
    return row;
  });

  // Radar comparison (latest common stats)
  const radarData = selectedProfiles.length > 0 ? (() => {
    const maxes = { goals: 1, assists: 1, clean_sheets: 1, bonus: 1, total_points: 1 };
    selectedProfiles.forEach(p => {
      maxes.goals = Math.max(maxes.goals, p.career.goals);
      maxes.assists = Math.max(maxes.assists, p.career.assists);
      maxes.clean_sheets = Math.max(maxes.clean_sheets, p.career.clean_sheets);
      maxes.bonus = Math.max(maxes.bonus, p.career.bonus);
      maxes.total_points = Math.max(maxes.total_points, p.career.total_points);
    });
    return [
      { stat: 'Points', ...Object.fromEntries(selectedProfiles.map(p => [p.name, Math.round((p.career.total_points / maxes.total_points) * 100)])) },
      { stat: 'Goals', ...Object.fromEntries(selectedProfiles.map(p => [p.name, Math.round((p.career.goals / maxes.goals) * 100)])) },
      { stat: 'Assists', ...Object.fromEntries(selectedProfiles.map(p => [p.name, Math.round((p.career.assists / maxes.assists) * 100)])) },
      { stat: 'CS', ...Object.fromEntries(selectedProfiles.map(p => [p.name, Math.round((p.career.clean_sheets / maxes.clean_sheets) * 100)])) },
      { stat: 'Bonus', ...Object.fromEntries(selectedProfiles.map(p => [p.name, Math.round((p.career.bonus / maxes.bonus) * 100)])) },
    ];
  })() : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">
        <span className="gradient-text">Compare Players</span>
      </h1>
      <p className="text-muted mb-6">Select up to 3 players for head-to-head comparison.</p>

      {warning && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm animate-fade-in">
          {warning}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search for a player to add..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            {suggestions.map(p => {
              const { displayName, team } = parseDisambiguatedName(p.name);
              return (
                <button
                  key={p.name}
                  onClick={() => addPlayer(p.name)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-card-hover transition-colors text-left"
                >
                  <div>
                    <span className="text-sm font-medium">{displayName}</span>
                    {team && <span className="text-[10px] px-1.5 py-0.5 rounded bg-card-hover text-muted ml-1.5">{team}</span>}
                    <span className="text-xs text-muted ml-2">{p.total_points} pts</span>
                  </div>
                  <div className="flex gap-1">
                    <PositionBadge position={p.primaryPosition || p.positions[0]} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Players */}
      <div className="flex flex-wrap gap-3 mb-8">
        {selected.map((name, i) => (
          <div
            key={name}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
            style={{ borderColor: COLORS[i], backgroundColor: `${COLORS[i]}15` }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
            <span className="text-sm font-medium">{parseDisambiguatedName(name).displayName}</span>
            <button onClick={() => removePlayer(name)} className="ml-1 text-muted hover:text-danger transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
        {selected.length === 0 && (
          <div className="flex items-center gap-2 text-muted text-sm py-4">
            <GitCompare size={20} />
            <span>Search and add players above to start comparing</span>
          </div>
        )}
      </div>

      {selectedProfiles.length >= 2 && (
        <>
          {/* Career Comparison Bar */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <ChartWrapper title="Career Stats Comparison">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={careerComparison}>
                  <XAxis dataKey="stat" />
                  <YAxis />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                  <Legend />
                  {selectedProfiles.map((p, i) => (
                    <Bar key={p.name} dataKey={p.name} name={parseDisambiguatedName(p.name).displayName} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <ChartWrapper title="Radar Comparison" subtitle="Normalized to best performer = 100">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#2a2a4a" />
                  <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: '#8888aa' }} />
                  <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
                  {selectedProfiles.map((p, i) => (
                    <Radar key={p.name} dataKey={p.name} name={parseDisambiguatedName(p.name).displayName} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          {/* Season Points */}
          <ChartWrapper title="Points by Season" subtitle="Head-to-head season comparison" className="mb-8">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seasonPoints}>
                <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                <Legend />
                {selectedProfiles.map((p, i) => (
                  <Bar key={p.name} dataKey={p.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* Stats Table */}
          <ChartWrapper title="Head-to-Head Stats" className="mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                    <th className="px-3 py-2">Stat</th>
                    {selectedProfiles.map((p, i) => (
                      <th key={p.name} className="px-3 py-2" style={{ color: COLORS[i] }}>{parseDisambiguatedName(p.name).displayName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Seasons', (p: PlayerProfile) => p.career.seasonCount],
                    ['Total Points', (p: PlayerProfile) => p.career.total_points.toLocaleString()],
                    ['Goals', (p: PlayerProfile) => p.career.goals],
                    ['Assists', (p: PlayerProfile) => p.career.assists],
                    ['Clean Sheets', (p: PlayerProfile) => p.career.clean_sheets],
                    ['Bonus', (p: PlayerProfile) => p.career.bonus],
                    ['Minutes', (p: PlayerProfile) => p.career.minutes.toLocaleString()],
                    ['Positions', (p: PlayerProfile) => p.career.positions.join(', ')],
                  ].map(([label, fn]) => (
                    <tr key={label as string} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                      <td className="px-3 py-2 text-muted">{label as string}</td>
                      {selectedProfiles.map(p => (
                        <td key={p.name} className="px-3 py-2 font-mono">
                          {(fn as (p: PlayerProfile) => string | number)(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartWrapper>
        </>
      )}
    </div>
  );
}
