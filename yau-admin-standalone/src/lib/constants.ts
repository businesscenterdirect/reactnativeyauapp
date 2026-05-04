// ─── Canonical Grade Bands ────────────────────────────────────────────────────
// MUST match the mobile app exactly (standings.tsx, schedule.tsx)
export const GRADE_BANDS: string[] = [
  'K - 1st Grade',
  '1st - 2nd Grade',
  '3rd - 4th Grade',
  '5th - 6th Grade',
  '7th - 8th Grade',
  'High School',
];

// ─── Canonical Sports ─────────────────────────────────────────────────────────
export const SPORTS: string[] = [
  'Flag Football',
  'Soccer',
  'Cheer',
  'Basketball',
];

// ─── Standings key normalizer ─────────────────────────────────────────────────
// Produces a stable Firestore document key from team name + grade band + sport
export function toStandingsKey(teamName: string, gradeBand: string, sport: string): string {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${normalize(teamName)}__${normalize(gradeBand)}__${normalize(sport)}`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
// Parse a yyyy-MM-dd string into a JS Date at midnight local time (avoids UTC shift)
export function parseScheduleDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Returns today at midnight local time
export function todayMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
