'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
  PieChart, Pie, Cell, ComposedChart, Line, ReferenceLine
} from 'recharts';
import { ArrowLeft, Trophy, Target, Zap, Clock, Star, Home, Plane, Shield } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartWrapper from '@/components/ChartWrapper';
import PositionBadge from '@/components/PositionBadge';
import { stripDisambiguation } from '@/lib/playerName';

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
  home: boolean;
  val: number;
}

interface Consistency {
  pct6plus: number;
  pct9plus: number;
  pct12plus: number;
  gwsPlayed: number;
}

interface Distribution {
  blank: number;
  low: number;
  good: number;
  great: number;
  haul: number;
}

interface HomeAwaySplit {
  games: number;
  totalPts: number;
  avgPts: number;
  goals: number;
  assists: number;
}

interface ValueSeason {
  season: string;
  cost: number;
  ptsPerM: number;
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
  consistency: Consistency;
  distribution: Distribution;
  homeAway: { home: HomeAwaySplit; away: HomeAwaySplit };
  captainPoints: number;
  valuePerSeason: ValueSeason[];
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold mb-2">No detailed profile yet</h2>
        <p className="text-muted mb-6">
          Detailed profiles are generated for the top 1000 players by career points.
          This player either falls outside that group, or their name has changed in
          the FPL dataset between seasons. Try searching for a different spelling.
        </p>
        <Link href="/players" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors text-sm font-medium">
          <ArrowLeft size={14} /> Back to player search
        </Link>
      </div>
    );
  }

  const { career, seasons, gameweeks, consistency, distribution, homeAway, captainPoints, valuePerSeason } = profile;
  const seasonGws = selectedSeason ? gameweeks.filter(g => g.season === selectedSeason) : gameweeks;

  // Career GW timeline — aggregate DGWs (same season+gw number = sum pts)
  const gwMap = new Map<string, { season: string; gw: number; pts: number; isDGW: boolean }>();
  for (const g of gameweeks) {
    const key = `${g.season}-${g.gw}`;
    if (gwMap.has(key)) {
      const existing = gwMap.get(key)!;
      existing.pts += g.pts;
      existing.isDGW = true;
    } else {
      gwMap.set(key, { season: g.season, gw: g.gw, pts: g.pts, isDGW: false });
    }
  }
  const careerTimeline = Array.from(gwMap.values())
    .sort((a, b) => a.season.localeCompare(b.season) || a.gw - b.gw)
    .map((g, i) => ({ ...g, idx: i }));

  // Season boundaries for reference lines
  const seasonBoundaries: number[] = [];
  let lastSeason = '';
  careerTimeline.forEach((g, i) => {
    if (g.season !== lastSeason && i > 0) seasonBoundaries.push(i);
    lastSeason = g.season;
  });

  // DGW highlights
  const dgwGws = careerTimeline.filter(g => g.isDGW);

  const gwColor = (pts: number) => {
    if (pts >= 12) return '#00ff87';
    if (pts >= 9) return '#44cc88';
    if (pts >= 6) return '#ffcc00';
    if (pts >= 2) return '#ff8844';
    return '#ff4466';
  };

  const DIST_COLORS = ['#ff4466', '#ff8844', '#ffcc00', '#44cc88', '#00ff87'];
  const distData = [
    { name: 'Blank (0-1)', value: distribution.blank, color: DIST_COLORS[0] },
    { name: 'Low (2-5)', value: distribution.low, color: DIST_COLORS[1] },
    { name: 'Good (6-8)', value: distribution.good, color: DIST_COLORS[2] },
    { name: 'Great (9-11)', value: distribution.great, color: DIST_COLORS[3] },
    { name: 'Haul (12+)', value: distribution.haul, color: DIST_COLORS[4] },
  ];

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
              {stripDisambiguation(profile.name).split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {stripDisambiguation(profile.name)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {career.positions.map(pos => <PositionBadge key={pos} position={pos} />)}
              {profile.name.match(/\((.+?)\)$/) && (
                <span className="text-xs text-muted bg-card-hover px-1.5 py-0.5 rounded border border-border/50">
                  {profile.name.match(/\((.+?)\)$/)![1]}
                </span>
              )}
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

      {/* ── Advanced Analytics ── */}

      {/* Consistency + Distribution */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ChartWrapper title="Consistency Score" subtitle={`Based on ${consistency.gwsPlayed} GWs played`}>
          <div className="space-y-4 px-2">
            {[
              { label: '6+ pts', pct: consistency.pct6plus, color: '#ffcc00', desc: 'Good returns' },
              { label: '9+ pts', pct: consistency.pct9plus, color: '#44cc88', desc: 'Great returns' },
              { label: '12+ pts', pct: consistency.pct12plus, color: '#00ff87', desc: 'Haul territory' },
            ].map(({ label, pct, color, desc }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">{label} <span className="text-xs">({desc})</span></span>
                  <span className="font-mono font-semibold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-card overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
        </ChartWrapper>

        <ChartWrapper title="Points Distribution" subtitle="Breakdown of GW returns when playing">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}
                label={({ name, value }: { name?: string; value: number }) => value > 0 ? `${(name || '').split(' ')[0]}: ${value}` : ''}>
                {distData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Home/Away + Captain */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <ChartWrapper title="Home vs Away" subtitle="Performance splits" className="md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Home', data: homeAway.home, icon: <Home size={16} />, color: '#00ff87' },
              { label: 'Away', data: homeAway.away, icon: <Plane size={16} />, color: '#04f5ff' },
            ].map(({ label, data, icon, color }) => (
              <div key={label} className="p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color }}>{icon}</span>
                  <span className="font-medium text-sm">{label}</span>
                  <span className="text-xs text-muted">({data.games} GWs)</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Avg Pts</span>
                    <span className="font-mono font-semibold" style={{ color }}>{data.avgPts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Total Pts</span>
                    <span className="font-mono">{data.totalPts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Goals</span>
                    <span className="font-mono">{data.goals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Assists</span>
                    <span className="font-mono">{data.assists}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartWrapper>

        <ChartWrapper title="Captain Tracker" subtitle="If captained every GW">
          <div className="flex flex-col items-center justify-center h-full py-4">
            <Shield size={32} className="text-accent mb-2" />
            <p className="text-3xl font-bold gradient-text font-mono">{captainPoints.toLocaleString()}</p>
            <p className="text-muted text-xs mt-1">total captain points</p>
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-center">
                <span className="text-accent font-mono">{Math.round(captainPoints / (consistency.gwsPlayed || 1) * 10) / 10}</span>
                <span className="text-muted ml-1">avg per GW if captained</span>
              </p>
            </div>
          </div>
        </ChartWrapper>
      </div>

      {/* Value Over Time */}
      {valuePerSeason.length > 0 && (
        <ChartWrapper title="Value Analysis" subtitle="Points per £1m cost over time" className="mb-8">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={valuePerSeason}>
              <XAxis dataKey="season" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                formatter={(value, name) => [
                  name === 'ptsPerM' ? `${value} pts/£m` : `£${value}m`,
                  name === 'ptsPerM' ? 'Value' : 'Cost',
                ]}
              />
              <Bar dataKey="ptsPerM" fill="#00ff87" radius={[4, 4, 0, 0]} name="ptsPerM" yAxisId="left" />
              <Line type="monotone" dataKey="cost" stroke="#ff8844" strokeWidth={2} dot={{ fill: '#ff8844', r: 3 }} name="cost" yAxisId="right" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartWrapper>
      )}

      {/* Career GW Timeline */}
      <ChartWrapper title="Career GW Timeline" subtitle="All gameweeks across every season — colour-coded by score" className="mb-8">
        <div className="flex gap-3 text-xs text-muted mb-3 flex-wrap">
          {[['#ff4466', '0-1 Blank'], ['#ff8844', '2-5 Low'], ['#ffcc00', '6-8 Good'], ['#44cc88', '9-11 Great'], ['#00ff87', '12+ Haul']].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
          {dgwGws.length > 0 && <span className="flex items-center gap-1 ml-2 text-yellow-400">★ DGW ({dgwGws.length} total)</span>}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={careerTimeline} barCategoryGap={1}>
            <XAxis dataKey="idx" hide />
            <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} width={25} />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8, fontSize: 12 }}
              formatter={(value, _, props) => {
                const g = props.payload;
                return [`${value} pts${g.isDGW ? ' ★ DGW' : ''}`, `GW${g.gw} ${g.season}`];
              }}
              labelFormatter={() => ''}
            />
            {seasonBoundaries.map(i => (
              <ReferenceLine key={i} x={i} stroke="#2a2a4a" strokeDasharray="2 2" />
            ))}
            <Bar dataKey="pts" radius={[2, 2, 0, 0]}>
              {careerTimeline.map((g, i) => (
                <Cell key={i} fill={gwColor(g.pts)} opacity={g.isDGW ? 1 : 0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Season labels */}
        <div className="flex justify-between mt-1 px-1">
          {seasons.map(s => (
            <span key={s.season} className="text-[9px] text-muted/60">{s.season.slice(2)}</span>
          ))}
        </div>
      </ChartWrapper>

      {/* DGW Highlights */}
      {dgwGws.length > 0 && (
        <ChartWrapper title={`Double Gameweek Scores (${dgwGws.length})`} subtitle="Combined points from both fixtures in DGW weeks" className="mb-8">
          <div className="flex flex-wrap gap-2">
            {dgwGws.sort((a, b) => b.pts - a.pts).map((g, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                style={{ borderColor: gwColor(g.pts), backgroundColor: `${gwColor(g.pts)}15` }}>
                <span className="text-xs text-muted">{g.season} GW{g.gw}</span>
                <span className="font-mono font-bold text-sm" style={{ color: gwColor(g.pts) }}>{g.pts}pts</span>
              </div>
            ))}
          </div>
        </ChartWrapper>
      )}

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
