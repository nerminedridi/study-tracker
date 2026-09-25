const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` for the given moment in local time. */
export function dayKey(date: Date | number = new Date()): string {
  const d = typeof date === "number" ? new Date(date) : date;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parses `YYYY-MM-DD` as a local calendar date (midnight). */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function utcDay(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;
}

/** Whole calendar days from `today` until `key` (negative when in the past). */
export function daysUntil(key: string, today: Date = new Date()): number {
  return utcDay(parseDay(key)) - utcDay(today);
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function relativeDay(key: string, today: Date = new Date()): string {
  const n = daysUntil(key, today);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function formatDay(key: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseDay(key).toLocaleDateString(undefined, opts ?? { weekday: "short", month: "short", day: "numeric" });
}

export function formatMinutes(total: number): string {
  const mins = Math.round(total);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
