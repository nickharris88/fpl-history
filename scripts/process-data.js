const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'public', 'data');

fs.mkdirSync(OUT_DIR, { recursive: true });

const SEASONS = [
  '2016-17', '2017-18', '2018-19', '2019-20', '2020-21',
  '2021-22', '2022-23', '2023-24', '2024-25'
];

const POSITION_MAP = { '1': 'GKP', '2': 'DEF', '3': 'MID', '4': 'FWD', 'GKP': 'GKP', 'DEF': 'DEF', 'MID': 'MID', 'FWD': 'FWD', 'GK': 'GKP' };

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: true });
  return result.data;
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// Process all seasons
const allPlayers = []; // aggregated player-season records
const allGameweeks = []; // aggregated gw records
const seasonSummaries = [];

for (const season of SEASONS) {
  console.log(`Processing ${season}...`);

  const playersFile = path.join(RAW_DIR, `${season}_players.csv`);
  const gwsFile = path.join(RAW_DIR, `${season}_gws.csv`);

  const players = parseCSV(playersFile);
  const gws = parseCSV(gwsFile);

  // Normalize player data
  const seasonPlayers = players.map((p, i) => ({
    id: `${season}-${i}`,
    season,
    first_name: p.first_name || '',
    second_name: p.second_name || '',
    name: `${p.first_name || ''} ${p.second_name || ''}`.trim(),
    goals: num(p.goals_scored),
    assists: num(p.assists),
    total_points: num(p.total_points),
    minutes: num(p.minutes),
    goals_conceded: num(p.goals_conceded),
    creativity: num(p.creativity),
    influence: num(p.influence),
    threat: num(p.threat),
    bonus: num(p.bonus),
    bps: num(p.bps),
    ict_index: num(p.ict_index),
    clean_sheets: num(p.clean_sheets),
    red_cards: num(p.red_cards),
    yellow_cards: num(p.yellow_cards),
    selected_pct: num(p.selected_by_percent),
    cost: num(p.now_cost) / 10 || 0,
    position: POSITION_MAP[String(p.element_type)] || 'UNK',
  }));

  // Normalize gameweek data
  const seasonGws = gws.map((g, i) => ({
    season,
    name: g.name || '',
    position: POSITION_MAP[String(g.position)] || POSITION_MAP[String(g.element_type)] || 'UNK',
    team: g.team || '',
    gw: num(g.GW || g.round),
    total_points: num(g.total_points),
    minutes: num(g.minutes),
    goals: num(g.goals_scored),
    assists: num(g.assists),
    clean_sheets: num(g.clean_sheets),
    goals_conceded: num(g.goals_conceded),
    bonus: num(g.bonus),
    bps: num(g.bps),
    influence: num(g.influence),
    creativity: num(g.creativity),
    threat: num(g.threat),
    ict_index: num(g.ict_index),
    saves: num(g.saves),
    yellow_cards: num(g.yellow_cards),
    red_cards: num(g.red_cards),
    own_goals: num(g.own_goals),
    penalties_missed: num(g.penalties_missed),
    penalties_saved: num(g.penalties_saved),
    value: num(g.value) / 10 || 0,
    was_home: g.was_home === true || g.was_home === 'True' || g.was_home === 'TRUE',
    kickoff_time: g.kickoff_time || '',
    selected: num(g.selected),
    transfers_in: num(g.transfers_in),
    transfers_out: num(g.transfers_out),
    xP: num(g.xP),
    expected_goals: num(g.expected_goals),
    expected_assists: num(g.expected_assists),
    opponent_team: num(g.opponent_team),
  }));

  // Fix missing positions from player data using GW data
  const gwPositions = {};
  for (const g of seasonGws) {
    if (g.position && g.position !== 'UNK' && g.name) {
      gwPositions[g.name] = g.position;
    }
  }
  for (const p of seasonPlayers) {
    if (p.position === 'UNK' && gwPositions[p.name]) {
      p.position = gwPositions[p.name];
    }
  }

  allPlayers.push(...seasonPlayers);
  allGameweeks.push(...seasonGws);

  // Season summary
  const topScorer = [...seasonPlayers].sort((a, b) => b.total_points - a.total_points)[0];
  const topGoals = [...seasonPlayers].sort((a, b) => b.goals - a.goals)[0];
  const topAssists = [...seasonPlayers].sort((a, b) => b.assists - a.assists)[0];

  const totalGoals = seasonPlayers.reduce((s, p) => s + p.goals, 0);
  const totalAssists = seasonPlayers.reduce((s, p) => s + p.assists, 0);
  const totalPlayers = seasonPlayers.filter(p => p.minutes > 0).length;

  seasonSummaries.push({
    season,
    totalPlayers,
    totalGoals,
    totalAssists,
    topScorer: { name: topScorer?.name, points: topScorer?.total_points },
    topGoalScorer: { name: topGoals?.name, goals: topGoals?.goals },
    topAssister: { name: topAssists?.name, assists: topAssists?.assists },
    avgPointsPerPlayer: Math.round(seasonPlayers.filter(p => p.minutes > 0).reduce((s, p) => s + p.total_points, 0) / totalPlayers),
  });
}

// Write season summaries
fs.writeFileSync(path.join(OUT_DIR, 'seasons.json'), JSON.stringify(seasonSummaries, null, 2));

// Write per-season player data
for (const season of SEASONS) {
  const sp = allPlayers.filter(p => p.season === season).sort((a, b) => b.total_points - a.total_points);
  fs.writeFileSync(path.join(OUT_DIR, `players-${season}.json`), JSON.stringify(sp));
}

// All-time records - aggregate across seasons
const playerCareerMap = {};
for (const p of allPlayers) {
  const key = p.name;
  if (!playerCareerMap[key]) {
    playerCareerMap[key] = {
      name: p.name,
      seasons: [],
      total_points: 0,
      goals: 0,
      assists: 0,
      minutes: 0,
      clean_sheets: 0,
      bonus: 0,
      positions: new Set(),
    };
  }
  const c = playerCareerMap[key];
  c.seasons.push(p.season);
  c.total_points += p.total_points;
  c.goals += p.goals;
  c.assists += p.assists;
  c.minutes += p.minutes;
  c.clean_sheets += p.clean_sheets;
  c.bonus += p.bonus;
  c.positions.add(p.position);
}

const careerStats = Object.values(playerCareerMap).map(c => ({
  ...c,
  positions: [...c.positions].filter(p => p !== 'UNK' || c.positions.size === 1),
  seasonCount: c.seasons.length,
  ppg: c.minutes > 0 ? Math.round((c.total_points / (c.minutes / 90)) * 100) / 100 : 0,
})).sort((a, b) => b.total_points - a.total_points);

fs.writeFileSync(path.join(OUT_DIR, 'all-time.json'), JSON.stringify(careerStats.slice(0, 500)));

// Top single gameweek performances
const topGwPerformances = [...allGameweeks]
  .sort((a, b) => b.total_points - a.total_points)
  .slice(0, 200)
  .map(g => ({
    name: g.name,
    season: g.season,
    gw: g.gw,
    team: g.team,
    points: g.total_points,
    goals: g.goals,
    assists: g.assists,
    bonus: g.bonus,
    cs: g.clean_sheets,
    minutes: g.minutes,
  }));

fs.writeFileSync(path.join(OUT_DIR, 'top-gw-performances.json'), JSON.stringify(topGwPerformances));

// Per-season gameweek averages (for charts)
for (const season of SEASONS) {
  const sgws = allGameweeks.filter(g => g.season === season);
  const gwNumbers = [...new Set(sgws.map(g => g.gw))].sort((a, b) => a - b);

  const gwAverages = gwNumbers.map(gwNum => {
    const gwData = sgws.filter(g => g.gw === gwNum && g.minutes > 0);
    const totalPts = gwData.reduce((s, g) => s + g.total_points, 0);
    const totalGoals = gwData.reduce((s, g) => s + g.goals, 0);
    const totalAssists = gwData.reduce((s, g) => s + g.assists, 0);
    const highScore = Math.max(...gwData.map(g => g.total_points), 0);
    const topPlayer = gwData.find(g => g.total_points === highScore);
    return {
      gw: gwNum,
      avgPoints: Math.round((totalPts / gwData.length) * 100) / 100,
      totalGoals,
      totalAssists,
      playerCount: gwData.length,
      highScore,
      topPlayer: topPlayer?.name || '',
    };
  });

  fs.writeFileSync(path.join(OUT_DIR, `gw-${season}.json`), JSON.stringify(gwAverages));
}

// Team stats per season
for (const season of SEASONS) {
  const sgws = allGameweeks.filter(g => g.season === season && g.team);
  const teams = [...new Set(sgws.map(g => g.team))].sort();

  const teamStats = teams.map(team => {
    const tgws = sgws.filter(g => g.team === team);
    const players = [...new Set(tgws.map(g => g.name))];
    const totalPts = tgws.reduce((s, g) => s + g.total_points, 0);
    const totalGoals = tgws.reduce((s, g) => s + g.goals, 0);
    const totalAssists = tgws.reduce((s, g) => s + g.assists, 0);
    const totalCS = tgws.reduce((s, g) => s + g.clean_sheets, 0);
    const topPlayer = players.map(name => {
      const pGws = tgws.filter(g => g.name === name);
      return { name, points: pGws.reduce((s, g) => s + g.total_points, 0) };
    }).sort((a, b) => b.points - a.points)[0];

    return {
      team,
      playerCount: players.length,
      totalPoints: totalPts,
      totalGoals,
      totalAssists,
      totalCleanSheets: totalCS,
      topPlayer: topPlayer?.name || '',
      topPlayerPoints: topPlayer?.points || 0,
    };
  });

  fs.writeFileSync(path.join(OUT_DIR, `teams-${season}.json`), JSON.stringify(teamStats));
}

// Player search index (lightweight)
const searchIndex = careerStats.slice(0, 1000).map(p => ({
  name: p.name,
  seasons: p.seasons,
  positions: p.positions,
  total_points: p.total_points,
  goals: p.goals,
  assists: p.assists,
}));
fs.writeFileSync(path.join(OUT_DIR, 'search-index.json'), JSON.stringify(searchIndex));

// Per-player detailed data for player profiles (top 300 players)
const top300Names = new Set(careerStats.slice(0, 300).map(p => p.name));
const playerProfiles = {};

for (const p of careerStats.slice(0, 300)) {
  const name = p.name;
  const gwData = allGameweeks.filter(g => g.name === name);
  const seasonData = allPlayers.filter(pl => pl.name === name);

  playerProfiles[name] = {
    name,
    career: p,
    seasons: seasonData.map(s => ({
      season: s.season,
      total_points: s.total_points,
      goals: s.goals,
      assists: s.assists,
      minutes: s.minutes,
      clean_sheets: s.clean_sheets,
      bonus: s.bonus,
      position: s.position,
      cost: s.cost,
      ict_index: s.ict_index,
      creativity: s.creativity,
      influence: s.influence,
      threat: s.threat,
    })),
    gameweeks: gwData.map(g => ({
      season: g.season,
      gw: g.gw,
      pts: g.total_points,
      min: g.minutes,
      g: g.goals,
      a: g.assists,
      cs: g.clean_sheets,
      bonus: g.bonus,
      team: g.team,
    })),
  };
}

// Write player profiles in chunks to keep file sizes manageable
const profileNames = Object.keys(playerProfiles);
const CHUNK_SIZE = 50;
for (let i = 0; i < profileNames.length; i += CHUNK_SIZE) {
  const chunk = {};
  profileNames.slice(i, i + CHUNK_SIZE).forEach(name => { chunk[name] = playerProfiles[name]; });
  fs.writeFileSync(path.join(OUT_DIR, `profiles-${Math.floor(i / CHUNK_SIZE)}.json`), JSON.stringify(chunk));
}

// Write profile index
const profileIndex = profileNames.map((name, i) => ({
  name,
  chunk: Math.floor(i / CHUNK_SIZE),
}));
fs.writeFileSync(path.join(OUT_DIR, 'profile-index.json'), JSON.stringify(profileIndex));

console.log('Done! All data processed.');
console.log(`  ${allPlayers.length} player-season records`);
console.log(`  ${allGameweeks.length} gameweek records`);
console.log(`  ${careerStats.length} unique players`);
console.log(`  ${profileNames.length} detailed profiles`);
