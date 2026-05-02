'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Shield, Trophy, Target, Zap } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartWrapper from '@/components/ChartWrapper';
import SeasonSelector from '@/components/SeasonSelector';
import DataTable from '@/components/DataTable';
import Link from 'next/link';
import { parseDisambiguatedName, profileHref } from '@/lib/playerName';
import { useSharedSeason } from '@/lib/seasonContext';

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

interface TeamSeasonHistory {
  season: string;
  totalPoints: number;
  totalGoals: number;
  totalAssists: number;
  totalCleanSheets: number;
  topPlayer: string;
  topPlayerPoints: number;
  playerCount: number;
}


export default function TeamsPage() {
  const [season, setSeason] = useSharedSeason();
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [teamHistory, setTeamHistory] = useState<Record<string, TeamSeasonHistory[]>>({});
  const [selectedTeam, setSelectedTeam] = useState('Man City');
  const [tab, setTab] = useState<'season' | 'tracker'>('season');

  useEffect(() => {
    fetch(`/data/teams-${season}.json`).then(r => r.json()).then(setTeams);
  }, [season]);

  useEffect(() => {
    fetch('/data/team-history.json').then(r => r.json()).then((data) => {
      setTeamHistory(data);
    });
  }, []);

  const sorted = [...teams].sort((a, b) => b.totalPoints - a.totalPoints);
  const topTeam = sorted[0];
  const totalGoals = teams.reduce((s, t) => s + t.totalGoals, 0);

  const availableTeams = Object.keys(teamHistory).sort();
  const trackerData = teamHistory[selectedTeam] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">
        <span className="gradient-text">Team Analysis</span>
      </h1>
      <p className="text-muted mb-6">FPL stats aggregated by Premier League team.</p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-8">
        {(['season', 'tracker'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm border transition-all ${
              tab === t
                ? 'bg-accent/15 text-accent border-accent/30'
                : 'bg-card border-border text-muted hover:text-foreground'
            }`}
          >
            {t === 'season' ? 'Season View' : 'Form Tracker'}
          </button>
        ))}
      </div>

      {tab === 'season' && (
        <>
          <SeasonSelector value={season} onChange={setSeason} className="mb-8" />

          {topTeam && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Top FPL Team" value={topTeam.team} subtitle={`${topTeam.totalPoints} total pts`} icon={<Shield size={20} />} />
              <StatCard label="Most Goals (Team)" value={[...teams].sort((a, b) => b.totalGoals - a.totalGoals)[0]?.team || ''} subtitle={`${[...teams].sort((a, b) => b.totalGoals - a.totalGoals)[0]?.totalGoals} goals`} icon={<Target size={20} />} />
              <StatCard label="Total Goals" value={totalGoals} icon={<Trophy size={20} />} />
              <StatCard label="Teams" value={teams.length} icon={<Zap size={20} />} />
            </div>
          )}

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
                return (
                  <span>
                    <Link href={profileHref(row.topPlayer)} className="hover:text-accent transition-colors">
                      {parseDisambiguatedName(row.topPlayer).displayName}
                    </Link>{' '}
                    <span className="text-accent text-xs">({row.topPlayerPoints}pts)</span>
                  </span>
                );
              }},
            ]}
          />
        </>
      )}

      {tab === 'tracker' && (
        <>
          <div className="mb-6">
            <p className="text-muted text-sm mb-3">Select a team to see their FPL output across all 9 seasons:</p>
            <div className="flex flex-wrap gap-2">
              {availableTeams.map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedTeam(team)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    selectedTeam === team
                      ? 'bg-accent/15 text-accent border-accent/30'
                      : 'bg-card border-border text-muted hover:text-foreground'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>

          {trackerData.length === 0 && availableTeams.length > 0 && (
            <div className="text-center py-12 px-6 rounded-xl border border-dashed border-border bg-card/30">
              <Shield size={32} className="text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">No data available for this club. Try one of the {availableTeams.length} teams above.</p>
            </div>
          )}

          {trackerData.length > 0 && (
            <>
              {/* Season summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Best Season"
                  value={[...trackerData].sort((a, b) => b.totalPoints - a.totalPoints)[0]?.season || ''}
                  subtitle={`${[...trackerData].sort((a, b) => b.totalPoints - a.totalPoints)[0]?.totalPoints} pts`}
                  icon={<Trophy size={18} />}
                />
                <StatCard
                  label="Seasons in PL"
                  value={trackerData.length}
                  subtitle="in dataset (2016–2025)"
                />
                <StatCard
                  label="All-Time Top FPL"
                  value={parseDisambiguatedName([...trackerData].sort((a, b) => b.topPlayerPoints - a.topPlayerPoints)[0]?.topPlayer || '').displayName}
                  subtitle={`${[...trackerData].sort((a, b) => b.topPlayerPoints - a.topPlayerPoints)[0]?.topPlayerPoints} pts in one season`}
                  icon={<Shield size={18} />}
                />
                <StatCard
                  label="Total Career Goals"
                  value={trackerData.reduce((s, d) => s + d.totalGoals, 0)}
                  icon={<Target size={18} />}
                />
              </div>

              <ChartWrapper title={`${selectedTeam} — Total FPL Points by Season`} subtitle="Across all seasons in the dataset" className="mb-6">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trackerData}>
                    <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                      formatter={(value) => [`${value} pts`, 'FPL Points']}
                    />
                    <Line type="monotone" dataKey="totalPoints" stroke="#00ff87" strokeWidth={2} dot={{ fill: '#00ff87', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartWrapper>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <ChartWrapper title="Goals & Assists by Season">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={trackerData}>
                      <XAxis dataKey="season" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="totalGoals" fill="#04f5ff" radius={[2, 2, 0, 0]} name="Goals" />
                      <Bar dataKey="totalAssists" fill="#963cff" radius={[2, 2, 0, 0]} name="Assists" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>

                <ChartWrapper title="Clean Sheets by Season">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={trackerData}>
                      <XAxis dataKey="season" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
                      <Bar dataKey="totalCleanSheets" fill="#ffcc00" radius={[2, 2, 0, 0]} name="Clean Sheets" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>

              {/* Season-by-season top player table */}
              <ChartWrapper title={`${selectedTeam} — Top FPL Asset Each Season`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted uppercase tracking-wider border-b border-border">
                        <th className="px-3 py-2">Season</th>
                        <th className="px-3 py-2">Top Player</th>
                        <th className="px-3 py-2">Points</th>
                        <th className="px-3 py-2">Team Total</th>
                        <th className="px-3 py-2">Goals</th>
                        <th className="px-3 py-2">CS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackerData.map(d => (
                        <tr key={d.season} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                          <td className="px-3 py-2 font-medium">{d.season}</td>
                          <td className="px-3 py-2">
                            <Link href={profileHref(d.topPlayer)} className="hover:text-accent transition-colors">
                              {parseDisambiguatedName(d.topPlayer).displayName}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-accent">{d.topPlayerPoints}</td>
                          <td className="px-3 py-2 font-mono">{d.totalPoints.toLocaleString()}</td>
                          <td className="px-3 py-2">{d.totalGoals}</td>
                          <td className="px-3 py-2">{d.totalCleanSheets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartWrapper>
            </>
          )}
        </>
      )}
    </div>
  );
}
