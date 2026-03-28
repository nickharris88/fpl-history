'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Trophy, Target, Zap, Clock, Star, Shield } from 'lucide-react';
import ChartWrapper from '@/components/ChartWrapper';
import PositionBadge from '@/components/PositionBadge';
import DataTable from '@/components/DataTable';

interface AllTimePlayer {
  name: string;
  total_points: number;
  goals: number;
  assists: number;
  minutes: number;
  clean_sheets: number;
  bonus: number;
  seasonCount: number;
  positions: string[];
  ppg: number;
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

type Tab = 'total_points' | 'goals' | 'assists' | 'bonus' | 'clean_sheets' | 'hauls';

export default function RecordsPage() {
  const [allTime, setAllTime] = useState<AllTimePlayer[]>([]);
  const [topPerfs, setTopPerfs] = useState<TopPerformance[]>([]);
  const [tab, setTab] = useState<Tab>('total_points');

  useEffect(() => {
    Promise.all([
      fetch('/data/all-time.json').then(r => r.json()),
      fetch('/data/top-gw-performances.json').then(r => r.json()),
    ]).then(([a, t]) => {
      setAllTime(a);
      setTopPerfs(t);
    });
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'total_points', label: 'Points', icon: <Trophy size={16} /> },
    { key: 'goals', label: 'Goals', icon: <Target size={16} /> },
    { key: 'assists', label: 'Assists', icon: <Zap size={16} /> },
    { key: 'bonus', label: 'Bonus', icon: <Star size={16} /> },
    { key: 'clean_sheets', label: 'Clean Sheets', icon: <Shield size={16} /> },
    { key: 'hauls', label: 'GW Hauls', icon: <Clock size={16} /> },
  ];

  const getSorted = () => {
    if (tab === 'hauls') return [];
    return [...allTime].sort((a, b) => b[tab] - a[tab]);
  };

  const sorted = getSorted();
  const chartData = sorted.slice(0, 15).map(p => ({
    name: p.name.split(' ').pop() || p.name,
    value: p[tab as keyof AllTimePlayer] as number,
    fullName: p.name,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">
        <span className="gradient-text">All-Time Records</span>
      </h1>
      <p className="text-muted mb-6">Career statistics across 9 seasons of FPL history. Top 500 players by total points.</p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border transition-all ${
              tab === t.key
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'bg-card border-border text-muted hover:text-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'hauls' ? (
        <>
          <ChartWrapper title="Top GW Performances All-Time" subtitle="Highest single gameweek scores" className="mb-8">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPerfs.slice(0, 20).map(p => ({ name: p.name.split(' ').pop(), points: p.points, fullName: `${p.name} (${p.season} GW${p.gw})` }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                  formatter={(value) => [String(value), '']}
                />
                <Bar dataKey="points" fill="#963cff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <DataTable
            data={topPerfs as unknown as Record<string, unknown>[]}
            searchable
            searchKeys={['name', 'team']}
            pageSize={30}
            columns={[
              { key: 'name', label: 'Player', render: r => <span className="font-medium">{(r as unknown as TopPerformance).name}</span> },
              { key: 'season', label: 'Season' },
              { key: 'gw', label: 'GW' },
              { key: 'team', label: 'Team' },
              { key: 'points', label: 'Points', render: r => <span className="font-mono text-accent">{(r as unknown as TopPerformance).points}</span> },
              { key: 'goals', label: 'Goals' },
              { key: 'assists', label: 'Assists' },
            ]}
          />
        </>
      ) : (
        <>
          <ChartWrapper title={`Top 15 by Career ${tabs.find(t => t.key === tab)?.label}`} className="mb-8">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                  formatter={(value) => [String(value), '']}
                />
                <Bar dataKey="value" fill="#00ff87" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <DataTable
            data={sorted as unknown as Record<string, unknown>[]}
            searchable
            searchKeys={['name']}
            pageSize={30}
            onRowClick={(r) => {
              const player = r as unknown as AllTimePlayer;
              window.location.href = `/players/${encodeURIComponent(player.name)}`;
            }}
            columns={[
              {
                key: 'name', label: 'Player', render: r => {
                  const row = r as unknown as AllTimePlayer;
                  return (
                    <div className="flex items-center gap-2">
                      <Link href={`/players/${encodeURIComponent(row.name)}`} className="font-medium hover:text-accent transition-colors">{row.name}</Link>
                      <div className="flex gap-1">{row.positions.map(p => <PositionBadge key={p} position={p} />)}</div>
                    </div>
                  );
                }
              },
              { key: 'seasonCount', label: 'Seasons' },
              { key: 'total_points', label: 'Points', render: r => <span className="font-mono text-accent">{(r as unknown as AllTimePlayer).total_points.toLocaleString()}</span> },
              { key: 'goals', label: 'Goals' },
              { key: 'assists', label: 'Assists' },
              { key: 'minutes', label: 'Minutes', render: r => (r as unknown as AllTimePlayer).minutes.toLocaleString() },
              { key: 'clean_sheets', label: 'CS' },
              { key: 'bonus', label: 'Bonus' },
              { key: 'ppg', label: 'Pts/90' },
            ]}
          />
        </>
      )}
    </div>
  );
}
