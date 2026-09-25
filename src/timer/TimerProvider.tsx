import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { uid } from "../lib/id";
import { useStore } from "../store/context";
import { TimerContext, type TimerValue } from "./context";
import { formatClock, idleTimer, loadTimer, modeMinutes, nextBreak, remaining, TIMER_KEY, type TimerMode, type TimerSnapshot } from "./timer";

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = [660, 880, 990][i];
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.4);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // audio not available
  }
}

function notify(title: string, body: string) {
  chime();
  if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
    new Notification(title, { body, icon: "/favicon.svg" });
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const { settings, courses } = state;
  const [timer, setTimer] = useState<TimerSnapshot>(() => loadTimer(settings));
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef(timer);

  useEffect(() => {
    timerRef.current = timer;
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } catch {
      // ignore
    }
  }, [timer]);


  const logFocus = useCallback(
    (t: TimerSnapshot, minutes: number) => {
      if (minutes < 1) return;
      dispatch({
        type: "session/add",
        session: {
          id: t.startedAt ? `timer-${t.startedAt}` : uid(),
          courseId: t.courseId && courses.some((c) => c.id === t.courseId) ? t.courseId : null,
          start: t.startedAt ?? Date.now() - minutes * 60_000,
          minutes: Math.round(minutes),
          source: "timer",
        },
      });
    },
    [dispatch, courses],
  );

  const complete = useCallback(
    (t: TimerSnapshot) => {
      if (t.mode === "focus") {
        logFocus(t, modeMinutes("focus", settings));
        const completedFocus = t.completedFocus + 1;
        const brk = nextBreak(completedFocus, settings);
        setTimer(idleTimer(brk, settings, { courseId: t.courseId, completedFocus }));
        notify("Focus block done 🎉", `Time for a ${brk === "long" ? "long" : "short"} break.`);
      } else {
        setTimer(idleTimer("focus", settings, t));
        notify("Break's over", "Ready for the next focus block?");
      }
    },
    [logFocus, settings],
  );

  // Tick while running; completes on time even if the tab was in the background or reloaded.
  useEffect(() => {
    if (timer.status !== "running") return;
    const tick = () => {
      const t = timerRef.current;
      const n = Date.now();
      setNow(n);
      if (t.status === "running" && t.endsAt && n >= t.endsAt) {
        // Mark as handled right away so the next tick can't log the block twice.
        timerRef.current = { ...t, status: "idle" };
        complete(t);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer.status, complete]);

  // An idle timer always shows the current setting, so duration changes apply right away.
  const left = timer.status === "idle" ? modeMinutes(timer.mode, settings) * 60_000 : remaining(timer, now);

  useEffect(() => {
    const base = "Study Tracker";
    if (timer.status === "idle") {
      document.title = base;
      return;
    }
    const label = timer.mode === "focus" ? "Focus" : "Break";
    document.title = `${formatClock(left)} · ${label}${timer.status === "paused" ? " (paused)" : ""}`;
  }, [left, timer.status, timer.mode]);

  const start = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    setTimer((t) => {
      const n = Date.now();
      return {
        ...t,
        status: "running",
        endsAt: n + (t.status === "idle" ? modeMinutes(t.mode, settings) * 60_000 : t.remainingMs),
        startedAt: t.startedAt ?? n,
      };
    });
    setNow(Date.now());
  }, [settings]);

  const pause = useCallback(() => {
    setTimer((t) => (t.status === "running" ? { ...t, status: "paused", remainingMs: remaining(t), endsAt: null } : t));
  }, []);

  const reset = useCallback(() => {
    setTimer((t) => idleTimer(t.mode, settings, t));
  }, [settings]);

  const setMode = useCallback(
    (mode: TimerMode) => {
      setTimer((t) => idleTimer(mode, settings, t));
    },
    [settings],
  );

  /** Stops a focus block early and logs the time actually spent. */
  const finishEarly = useCallback(() => {
    const t = timerRef.current;
    if (t.mode !== "focus" || t.status === "idle") return;
    const spentMin = (modeMinutes("focus", settings) * 60_000 - remaining(t)) / 60_000;
    logFocus(t, spentMin);
    setTimer(idleTimer("focus", settings, t));
  }, [logFocus, settings]);

  const skip = useCallback(() => {
    const t = timerRef.current;
    if (t.mode === "focus") setTimer(idleTimer(nextBreak(t.completedFocus + 1, settings), settings, t));
    else setTimer(idleTimer("focus", settings, t));
  }, [settings]);

  const setCourse = useCallback((courseId: string | null) => setTimer((t) => ({ ...t, courseId })), []);
  const resetRounds = useCallback(() => setTimer((t) => ({ ...t, completedFocus: 0 })), []);

  // A course deleted while selected falls back to "General".
  const courseId = timer.courseId && courses.some((c) => c.id === timer.courseId) ? timer.courseId : null;
  const visibleTimer = useMemo(() => (courseId === timer.courseId ? timer : { ...timer, courseId }), [timer, courseId]);

  const value = useMemo<TimerValue>(
    () => ({
      timer: visibleTimer,
      remainingMs: left,
      totalMs: modeMinutes(visibleTimer.mode, settings) * 60_000,
      start,
      pause,
      reset,
      skip,
      setMode,
      setCourse,
      finishEarly,
      resetRounds,
    }),
    [visibleTimer, left, settings, start, pause, reset, skip, setMode, setCourse, finishEarly, resetRounds],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
