'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Trophy, Target, Users, Zap, TrendingUp, Star, Calendar, ArrowRight } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartWrapper from '@/components/ChartWrapper';

interface SeasonSummary {
  season: string;
  totalPlayers: number;
  totalGoals: number;
  totalAssists: number;
  topScorer: { name: string; points: number };
  topGoalScorer: { name: string; goals: number };
  topAssister: { name: string; assists: number };
  avgPointsPerPlayer: number;
}

interface AllTimePlayer {
  name: string;
  total_points: number;
  goals: number;
  assists: number;
  minutes: number;
  seasonCount: number;
  positions: string[];
}

interface TopPerformance {
  name: string;
  season: string;
  gw: number;
  points: number;
  goals: number;
  assists: number;
  team: string;
}

const COLORS = ['#00ff87', '#04f5ff', '#963cff', '#ff4466', '#ffaa00', '#44ff88', '#8844ff', '#ff6644', '#00ccff'];

export default function Dashboard() {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [allTime, setAllTime] = useState<AllTimePlayer[]>([]);
  const [topPerfs, setTopPerfs] = useState<TopPerformance[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/data/seasons.json').then(r => r.json()),
      fetch('/data/all-time.json').then(r => r.json()),
      fetch('/data/top-gw-performances.json').then(r => r.json()),
    ]).then(([s, a, t]) => {
      setSeasons(s);
      setAllTime(a);
      setTopPerfs(t);
    });
  }, []);

  if (!seasons.length) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse text-accent text-lg">Loading FPL History...</div>
      </div>
    );
  }

  const totalGoalsAllTime = seasons.reduce((s, se) => s + se.totalGoals, 0);
  const totalAssistsAllTime = seasons.reduce((s, se) => s + se.totalAssists, 0);
  const totalPlayerSeasons = seasons.reduce((s, se) => s + se.totalPlayers, 0);

  const positionData = [
    { name: 'GKP', value: allTime.filter(p => p.positions.includes('GKP')).length },
    { name: 'DEF', value: allTime.filter(p => p.positions.includes('DEF')).length },
    { name: 'MID', value: allTime.filter(p => p.positions.includes('MID')).length },
    { name: 'FWD', value: allTime.filter(p => p.positions.includes('FWD')).length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          <span className="gradient-text">Fantasy Premier League</span>
          <br />
          <span className="text-foreground/80">History & Analytics</span>
        </h1>
        <p className="text-muted text-lg max-w-2xl mx-auto">
          Explore 9 seasons of FPL data — from 2016-17 to 2024-25. Over 224,000 gameweek
          entries, 6,500+ player records, and 2,600+ unique players.
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up">
        <StatCard label="Seasons" value="9" subtitle="2016-17 to 2024-25" icon={<Calendar size={20} />} />
        <StatCard label="Total Goals" value={totalGoalsAllTime.toLocaleString()} subtitle="Across all seasons" icon={<Target size={20} />} />
        <StatCard label="Total Assists" value={totalAssistsAllTime.toLocaleString()} subtitle="Across all seasons" icon={<Zap size={20} />} />
        <StatCard label="Unique Players" value={allTime.length.toLocaleString()} subtitle={`${totalPlayerSeasons.toLocaleString()} player-seasons`} icon={<Users size={20} />} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title="Goals Per Season" subtitle="Total goals scored across all FPL players">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={seasons}>
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                labelStyle={{ color: '#e8e8f0' }}
              />
              <Bar dataKey="totalGoals" fill="#00ff87" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Avg Points Per Player" subtitle="Season average for players with minutes played">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={seasons}>
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                labelStyle={{ color: '#e8e8f0' }}
              />
              <defs>
                <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#04f5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#04f5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="avgPointsPerPlayer" stroke="#04f5ff" fill="url(#gradientArea)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <ChartWrapper title="Player Positions" subtitle="Distribution across all seasons" className="md:col-span-1">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={positionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {positionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Players Per Season" subtitle="Active players with minutes" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={seasons}>
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} labelStyle={{ color: '#e8e8f0' }} />
              <Line type="monotone" dataKey="totalPlayers" stroke="#963cff" strokeWidth={2} dot={{ fill: '#963cff', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Season Top Scorers */}
      <ChartWrapper title="Top FPL Scorer Each Season" subtitle="Highest total points per season" className="mb-8">
        <div className="grid sm:grid-cols-3 gap-3">
          {seasons.map((s, i) => (
            <div key={s.season} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50 hover:border-accent/30 transition-all" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent2/20 flex items-center justify-center shrink-0">
                <Trophy size={18} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">{s.season}</p>
                <p className="font-medium text-sm truncate">{s.topScorer.name}</p>
                <p className="text-accent text-xs font-mono">{s.topScorer.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </ChartWrapper>

      {/* All-Time Top 10 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ChartWrapper title="All-Time Top 10 by Points" subtitle="Career FPL points across all seasons">
          <div className="space-y-2">
            {allTime.slice(0, 10).map((p, i) => (
              <Link href={`/players/${encodeURIComponent(p.name)}`} key={p.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-card-hover transition-all group">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < 3 ? 'bg-accent/20 text-accent' : 'bg-card text-muted'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">{p.name}</p>
                  <p className="text-xs text-muted">{p.seasonCount} seasons · {p.positions.join('/')}</p>
                </div>
                <span className="font-mono text-sm text-accent">{p.total_points.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </ChartWrapper>

        <ChartWrapper title="Top Single Gameweek Hauls" subtitle="Highest individual GW scores ever">
          <div className="space-y-2">
            {topPerfs.slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-card-hover transition-all">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < 3 ? 'bg-purple/20 text-purple' : 'bg-card text-muted'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted">{p.season} GW{p.gw} · {p.team}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm gradient-purple">{p.points} pts</span>
                  <p className="text-xs text-muted">
                    {p.goals > 0 && `${p.goals}G `}{p.assists > 0 && `${p.assists}A`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartWrapper>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/seasons', label: 'Explore Seasons', desc: 'GW-by-GW data for each season', icon: Calendar },
          { href: '/players', label: 'Player Search', desc: 'Search 2,600+ players', icon: Users },
          { href: '/records', label: 'All-Time Records', desc: 'Career stats and records', icon: Star },
          { href: '/compare', label: 'Compare Players', desc: 'Head-to-head analysis', icon: TrendingUp },
        ].map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href} className="glass rounded-xl p-5 hover:bg-card-hover hover:border-accent/30 transition-all group">
            <Icon size={24} className="text-accent mb-3" />
            <h3 className="font-semibold text-sm mb-1 group-hover:text-accent transition-colors">{label}</h3>
            <p className="text-muted text-xs">{desc}</p>
            <ArrowRight size={16} className="text-muted mt-3 group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}
