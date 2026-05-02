// Player name display utilities.
// Names in our data may carry a "(Team)" disambiguation suffix when a name
// was shared by multiple players in the same season. The canonical key is
// preserved (URLs, search) but the UI should show a cleaner display form.

export interface ParsedName {
  displayName: string;
  team: string | null;
}

const SUFFIX_RE = /\s+\(([^()]+)\)\s*$/;

export function parseDisambiguatedName(fullName: string): ParsedName {
  if (!fullName) return { displayName: '', team: null };
  const m = fullName.match(SUFFIX_RE);
  if (!m) return { displayName: fullName, team: null };
  return {
    displayName: fullName.replace(SUFFIX_RE, ''),
    team: m[1],
  };
}

export function stripDisambiguation(name: string): string {
  return parseDisambiguatedName(name).displayName;
}

export function profileHref(name: string): string {
  return `/players/${encodeURIComponent(name)}`;
}
