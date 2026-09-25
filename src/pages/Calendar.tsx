import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { IconButton } from "../components/ui";
import { dayKey, formatDay, formatMinutes } from "../lib/date";
import { minutesByDay } from "../lib/stats";
import { useStore } from "../store/context";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first grid of 6 weeks covering the given month. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

export default function CalendarPage() {
  const { state } = useStore();
  const { courses, todos, sessions, settings } = state;
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(dayKey(now));
  const today = dayKey(now);

  const studied = minutesByDay(sessions);
  const exams = new Map<string, typeof courses>();
  for (const c of courses) if (c.examDate) exams.set(c.examDate, [...(exams.get(c.examDate) ?? []), c]);
  const due = new Map<string, typeof todos>();
  for (const t of todos) if (t.dueDate) due.set(t.dueDate, [...(due.get(t.dueDate) ?? []), t]);

  const cells = monthGrid(cursor.year, cursor.month);
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const selExams = exams.get(selected) ?? [];
  const selTodos = due.get(selected) ?? [];
  const selMinutes = studied.get(selected) ?? 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Exams, deadlines and study days</p>
          <h1>Calendar</h1>
        </div>
      </header>

      <section className="grid-cal">
        <div className="card">
          <div className="card-head">
            <IconButton icon="back" label="Previous month" onClick={() => move(-1)} />
            <h2 className="cal-title">{title}</h2>
            <IconButton icon="chevron" label="Next month" onClick={() => move(1)} />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
                setSelected(today);
              }}
            >
              Today
            </button>
          </div>

          <div className="cal" role="grid" aria-label={title}>
            {WEEKDAYS.map((w) => (
              <div key={w} className="cal-weekday" role="columnheader">
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const key = dayKey(d);
              const mins = studied.get(key) ?? 0;
              const level = mins === 0 ? 0 : Math.min(4, Math.ceil((mins / settings.dailyGoalMinutes) * 4));
              const dayExams = exams.get(key) ?? [];
              const dayTodos = (due.get(key) ?? []).filter((t) => !t.done);
              const classes = [
                "cal-day",
                d.getMonth() !== cursor.month && "outside",
                key === today && "today",
                key === selected && "selected",
                `lvl-${level}`,
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button key={key} role="gridcell" className={classes} onClick={() => setSelected(key)} aria-label={`${formatDay(key)}${dayExams.length ? `, ${dayExams.length} exam` : ""}${dayTodos.length ? `, ${dayTodos.length} tasks due` : ""}${mins ? `, studied ${formatMinutes(mins)}` : ""}`}>
                  <span className="cal-num">{d.getDate()}</span>
                  {dayExams.map((c) => (
                    <span key={c.id} className="cal-exam" style={{ background: c.color }}>
                      {c.name}
                    </span>
                  ))}
                  {dayTodos.length > 0 && <span className="cal-due">{dayTodos.length} due</span>}
                </button>
              );
            })}
          </div>
          <div className="cal-legend small muted">
            <span>
              <span className="swatch-mini lvl-1" /> <span className="swatch-mini lvl-2" /> <span className="swatch-mini lvl-4" /> study time (vs. daily goal)
            </span>
            <span>
              <span className="cal-exam legend-exam">Exam</span> exam day
            </span>
            <span>
              <span className="cal-due">n due</span> open tasks
            </span>
          </div>
        </div>

        <div className="card">
          <h2>{formatDay(selected, { weekday: "long", month: "long", day: "numeric" })}</h2>
          <p className="muted small">{selMinutes ? `Studied ${formatMinutes(selMinutes)}` : "No study time logged"}</p>
          {selExams.map((c) => (
            <Link key={c.id} to={`/courses/${c.id}`} className="cal-detail-exam" style={{ borderLeftColor: c.color }}>
              <Icon name="book" size={14} /> {c.name} exam
            </Link>
          ))}
          {selTodos.length > 0 ? (
            <ul className="list">
              {selTodos.map((t) => (
                <li key={t.id} className={`item${t.done ? " done" : ""}`}>
                  <span className={`prio prio-${t.priority}`}>{t.priority}</span>
                  <span className="item-text">{t.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            !selExams.length && <p className="muted small">Nothing scheduled.</p>
          )}
          <Link to="/tasks" className="link-more">
            Manage tasks <Icon name="chevron" size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
