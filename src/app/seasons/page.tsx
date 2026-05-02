'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Trophy, Target, Zap } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartWrapper from '@/components/ChartWrapper';
import SeasonSelector from '@/components/SeasonSelector';
import DataTable from '@/components/DataTable';
import PositionBadge from '@/components/PositionBadge';
import Link from 'next/link';
import { parseDisambiguatedName, profileHref } from '@/lib/playerName';
import { useSharedSeason } from '@/lib/seasonContext';

interface Player {
  name: string;
  position: string;
  total_points: number;
  goals: number;
  assists: number;
  minutes: number;
  clean_sheets: number;
  bonus: number;
  ict_index: number;
  cost: number;
  creativity: number;
  influence: number;
  threat: number;
}

interface BestXIPlayer {
  name: string;
  position: string;
  points: number;
  goals: number;
  assists: number;
}

interface BestXI {
  gkp: BestXIPlayer[];
  def: BestXIPlayer[];
  mid: BestXIPlayer[];
  fwd: BestXIPlayer[];
}

interface GWAvg {
  gw: number;
  avgPoints: number;
  totalGoals: number;
  totalAssists: number;
  playerCount: number;
  highScore: number;
  topPlayer: string;
}

export default function SeasonsPage() {
  const [season, setSeason] = useSharedSeason();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gwData, setGwData] = useState<GWAvg[]>([]);
  const [bestXI, setBestXI] = useState<BestXI | null>(null);
  const [posFilter, setPosFilter] = useState('ALL');

  useEffect(() => {
    Promise.all([
      fetch(`/data/players-${season}.json`).then(r => r.json()),
      fetch(`/data/gw-${season}.json`).then(r => r.json()),
      fetch('/data/best-xi.json').then(r => r.json()),
    ]).then(([p, g, xi]) => {
      setPlayers(p);
      setGwData(g);
      setBestXI(xi[season] || null);
    });
  }, [season]);

  const filtered = posFilter === 'ALL' ? players : players.filter(p => p.position === posFilter);
  const activePlayers = players.filter(p => p.minutes > 0);
  const topScorer = players[0];
  const totalGoals = activePlayers.reduce((s, p) => s + p.goals, 0);
  const totalAssists = activePlayers.reduce((s, p) => s + p.assists, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">
        <span className="gradient-text">Season Explorer</span>
      </h1>
      <p className="text-muted mb-6">Dive deep into each season&apos;s data — player stats, gameweek trends, and more.</p>

      <SeasonSelector value={season} onChange={setSeason} className="mb-8" />

      {/* Season Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Top Scorer" value={topScorer?.total_points || 0} subtitle={topScorer ? parseDisambiguatedName(topScorer.name).displayName : ''} icon={<Trophy size={20} />} />
        <StatCard label="Active Players" value={activePlayers.length} subtitle="With minutes played" />
        <StatCard label="Total Goals" value={totalGoals} icon={<Target size={20} />} />
        <StatCard label="Total Assists" value={totalAssists} icon={<Zap size={20} />} />
      </div>

      {/* GW Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ChartWrapper title="Avg Points Per GW" subtitle="Average points for players with minutes">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={gwData}>
              <XAxis dataKey="gw" />
              <YAxis />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
              <defs>
                <linearGradient id="gwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff87" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="avgPoints" stroke="#00ff87" fill="url(#gwGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Goals & Assists Per GW" subtitle="Total across all players">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={gwData}>
              <XAxis dataKey="gw" />
              <YAxis />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
              <Bar dataKey="totalGoals" fill="#00ff87" radius={[2, 2, 0, 0]} name="Goals" />
              <Bar dataKey="totalAssists" fill="#04f5ff" radius={[2, 2, 0, 0]} name="Assists" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      <ChartWrapper title="Highest GW Score" subtitle="Top individual performer each gameweek" className="mb-8">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={gwData}>
            <XAxis dataKey="gw" />
            <YAxis />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
              formatter={(value) => [`${value} pts`, 'High Score']}
            />
            <Line type="monotone" dataKey="highScore" stroke="#963cff" strokeWidth={2} dot={{ fill: '#963cff', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Best XI */}
      {bestXI && (
        <ChartWrapper title={`Best XI of ${season}`} subtitle="Top performers by position (4-4-2)" className="mb-8">
          <div className="space-y-3">
            {[
              { label: 'GK', players: bestXI.gkp, color: '#ffcc00' },
              { label: 'DEF', players: bestXI.def, color: '#04f5ff' },
              { label: 'MID', players: bestXI.mid, color: '#00ff87' },
              { label: 'FWD', players: bestXI.fwd, color: '#ff4466' },
            ].map(({ label, players: pos, color }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-xs font-bold px-2 py-1 rounded mt-1 shrink-0" style={{ backgroundColor: `${color}20`, color }}>{label}</span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {pos.map(p => {
                    const { displayName } = parseDisambiguatedName(p.name);
                    return (
                      <Link key={p.name} href={profileHref(p.name)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border/50 hover:border-accent/50 hover:bg-card-hover transition-all">
                        <span className="text-sm font-medium">{displayName}</span>
                        <span className="text-xs font-mono text-accent">{p.points}pts</span>
                        {p.goals > 0 && <span className="text-xs text-muted">{p.goals}G</span>}
                        {p.assists > 0 && <span className="text-xs text-muted">{p.assists}A</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ChartWrapper>
      )}

      {/* Player Table */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold mr-4">Player Rankings</h2>
        {['ALL', 'GKP', 'DEF', 'MID', 'FWD'].map(pos => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className={`px-3 py-1 rounded-lg text-xs border transition-all ${
              posFilter === pos
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'bg-card border-border text-muted hover:text-foreground'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        searchable
        searchKeys={['name']}
        defaultSortKey="total_points"
        columns={[
          { key: 'name', label: 'Player', render: (r) => {
            const row = r as unknown as Player;
            const { displayName, team } = parseDisambiguatedName(row.name);
            return (
              <div className="flex items-center gap-2">
                <Link href={profileHref(row.name)} className="font-medium hover:text-accent transition-colors">{displayName}</Link>
                <PositionBadge position={row.position} />
                {team && <span className="text-[10px] px-1.5 py-0.5 rounded bg-card-hover text-muted">{team}</span>}
              </div>
            );
          }},
          { key: 'total_points', label: 'Points', render: (r) => <span className="font-mono text-accent">{(r as unknown as Player).total_points}</span> },
          { key: 'goals', label: 'Goals' },
          { key: 'assists', label: 'Assists' },
          { key: 'minutes', label: 'Mins' },
          { key: 'clean_sheets', label: 'CS' },
          { key: 'bonus', label: 'Bonus' },
          { key: 'ict_index', label: 'ICT' },
          { key: 'cost', label: 'Cost', render: (r) => `£${(r as unknown as Player).cost}m` },
        ]}
      />
    </div>
  );
}
