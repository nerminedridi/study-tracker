import { createContext, useContext } from "react";
import type { TimerMode, TimerSnapshot } from "./timer";

export interface TimerValue {
  timer: TimerSnapshot;
  remainingMs: number;
  totalMs: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setMode: (mode: TimerMode) => void;
  setCourse: (courseId: string | null) => void;
  finishEarly: () => void;
  resetRounds: () => void;
}

export const TimerContext = createContext<TimerValue | null>(null);

export function useTimer(): TimerValue {
  const value = useContext(TimerContext);
  if (!value) throw new Error("useTimer must be used inside <TimerProvider>");
  return value;
}
