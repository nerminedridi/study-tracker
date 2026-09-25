import { describe, expect, it } from "vitest";
import type { StudySession } from "../types";
import { bestStreak, currentStreak, dailySeries, minutesByCourse } from "./stats";

const at = (y: number, m: number, d: number, minutes = 30, courseId: string | null = null): StudySession => ({
  id: `${y}-${m}-${d}-${minutes}-${courseId}`,
  courseId,
  start: new Date(y, m - 1, d, 10).getTime(),
  minutes,
  source: "timer",
});

describe("streaks", () => {
  const today = new Date(2026, 8, 25, 18);

  it("counts consecutive days ending today", () => {
    const s = [at(2026, 9, 23), at(2026, 9, 24), at(2026, 9, 25)];
    expect(currentStreak(s, today)).toBe(3);
  });

  it("keeps yesterday's streak alive before studying today", () => {
    const s = [at(2026, 9, 23), at(2026, 9, 24)];
    expect(currentStreak(s, today)).toBe(2);
  });

  it("resets after a missed day", () => {
    expect(currentStreak([at(2026, 9, 22), at(2026, 9, 25)], today)).toBe(1);
    expect(currentStreak([at(2026, 9, 20)], today)).toBe(0);
  });

  it("finds the best streak across month boundaries", () => {
    const s = [at(2026, 8, 30), at(2026, 8, 31), at(2026, 9, 1), at(2026, 9, 5), at(2026, 9, 5, 20)];
    expect(bestStreak(s)).toBe(3);
  });
});

describe("aggregations", () => {
  it("builds a zero-filled daily series ending today", () => {
    const series = dailySeries([at(2026, 9, 25, 40), at(2026, 9, 25, 20), at(2026, 9, 23, 15)], 3, new Date(2026, 8, 25));
    expect(series.map((d) => [d.key, d.minutes])).toEqual([
      ["2026-09-23", 15],
      ["2026-09-24", 0],
      ["2026-09-25", 60],
    ]);
  });

  it("sums minutes per course", () => {
    const m = minutesByCourse([at(2026, 9, 1, 30, "a"), at(2026, 9, 2, 45, "a"), at(2026, 9, 2, 10, null)]);
    expect(m.get("a")).toBe(75);
    expect(m.get(null)).toBe(10);
  });
});
