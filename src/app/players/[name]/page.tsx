'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from 'recharts';
import { ArrowLeft, Trophy, Target, Zap, Clock, Star } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartWrapper from '@/components/ChartWrapper';
import PositionBadge from '@/components/PositionBadge';

interface SeasonStats {
  season: string;
  total_points: number;
  goals: number;
  assists: number;
  minutes: number;
  clean_sheets: number;
  bonus: number;
  position: string;
  cost: number;
  ict_index: number;
  creativity: number;
  influence: number;
  threat: number;
}

interface GWEntry {
  season: string;
  gw: number;
  pts: number;
  min: number;
  g: number;
  a: number;
  cs: number;
  bonus: number;
  team: string;
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
    ppg: number;
  };
  seasons: SeasonStats[];
  gameweeks: GWEntry[];
}

interface ProfileIndex { name: string; chunk: number; }

export default function PlayerProfilePage() {
  const params = useParams();
  const playerName = decodeURIComponent(params.name as string);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/profile-index.json')
      .then(r => r.json())
      .then((index: ProfileIndex[]) => {
        const entry = index.find(e => e.name === playerName);
        if (!entry) { setLoading(false); return; }
        return fetch(`/data/profiles-${entry.chunk}.json`).then(r => r.json());
      })
      .then(data => {
        if (data && data[playerName]) {
          setProfile(data[playerName]);
          setSelectedSeason(data[playerName].seasons[data[playerName].seasons.length - 1]?.season || null);
        }
        setLoading(false);
      });
  }, [playerName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse text-accent text-lg">Loading player...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p className="text-muted text-lg mb-4">Player not found in top 300 profiles.</p>
        <Link href="/players" className="text-accent hover:underline">Back to players</Link>
      </div>
    );
  }

  const { career, seasons, gameweeks } = profile;
  const seasonGws = selectedSeason ? gameweeks.filter(g => g.season === selectedSeason) : gameweeks;

  // Radar data (normalize to 100-scale)
  const latestSeason = seasons[seasons.length - 1];
  const maxVals = { creativity: 1200, influence: 1200, threat: 1200, ict_index: 400, bonus: 40 };
  const radarData = latestSeason ? [
    { stat: 'Creativity', value: Math.min(100, (latestSeason.creativity / maxVals.creativity) * 100) },
    { stat: 'Influence', value: Math.min(100, (latestSeason.influence / maxVals.influence) * 100) },
    { stat: 'Threat', value: Math.min(100, (latestSeason.threat / maxVals.threat) * 100) },
    { stat: 'ICT', value: Math.min(100, (latestSeason.ict_index / maxVals.ict_index) * 100) },
    { stat: 'Bonus', value: Math.min(100, (latestSeason.bonus / maxVals.bonus) * 100) },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/players" className="inline-flex items-center gap-1 text-muted hover:text-accent text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to players
      </Link>

      {/* Header */}
      <div className="glass rounded-xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-background">
              {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{profile.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {career.positions.map(pos => <PositionBadge key={pos} position={pos} />)}
              <span className="text-muted text-sm">· {career.seasonCount} seasons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Career Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Career Points" value={career.total_points.toLocaleString()} icon={<Trophy size={18} />} />
        <StatCard label="Goals" value={career.goals} icon={<Target size={18} />} />
        <StatCard label="Assists" value={career.assists} icon={<Zap size={18} />} />
        <StatCard label="Minutes" value={career.minutes.toLocaleString()} icon={<Clock size={18} />} />
        <StatCard label="Bonus" value={career.bonus} icon={<Star size={18} />} />
      </div>

      {/* Season-by-Season Chart */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ChartWrapper title="Points by Season" subtitle="Total FPL points each season">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={seasons}>
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
              <Bar dataKey="total_points" fill="#00ff87" radius={[4, 4, 0, 0]} name="Points" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Goals & Assists by Season">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={seasons}>
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
              <Bar dataKey="goals" fill="#04f5ff" radius={[4, 4, 0, 0]} name="Goals" />
              <Bar dataKey="assists" fill="#963cff" radius={[4, 4, 0, 0]} name="Assists" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Radar + GW Line */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {radarData.length > 0 && (
          <ChartWrapper title="Player Profile Radar" subtitle={`Latest season: ${latestSeason.season}`}>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a2a4a" />
                <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11, fill: '#8888aa' }} />
                <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
                <Radar dataKey="value" stroke="#00ff87" fill="#00ff87" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        )}

        <ChartWrapper title="Gameweek Points" subtitle="Select a season to view GW-by-GW performance">
          <div className="flex flex-wrap gap-1 mb-3">
            {seasons.map(s => (
              <button
                key={s.season}
                onClick={() => setSelectedSeason(s.season)}
                className={`px-2 py-1 rounded text-xs border transition-all ${
                  selectedSeason === s.season
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-card border-border text-muted hover:text-foreground'
                }`}
              >
                {s.season}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={seasonGws}>
              <XAxis dataKey="gw" />
              <YAxis />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                formatter={(value, name) => [String(value), name === 'pts' ? 'Points' : String(name)]}
              />
              <defs>
                <linearGradient id="gwPtsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#963cff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#963cff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="pts" stroke="#963cff" fill="url(#gwPtsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Season Breakdown Table */}
      <ChartWrapper title="Season Breakdown" className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                <th className="px-3 py-2">Season</th>
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Pts</th>
                <th className="px-3 py-2">Goals</th>
                <th className="px-3 py-2">Assists</th>
                <th className="px-3 py-2">Mins</th>
                <th className="px-3 py-2">CS</th>
                <th className="px-3 py-2">Bonus</th>
                <th className="px-3 py-2">ICT</th>
                <th className="px-3 py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map(s => (
                <tr key={s.season} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="px-3 py-2 font-medium">{s.season}</td>
                  <td className="px-3 py-2"><PositionBadge position={s.position} /></td>
                  <td className="px-3 py-2 font-mono text-accent">{s.total_points}</td>
                  <td className="px-3 py-2">{s.goals}</td>
                  <td className="px-3 py-2">{s.assists}</td>
                  <td className="px-3 py-2">{s.minutes.toLocaleString()}</td>
                  <td className="px-3 py-2">{s.clean_sheets}</td>
                  <td className="px-3 py-2">{s.bonus}</td>
                  <td className="px-3 py-2">{s.ict_index}</td>
                  <td className="px-3 py-2">{s.cost > 0 ? `£${s.cost}m` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartWrapper>
    </div>
  );
}
