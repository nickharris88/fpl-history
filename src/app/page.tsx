'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Trophy, Target, Users, Zap, TrendingUp, Star, Calendar, ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/StatCard';
import ChartWrapper from '@/components/ChartWrapper';
import { parseDisambiguatedName, profileHref } from '@/lib/playerName';

interface SeasonSummary {
  season: string;
  totalPlayers: number;
  totalGoals: number;
  totalAssists: number;
  totalOwnGoals: number;
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
  const router = useRouter();
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [allTime, setAllTime] = useState<AllTimePlayer[]>([]);
  const [topPerfs, setTopPerfs] = useState<TopPerformance[]>([]);
  const [heroSearch, setHeroSearch] = useState('');

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
  const totalOwnGoalsAllTime = seasons.reduce((s, se) => s + (se.totalOwnGoals || 0), 0);
  const totalAssistsAllTime = seasons.reduce((s, se) => s + se.totalAssists, 0);
  const totalPlayerSeasons = seasons.reduce((s, se) => s + se.totalPlayers, 0);

  const goalsChartData = seasons.map(s => ({
    season: s.season,
    goals: s.totalGoals,
    ownGoals: s.totalOwnGoals || 0,
  }));

  const positionData = [
    { name: 'GKP', value: allTime.filter(p => p.positions.includes('GKP')).length },
    { name: 'DEF', value: allTime.filter(p => p.positions.includes('DEF')).length },
    { name: 'MID', value: allTime.filter(p => p.positions.includes('MID')).length },
    { name: 'FWD', value: allTime.filter(p => p.positions.includes('FWD')).length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="text-center mb-12 animate-fade-in" style={{ overflow: 'visible', position: 'relative', zIndex: 40 }}>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          <span className="gradient-text">Fantasy Premier League</span>
          <br />
          <span className="text-foreground/80">History & Analytics</span>
        </h1>
        <p className="text-muted text-lg max-w-2xl mx-auto mb-6">
          Explore 9 seasons of FPL data — from 2016-17 to 2024-25. Over 224,000 gameweek
          entries, 6,500+ player records, and 2,600+ unique players.
        </p>
        {/* Hero Search */}
        <div className="relative max-w-md mx-auto" style={{ zIndex: 50 }}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search any player..."
            value={heroSearch}
            onChange={e => setHeroSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && heroSearch.trim()) {
                const match = allTime.find(p => p.name.toLowerCase().includes(heroSearch.toLowerCase()));
                if (match) router.push(`/players/${encodeURIComponent(match.name)}`);
                else router.push(`/players?q=${encodeURIComponent(heroSearch)}`);
              }
            }}
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
          {heroSearch.length >= 2 && (() => {
            const q = heroSearch.toLowerCase();
            const matches = allTime.filter(p => p.name.toLowerCase().includes(q));
            const top = matches.slice(0, 8);
            return (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {top.map(p => {
                  const { displayName, team } = parseDisambiguatedName(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => { setHeroSearch(''); router.push(profileHref(p.name)); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-card-hover transition-colors text-left"
                    >
                      <div>
                        <span className="text-sm font-medium">{displayName}</span>
                        {team && <span className="text-[10px] px-1.5 py-0.5 rounded bg-card-hover text-muted ml-1.5">{team}</span>}
                        <span className="text-xs text-muted ml-2">{p.seasonCount} seasons · {p.positions.join('/')}</span>
                      </div>
                      <span className="text-accent font-mono text-sm">{p.total_points.toLocaleString()}</span>
                    </button>
                  );
                })}
                {matches.length === 0 && (
                  <div className="px-4 py-3 text-muted text-sm">No players found</div>
                )}
                {matches.length > 8 && (
                  <button
                    onClick={() => router.push(`/players?q=${encodeURIComponent(heroSearch)}`)}
                    className="w-full px-4 py-2.5 bg-card-hover/50 hover:bg-card-hover text-accent text-sm font-medium border-t border-border transition-colors"
                  >
                    See all {matches.length} matches →
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up">
        <StatCard label="Seasons" value="9" subtitle="2016-17 to 2024-25" icon={<Calendar size={20} />} />
        <StatCard label="Total Goals" value={(totalGoalsAllTime + totalOwnGoalsAllTime).toLocaleString()} subtitle={`Incl. ${totalOwnGoalsAllTime} own goals`} icon={<Target size={20} />} />
        <StatCard label="Total Assists" value={totalAssistsAllTime.toLocaleString()} subtitle="Across all seasons" icon={<Zap size={20} />} />
        <StatCard label="Unique Players" value={allTime.length.toLocaleString()} subtitle={`${totalPlayerSeasons.toLocaleString()} player-seasons`} icon={<Users size={20} />} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title="Goals Per Season" subtitle="Goals scored + own goals (stacked)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={goalsChartData}>
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                labelStyle={{ color: '#e8e8f0' }}
              />
              <Bar dataKey="goals" stackId="goals" name="Goals" fill="#00ff87" radius={[0, 0, 0, 0]} />
              <Bar dataKey="ownGoals" stackId="goals" name="Own Goals" fill="#ff4466" radius={[4, 4, 0, 0]} />
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

      {/* Position Leaderboards */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { pos: 'GKP', label: 'Top Goalkeepers', color: '#ffcc00' },
          { pos: 'DEF', label: 'Top Defenders', color: '#04f5ff' },
          { pos: 'MID', label: 'Top Midfielders', color: '#00ff87' },
          { pos: 'FWD', label: 'Top Forwards', color: '#ff4466' },
        ].map(({ pos, label, color }) => (
          <ChartWrapper key={pos} title={label} subtitle="All-time career points">
            <div className="space-y-1.5">
              {allTime
                .filter(p => p.positions.includes(pos))
                .slice(0, 5)
                .map((p, i) => (
                  <Link href={profileHref(p.name)} key={p.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-card-hover transition-all group">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium truncate flex-1 group-hover:text-accent transition-colors">{parseDisambiguatedName(p.name).displayName}</span>
                    <span className="font-mono text-xs" style={{ color }}>{p.total_points.toLocaleString()}</span>
                  </Link>
                ))}
            </div>
          </ChartWrapper>
        ))}
      </div>

      {/* Season Summary Cards */}
      <ChartWrapper title="Season-by-Season MVPs" subtitle="Top scorer, top goal-getter and top creator each campaign" className="mb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {seasons.map((s, i) => (
            <div key={s.season} className="rounded-xl bg-card/50 border border-border/50 hover:border-accent/30 transition-all p-4 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold gradient-text">{s.season}</span>
                <span className="text-[10px] text-muted">{s.totalGoals} goals · {s.totalAssists} assists</span>
              </div>
              <div className="space-y-2">
                <Link href={profileHref(s.topScorer.name)} className="flex items-center gap-2 group">
                  <Trophy size={12} className="text-accent shrink-0" />
                  <span className="text-xs text-muted w-12 shrink-0">Points</span>
                  <span className="text-xs font-medium flex-1 truncate group-hover:text-accent transition-colors">{parseDisambiguatedName(s.topScorer.name).displayName}</span>
                  <span className="text-xs font-mono text-accent">{s.topScorer.points}</span>
                </Link>
                <Link href={profileHref(s.topGoalScorer.name)} className="flex items-center gap-2 group">
                  <Target size={12} className="text-[#04f5ff] shrink-0" />
                  <span className="text-xs text-muted w-12 shrink-0">Goals</span>
                  <span className="text-xs font-medium flex-1 truncate group-hover:text-accent transition-colors">{parseDisambiguatedName(s.topGoalScorer.name).displayName}</span>
                  <span className="text-xs font-mono" style={{ color: '#04f5ff' }}>{s.topGoalScorer.goals}</span>
                </Link>
                <Link href={profileHref(s.topAssister.name)} className="flex items-center gap-2 group">
                  <Zap size={12} className="text-[#963cff] shrink-0" />
                  <span className="text-xs text-muted w-12 shrink-0">Assists</span>
                  <span className="text-xs font-medium flex-1 truncate group-hover:text-accent transition-colors">{parseDisambiguatedName(s.topAssister.name).displayName}</span>
                  <span className="text-xs font-mono" style={{ color: '#963cff' }}>{s.topAssister.assists}</span>
                </Link>
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
              <Link href={profileHref(p.name)} key={p.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-card-hover transition-all group">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < 3 ? 'bg-accent/20 text-accent' : 'bg-card text-muted'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-accent transition-colors">{parseDisambiguatedName(p.name).displayName}</p>
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
              <Link href={profileHref(p.name)} key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-card-hover transition-all">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < 3 ? 'bg-purple/20 text-purple' : 'bg-card text-muted'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{parseDisambiguatedName(p.name).displayName}</p>
                  <p className="text-xs text-muted">{p.season} GW{p.gw} · {p.team}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm gradient-purple">{p.points} pts</span>
                  <p className="text-xs text-muted">
                    {p.goals > 0 && `${p.goals}G `}{p.assists > 0 && `${p.assists}A`}
                  </p>
                </div>
              </Link>
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
