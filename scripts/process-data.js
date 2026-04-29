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

// Positions that indicate managers/coaches (not players)
const MANAGER_POSITIONS = new Set(['AM', '5']);

// Team ID → Team Name mapping per season (for older seasons without team names in GW data)
// These are from vaastav's Fantasy-Premier-League repo teams data
const SEASON_TEAM_MAP = {
  '2016-17': {
    1: 'Arsenal', 2: 'Bournemouth', 3: 'Burnley', 4: 'Chelsea', 5: 'Crystal Palace',
    6: 'Everton', 7: 'Hull City', 8: 'Leicester', 9: 'Liverpool', 10: 'Man City',
    11: 'Man Utd', 12: 'Middlesbrough', 13: 'Southampton', 14: 'Stoke', 15: 'Sunderland',
    16: 'Swansea', 17: 'Spurs', 18: 'Watford', 19: 'West Brom', 20: 'West Ham',
  },
  '2017-18': {
    1: 'Arsenal', 2: 'Bournemouth', 3: 'Brighton', 4: 'Burnley', 5: 'Chelsea',
    6: 'Crystal Palace', 7: 'Everton', 8: 'Huddersfield', 9: 'Leicester', 10: 'Liverpool',
    11: 'Man City', 12: 'Man Utd', 13: 'Newcastle', 14: 'Southampton', 15: 'Stoke',
    16: 'Swansea', 17: 'Spurs', 18: 'Watford', 19: 'West Brom', 20: 'West Ham',
  },
  '2018-19': {
    1: 'Arsenal', 2: 'Bournemouth', 3: 'Brighton', 4: 'Burnley', 5: 'Cardiff',
    6: 'Chelsea', 7: 'Crystal Palace', 8: 'Everton', 9: 'Fulham', 10: 'Huddersfield',
    11: 'Leicester', 12: 'Liverpool', 13: 'Man City', 14: 'Man Utd', 15: 'Newcastle',
    16: 'Southampton', 17: 'Spurs', 18: 'Watford', 19: 'West Ham', 20: 'Wolves',
  },
  '2019-20': {
    1: 'Arsenal', 2: 'Aston Villa', 3: 'Bournemouth', 4: 'Brighton', 5: 'Burnley',
    6: 'Chelsea', 7: 'Crystal Palace', 8: 'Everton', 9: 'Leicester', 10: 'Liverpool',
    11: 'Man City', 12: 'Man Utd', 13: 'Newcastle', 14: 'Norwich', 15: 'Sheffield Utd',
    16: 'Southampton', 17: 'Spurs', 18: 'Watford', 19: 'West Ham', 20: 'Wolves',
  },
};

function parseCSV(filePath) {
  // Some older CSV files are encoded in Latin-1/ISO-8859-1, not UTF-8
  // Try UTF-8 first; if we detect replacement chars, re-read as Latin-1
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('\ufffd')) {
    // Re-read as Latin-1 to properly decode accented characters
    const raw = fs.readFileSync(filePath);
    content = raw.toString('latin1');
  }
  const result = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: true });
  return result.data;
}

// Fix encoding issues in names (mojibake from Latin-1 → UTF-8 misread)
const CHAR_FIXES = {
  '\u00e9': 'é', '\u00e8': 'è', '\u00ea': 'ê', '\u00eb': 'ë',
  '\u00e1': 'á', '\u00e0': 'à', '\u00e2': 'â', '\u00e3': 'ã', '\u00e4': 'ä', '\u00e5': 'å',
  '\u00ed': 'í', '\u00ec': 'ì', '\u00ee': 'î', '\u00ef': 'ï',
  '\u00f3': 'ó', '\u00f2': 'ò', '\u00f4': 'ô', '\u00f5': 'õ', '\u00f6': 'ö',
  '\u00fa': 'ú', '\u00f9': 'ù', '\u00fb': 'û', '\u00fc': 'ü',
  '\u00f1': 'ñ', '\u00e7': 'ç', '\u00fd': 'ý', '\u00ff': 'ÿ',
  '\u0161': 'š', '\u017e': 'ž', '\u010d': 'č', '\u0159': 'ř', '\u0148': 'ň',
};

/**
 * Clean up player name:
 * 1. Remove numeric suffixes like _246, _280 (FPL element IDs)
 * 2. Replace underscores with spaces
 * 3. Fix encoding artifacts (replacement char)
 */
function cleanName(rawName) {
  if (!rawName) return '';
  let name = String(rawName);
  // Remove trailing _NNN (element ID suffixes) - match underscore + 1-4 digits at end
  name = name.replace(/_(\d{1,4})$/, '');
  // Replace underscores with spaces
  name = name.replace(/_/g, ' ');
  // Replace replacement character with empty (better than showing �)
  name = name.replace(/\ufffd/g, '');
  // Clean up any double spaces
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

/**
 * Check if a position indicates a manager rather than a player
 */
function isManager(position, elementType) {
  return MANAGER_POSITIONS.has(String(position)) || MANAGER_POSITIONS.has(String(elementType));
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

  // Build element ID → team name mapping for older seasons (no team field in GW data)
  const elementTeamMap = {};
  const teamMap = SEASON_TEAM_MAP[season];
  if (teamMap) {
    const rawPlayersFile = path.join(RAW_DIR, `${season}_players_raw.csv`);
    if (fs.existsSync(rawPlayersFile)) {
      const rawPlayers = parseCSV(rawPlayersFile);
      for (const rp of rawPlayers) {
        const elementId = num(rp.id);
        const teamId = num(rp.team);
        if (elementId && teamMap[teamId]) {
          elementTeamMap[elementId] = teamMap[teamId];
        }
      }
      console.log(`  Loaded ${Object.keys(elementTeamMap).length} player→team mappings from players_raw.csv`);
    }
  }

  // Normalize player data (filter out managers)
  const seasonPlayers = players
    .filter(p => !isManager(p.element_type, p.element_type))
    .map((p, i) => ({
      id: `${season}-${i}`,
      season,
      first_name: p.first_name || '',
      second_name: p.second_name || '',
      name: cleanName(`${p.first_name || ''} ${p.second_name || ''}`.trim()),
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
      own_goals: num(p.own_goals),
      position: POSITION_MAP[String(p.element_type)] || 'UNK',
    }));

  // Collect managers separately
  const seasonManagers = players
    .filter(p => isManager(p.element_type, p.element_type))
    .map((p, i) => ({
      id: `${season}-mgr-${i}`,
      season,
      name: cleanName(`${p.first_name || ''} ${p.second_name || ''}`.trim()),
      total_points: num(p.total_points),
      minutes: 0,
      position: 'MGR',
    }));

  // Normalize gameweek data (separate managers from players)
  const allSeasonGws = gws.map((g, i) => {
    const pos = String(g.position || g.element_type || '');
    const isMgr = isManager(pos, g.element_type);
    // Resolve team: use the team field if present, otherwise look up from element ID
    let team = g.team || '';
    if (!team && g.element && elementTeamMap[num(g.element)]) {
      team = elementTeamMap[num(g.element)];
    }
    return {
      season,
      name: cleanName(g.name || ''),
      position: isMgr ? 'MGR' : (POSITION_MAP[pos] || POSITION_MAP[String(g.element_type)] || 'UNK'),
      team,
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
      isManager: isMgr,
    };
  });
  const seasonGws = allSeasonGws.filter(g => !g.isManager);
  const managerGws = allSeasonGws.filter(g => g.isManager);

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
  const totalOwnGoals = seasonGws.reduce((s, g) => s + g.own_goals, 0);
  const totalPlayers = seasonPlayers.filter(p => p.minutes > 0).length;

  seasonSummaries.push({
    season,
    totalPlayers,
    totalGoals,
    totalAssists,
    totalOwnGoals,
    topScorer: { name: topScorer?.name, points: topScorer?.total_points },
    topGoalScorer: { name: topGoals?.name, goals: topGoals?.goals },
    topAssister: { name: topAssists?.name, assists: topAssists?.assists },
    avgPointsPerPlayer: Math.round(seasonPlayers.filter(p => p.minutes > 0).reduce((s, p) => s + p.total_points, 0) / totalPlayers),
    managers: seasonManagers.length > 0 ? seasonManagers.map(m => ({ name: m.name, points: m.total_points })) : undefined,
  });
}

// Write season summaries
fs.writeFileSync(path.join(OUT_DIR, 'seasons.json'), JSON.stringify(seasonSummaries, null, 2));

// ── Detect name conflicts ──────────────────────────────────────────────────
// A conflict is when the same name appears at 2+ different teams in the same
// season — proof of two distinct players sharing a name.
// We resolve these by appending "(Team)" to each player's name.
const nameSeasonTeams = {}; // "name||season" → Set<team>
for (const g of allGameweeks) {
  if (!g.name || !g.team) continue;
  const k = `${g.name}||${g.season}`;
  if (!nameSeasonTeams[k]) nameSeasonTeams[k] = new Set();
  nameSeasonTeams[k].add(g.team);
}

// Names that are ambiguous in at least one season
const ambiguousNames = new Set();
for (const [key, teams] of Object.entries(nameSeasonTeams)) {
  if (teams.size > 1) {
    const name = key.split('||')[0];
    ambiguousNames.add(name);
    console.log(`  Conflict detected: "${name}" appears at [${[...teams].join(', ')}]`);
  }
}

// For ambiguous names, build a (name, season) → primary team map
// Primary team = the team a player appeared at most GWs that season
const nameSeasonPrimaryTeam = {};
for (const name of ambiguousNames) {
  for (const season of SEASONS) {
    const gwsForPlayer = allGameweeks.filter(g => g.name === name && g.season === season && g.team);
    if (!gwsForPlayer.length) continue;
    const teamCounts = {};
    gwsForPlayer.forEach(g => { teamCounts[g.team] = (teamCounts[g.team] || 0) + 1; });
    const primaryTeam = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0][0];
    nameSeasonPrimaryTeam[`${name}||${season}`] = primaryTeam;
  }
}

function disambiguatedName(name, season) {
  if (!ambiguousNames.has(name)) return name;
  const team = nameSeasonPrimaryTeam[`${name}||${season}`];
  return team ? `${name} (${team})` : name;
}

// Apply disambiguated names to allPlayers and allGameweeks
for (const p of allPlayers) {
  p.name = disambiguatedName(p.name, p.season);
}
for (const g of allGameweeks) {
  g.name = disambiguatedName(g.name, g.season);
}

// Re-write per-season player data with corrected names
for (const season of SEASONS) {
  const sp = allPlayers.filter(p => p.season === season).sort((a, b) => b.total_points - a.total_points);
  fs.writeFileSync(path.join(OUT_DIR, `players-${season}.json`), JSON.stringify(sp));
}

// ── Career aggregation ─────────────────────────────────────────────────────
// Aggregate from GW data (not players CSV) so disambiguated names and team
// info are correct — the players CSV can have two same-named players in one
// season with no way to tell them apart.
const playerCareerMap = {};
for (const g of allGameweeks.filter(g => g.position !== 'MGR' && g.minutes > 0)) {
  const key = g.name;
  if (!playerCareerMap[key]) {
    playerCareerMap[key] = {
      name: g.name,
      seasons: new Set(),
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
  c.seasons.add(g.season);
  c.total_points += g.total_points;
  c.goals += g.goals;
  c.assists += g.assists;
  c.minutes += g.minutes;
  c.clean_sheets += g.clean_sheets;
  c.bonus += g.bonus;
  if (g.position && g.position !== 'UNK') c.positions.add(g.position);
}

const careerStats = Object.values(playerCareerMap).map(c => ({
  ...c,
  seasons: [...c.seasons].sort(),
  positions: [...c.positions].filter(p => p !== 'UNK' || c.positions.size === 1),
  seasonCount: c.seasons.size,
  ppg: c.minutes > 0 ? Math.round((c.total_points / (c.minutes / 90)) * 100) / 100 : 0,
})).sort((a, b) => b.total_points - a.total_points);

fs.writeFileSync(path.join(OUT_DIR, 'all-time.json'), JSON.stringify(careerStats.slice(0, 500)));

// Top single gameweek performances (players only, no managers)
const topGwPerformances = [...allGameweeks]
  .filter(g => g.position !== 'MGR')
  .sort((a, b) => b.total_points - a.total_points)
  .slice(0, 200)
  .map(g => ({
    name: g.name,
    season: g.season,
    gw: g.gw,
    team: g.team,
    position: g.position,
    points: g.total_points,
    goals: g.goals,
    assists: g.assists,
    bonus: g.bonus,
    cs: g.clean_sheets,
    minutes: g.minutes,
  }));

fs.writeFileSync(path.join(OUT_DIR, 'top-gw-performances.json'), JSON.stringify(topGwPerformances));

// Manager performances (separate file)
const managerPerfs = [...allGameweeks]
  .filter(g => g.position === 'MGR')
  .sort((a, b) => b.total_points - a.total_points)
  .slice(0, 100)
  .map(g => ({
    name: g.name,
    season: g.season,
    gw: g.gw,
    team: g.team,
    points: g.total_points,
  }));

fs.writeFileSync(path.join(OUT_DIR, 'manager-performances.json'), JSON.stringify(managerPerfs));

// Per-season gameweek averages (for charts, players only)
for (const season of SEASONS) {
  const sgws = allGameweeks.filter(g => g.season === season && g.position !== 'MGR');
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

// Team stats per season (filter out managers)
for (const season of SEASONS) {
  const sgws = allGameweeks.filter(g => g.season === season && g.team && g.position !== 'MGR');
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
