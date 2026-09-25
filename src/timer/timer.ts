import type { Settings } from "../types";

export type TimerMode = "focus" | "short" | "long";

export interface TimerSnapshot {
  mode: TimerMode;
  status: "idle" | "running" | "paused";
  /** Epoch ms when a running timer hits zero. */
  endsAt: number | null;
  /** Remaining ms while idle or paused. */
  remainingMs: number;
  /** Epoch ms when the current focus block was first started. */
  startedAt: number | null;
  courseId: string | null;
  /** Focus blocks finished since the counter was last reset. */
  completedFocus: number;
}

export const TIMER_KEY = "study-tracker:timer";

export function modeMinutes(mode: TimerMode, s: Settings): number {
  if (mode === "focus") return s.focusMinutes;
  if (mode === "short") return s.shortBreakMinutes;
  return s.longBreakMinutes;
}

export function idleTimer(mode: TimerMode, settings: Settings, keep?: Partial<TimerSnapshot>): TimerSnapshot {
  return {
    mode,
    status: "idle",
    endsAt: null,
    remainingMs: modeMinutes(mode, settings) * 60_000,
    startedAt: null,
    courseId: keep?.courseId ?? null,
    completedFocus: keep?.completedFocus ?? 0,
  };
}

export function remaining(t: TimerSnapshot, now = Date.now()): number {
  return t.status === "running" && t.endsAt ? Math.max(0, t.endsAt - now) : t.remainingMs;
}

/** Break that follows a finished focus block. */
export function nextBreak(completedFocus: number, settings: Settings): TimerMode {
  return completedFocus > 0 && completedFocus % settings.longBreakEvery === 0 ? "long" : "short";
}

export function loadTimer(settings: Settings): TimerSnapshot {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (raw) {
      const t = JSON.parse(raw) as TimerSnapshot;
      if (t && (t.mode === "focus" || t.mode === "short" || t.mode === "long")) return t;
    }
  } catch {
    // ignore corrupt data
  }
  return idleTimer("focus", settings);
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
