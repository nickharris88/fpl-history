'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Shield, Trophy, Target, Zap } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartWrapper from '@/components/ChartWrapper';
import SeasonSelector from '@/components/SeasonSelector';
import DataTable from '@/components/DataTable';

interface TeamStats {
  team: string;
  playerCount: number;
  totalPoints: number;
  totalGoals: number;
  totalAssists: number;
  totalCleanSheets: number;
  topPlayer: string;
  topPlayerPoints: number;
}

export default function TeamsPage() {
  const [season, setSeason] = useState('2024-25');
  const [teams, setTeams] = useState<TeamStats[]>([]);

  useEffect(() => {
    fetch(`/data/teams-${season}.json`).then(r => r.json()).then(setTeams);
  }, [season]);

  const sorted = [...teams].sort((a, b) => b.totalPoints - a.totalPoints);
  const topTeam = sorted[0];
  const totalGoals = teams.reduce((s, t) => s + t.totalGoals, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">
        <span className="gradient-text">Team Analysis</span>
      </h1>
      <p className="text-muted mb-6">FPL stats aggregated by Premier League team.</p>

      <SeasonSelector value={season} onChange={setSeason} className="mb-8" />

      {topTeam && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Top FPL Team" value={topTeam.team} subtitle={`${topTeam.totalPoints} total pts`} icon={<Shield size={20} />} />
          <StatCard label="Most Goals (Team)" value={[...teams].sort((a, b) => b.totalGoals - a.totalGoals)[0]?.team || ''} subtitle={`${[...teams].sort((a, b) => b.totalGoals - a.totalGoals)[0]?.totalGoals} goals`} icon={<Target size={20} />} />
          <StatCard label="Total Goals" value={totalGoals} icon={<Trophy size={20} />} />
          <StatCard label="Teams" value={teams.length} icon={<Zap size={20} />} />
        </div>
      )}

      {/* Points by Team */}
      <ChartWrapper title="Total FPL Points by Team" subtitle={`${season} season`} className="mb-8">
        <ResponsiveContainer width="100%" height={Math.max(500, teams.length * 28)}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 90 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="team" tick={{ fontSize: 11 }} width={90} interval={0} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
            <Bar dataKey="totalPoints" fill="#00ff87" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Goals & Assists */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ChartWrapper title="Goals by Team">
          <ResponsiveContainer width="100%" height={Math.max(500, teams.length * 28)}>
            <BarChart data={[...teams].sort((a, b) => b.totalGoals - a.totalGoals)} layout="vertical" margin={{ left: 90 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="team" tick={{ fontSize: 11 }} width={90} interval={0} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
              <Bar dataKey="totalGoals" fill="#04f5ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Clean Sheets by Team">
          <ResponsiveContainer width="100%" height={Math.max(500, teams.length * 28)}>
            <BarChart data={[...teams].sort((a, b) => b.totalCleanSheets - a.totalCleanSheets)} layout="vertical" margin={{ left: 90 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="team" tick={{ fontSize: 11 }} width={90} interval={0} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
              <Bar dataKey="totalCleanSheets" fill="#963cff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Team Table */}
      <DataTable
        data={sorted as unknown as Record<string, unknown>[]}
        searchable
        searchKeys={['team', 'topPlayer']}
        columns={[
          { key: 'team', label: 'Team', render: r => <span className="font-medium">{(r as unknown as TeamStats).team}</span> },
          { key: 'totalPoints', label: 'FPL Points', render: r => <span className="font-mono text-accent">{(r as unknown as TeamStats).totalPoints.toLocaleString()}</span> },
          { key: 'totalGoals', label: 'Goals' },
          { key: 'totalAssists', label: 'Assists' },
          { key: 'totalCleanSheets', label: 'CS' },
          { key: 'playerCount', label: 'Players' },
          { key: 'topPlayer', label: 'Top Player', render: r => {
            const row = r as unknown as TeamStats;
            return <span>{row.topPlayer} <span className="text-accent text-xs">({row.topPlayerPoints}pts)</span></span>;
          }},
        ]}
      />
    </div>
  );
}
