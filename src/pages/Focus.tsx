import { useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { ConfirmDelete, ProgressBar } from "../components/ui";
import { dayKey, formatMinutes } from "../lib/date";
import { uid } from "../lib/id";
import { minutesOn } from "../lib/stats";
import { useStore } from "../store/context";
import { useTimer } from "../timer/context";
import { formatClock, type TimerMode } from "../timer/timer";
import type { Settings } from "../types";

const MODES: { mode: TimerMode; label: string }[] = [
  { mode: "focus", label: "Focus" },
  { mode: "short", label: "Short break" },
  { mode: "long", label: "Long break" },
];

function Ring({ fraction, children, mode }: { fraction: number; children: ReactNode; mode: TimerMode }) {
  const r = 110;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring ring-${mode}`}>
      <svg viewBox="0 0 260 260" aria-hidden="true">
        <circle cx="130" cy="130" r={r} className="ring-track" />
        <circle
          cx="130"
          cy="130"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform="rotate(-90 130 130)"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

function NumberSetting({ label, field, min, max }: { label: string; field: keyof Omit<Settings, "theme">; min: number; max: number }) {
  const { state, dispatch } = useStore();
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={state.settings[field]}
        onChange={(e) => {
          const v = Math.round(Number(e.target.value));
          if (v >= min && v <= max) dispatch({ type: "settings/update", patch: { [field]: v } });
        }}
      />
    </label>
  );
}

export default function Focus() {
  const { state, dispatch } = useStore();
  const { timer, remainingMs, totalMs, start, pause, reset, skip, setMode, setCourse, finishEarly, resetRounds } = useTimer();
  const { courses, sessions, settings } = state;
  const [manualMin, setManualMin] = useState("30");
  const [manualCourse, setManualCourse] = useState("");

  const today = dayKey();
  const todayMin = minutesOn(sessions, today);
  const todaySessions = sessions.filter((s) => dayKey(s.start) === today).sort((a, b) => b.start - a.start);
  const courseName = (id: string | null) => courses.find((c) => c.id === id)?.name ?? "General";
  const running = timer.status === "running";
  const rounds = timer.completedFocus % settings.longBreakEvery;

  function logManual(e: FormEvent) {
    e.preventDefault();
    const minutes = Math.round(Number(manualMin));
    if (!(minutes > 0 && minutes <= 720)) return;
    dispatch({
      type: "session/add",
      session: { id: uid(), courseId: manualCourse || null, start: Date.now() - minutes * 60_000, minutes, source: "manual" },
    });
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            {formatMinutes(todayMin)} today · goal {formatMinutes(settings.dailyGoalMinutes)}
          </p>
          <h1>Focus</h1>
        </div>
      </header>

      <section className="grid-2 focus-layout">
        <div className="card timer-card">
          <div className="segmented" role="tablist" aria-label="Timer mode">
            {MODES.map((m) => (
              <button
                key={m.mode}
                role="tab"
                aria-selected={timer.mode === m.mode}
                className={timer.mode === m.mode ? "active" : ""}
                onClick={() => setMode(m.mode)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <Ring fraction={totalMs ? 1 - remainingMs / totalMs : 0} mode={timer.mode}>
            <div className="clock" aria-live="off">
              {formatClock(remainingMs)}
            </div>
            <div className="muted small">
              {timer.mode === "focus" ? courseName(timer.courseId) : "Take a breather"}
              {timer.status === "paused" && " · paused"}
            </div>
          </Ring>

          <div className="timer-controls">
            <button className="icon-btn big" onClick={reset} aria-label="Reset" title="Reset">
              <Icon name="reset" />
            </button>
            {running ? (
              <button className="btn btn-primary btn-lg" onClick={pause}>
                <Icon name="pause" /> Pause
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={start}>
                <Icon name="play" /> {timer.status === "paused" ? "Resume" : "Start"}
              </button>
            )}
            <button className="icon-btn big" onClick={skip} aria-label="Skip to next" title="Skip to next">
              <Icon name="skip" />
            </button>
          </div>

          {timer.mode === "focus" && timer.status !== "idle" && (
            <button className="btn btn-ghost btn-sm" onClick={finishEarly}>
              Finish early &amp; log time
            </button>
          )}

          <label className="field">
            <span>Studying</span>
            <select value={timer.courseId ?? ""} onChange={(e) => setCourse(e.target.value || null)}>
              <option value="">General (no course)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounds" title={`Long break after ${settings.longBreakEvery} focus blocks`}>
            {Array.from({ length: settings.longBreakEvery }, (_, i) => (
              <span key={i} className={`round${i < rounds ? " filled" : ""}`} />
            ))}
            <span className="muted small">
              {timer.completedFocus} block{timer.completedFocus === 1 ? "" : "s"} done
            </span>
            {timer.completedFocus > 0 && (
              <button className="link-btn small" onClick={resetRounds}>
                reset
              </button>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2>Today</h2>
              <span className="muted small">{Math.min(100, Math.round((todayMin / settings.dailyGoalMinutes) * 100))}% of goal</span>
            </div>
            <ProgressBar value={Math.min(100, (todayMin / settings.dailyGoalMinutes) * 100)} />
            {todaySessions.length ? (
              <ul className="list">
                {todaySessions.map((s) => (
                  <li key={s.id} className="item">
                    <span className="item-text">
                      {new Date(s.start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {courseName(s.courseId)}
                      {s.source === "manual" && <span className="muted small"> (manual)</span>}
                    </span>
                    <span className="muted small">{formatMinutes(s.minutes)}</span>
                    <ConfirmDelete label="Delete session" onConfirm={() => dispatch({ type: "session/delete", id: s.id })} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No sessions yet today.</p>
            )}
          </div>

          <form className="card" onSubmit={logManual}>
            <h2>Log time manually</h2>
            <p className="muted small">Studied without the timer? Add it here.</p>
            <div className="form-row tight">
              <label className="field">
                <span>Minutes</span>
                <input type="number" min={1} max={720} value={manualMin} onChange={(e) => setManualMin(e.target.value)} />
              </label>
              <label className="field grow">
                <span>Course</span>
                <select value={manualCourse} onChange={(e) => setManualCourse(e.target.value)}>
                  <option value="">General</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" type="submit">
                Log
              </button>
            </div>
          </form>

          <details className="card">
            <summary>
              <h2>Timer settings</h2>
            </summary>
            <div className="settings-grid">
              <NumberSetting label="Focus (min)" field="focusMinutes" min={1} max={180} />
              <NumberSetting label="Short break (min)" field="shortBreakMinutes" min={1} max={60} />
              <NumberSetting label="Long break (min)" field="longBreakMinutes" min={1} max={90} />
              <NumberSetting label="Long break every" field="longBreakEvery" min={2} max={12} />
              <NumberSetting label="Daily goal (min)" field="dailyGoalMinutes" min={10} max={960} />
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
