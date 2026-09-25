import type { Course, StudySession } from "../types";
import { addDays, dayKey } from "./date";

export function courseProgress(course: Course): number {
  if (!course.lessons.length) return 0;
  return Math.round((course.lessons.filter((l) => l.done).length / course.lessons.length) * 100);
}

export function overallProgress(courses: Course[]): number {
  const lessons = courses.flatMap((c) => c.lessons);
  if (!lessons.length) return 0;
  return Math.round((lessons.filter((l) => l.done).length / lessons.length) * 100);
}

export function minutesByDay(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(s.start);
    map.set(key, (map.get(key) ?? 0) + s.minutes);
  }
  return map;
}

export function minutesOn(sessions: StudySession[], day: string): number {
  return sessions.reduce((sum, s) => (dayKey(s.start) === day ? sum + s.minutes : sum), 0);
}

/** One entry per day for the last `days` days, oldest first, ending today. */
export function dailySeries(sessions: StudySession[], days: number, today: Date = new Date()) {
  const byDay = minutesByDay(sessions);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const key = dayKey(date);
    return { key, date, minutes: byDay.get(key) ?? 0 };
  });
}

/**
 * Consecutive days with any study time, counting back from today. If nothing
 * was logged today yet, the streak from yesterday still counts.
 */
export function currentStreak(sessions: StudySession[], today: Date = new Date()): number {
  const byDay = minutesByDay(sessions);
  let cursor = today;
  if (!byDay.get(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (byDay.get(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(sessions: StudySession[]): number {
  const days = [...minutesByDay(sessions).keys()].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    if (prev) {
      const [y, m, d] = prev.split("-").map(Number);
      run = dayKey(new Date(y, m - 1, d + 1)) === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export function minutesByCourse(sessions: StudySession[]): Map<string | null, number> {
  const map = new Map<string | null, number>();
  for (const s of sessions) map.set(s.courseId, (map.get(s.courseId) ?? 0) + s.minutes);
  return map;
}

export function totalMinutes(sessions: StudySession[], since?: number): number {
  return sessions.reduce((sum, s) => (since === undefined || s.start >= since ? sum + s.minutes : sum), 0);
}

/** Epoch ms of the most recent Monday 00:00 (local). */
export function startOfWeek(today: Date = new Date()): number {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}
