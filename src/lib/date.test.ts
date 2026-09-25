import { describe, expect, it } from "vitest";
import { dayKey, daysUntil, formatMinutes, relativeDay } from "./date";

describe("date helpers", () => {
  const today = new Date(2026, 2, 28, 23, 30); // late evening, across a DST change in many zones

  it("counts whole calendar days regardless of time of day", () => {
    expect(daysUntil("2026-03-29", today)).toBe(1);
    expect(daysUntil("2026-03-28", today)).toBe(0);
    expect(daysUntil("2026-03-25", today)).toBe(-3);
    expect(daysUntil("2026-04-28", today)).toBe(31);
  });

  it("formats keys in local time", () => {
    expect(dayKey(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("describes relative days", () => {
    expect(relativeDay("2026-03-28", today)).toBe("today");
    expect(relativeDay("2026-03-29", today)).toBe("tomorrow");
    expect(relativeDay("2026-03-26", today)).toBe("2 days ago");
  });

  it("formats minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(135)).toBe("2h 15m");
  });
});
