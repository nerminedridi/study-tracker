import { Link } from "react-router";
import { DueBadge, EmptyState, ProgressBar, StatTile } from "../components/ui";
import { Icon } from "../components/Icon";
import { dayKey, daysUntil, formatDay, formatMinutes } from "../lib/date";
import { courseProgress, currentStreak, minutesOn, overallProgress, startOfWeek, totalMinutes } from "../lib/stats";
import { useStore } from "../store/context";
import { useTimer } from "../timer/context";
import { TodoItem } from "./Tasks";

function greeting(hour: number) {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { state } = useStore();
  const { timer } = useTimer();
  const { courses, todos, sessions, settings } = state;
  const today = dayKey();

  const todayMin = minutesOn(sessions, today);
  const goalPct = Math.min(100, Math.round((todayMin / settings.dailyGoalMinutes) * 100));
  const streak = currentStreak(sessions);

  const upcomingExams = courses
    .filter((c) => c.examDate && daysUntil(c.examDate) >= 0)
    .sort((a, b) => a.examDate!.localeCompare(b.examDate!));
  const nextExam = upcomingExams[0];

  const focusTodos = todos
    .filter((t) => !t.done && (!t.dueDate || t.dueDate <= today))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 6);
  const overdue = todos.filter((t) => !t.done && t.dueDate && t.dueDate < today).length;

  const isNew = !courses.length && !todos.length && !sessions.length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatDay(today, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1>{greeting(new Date().getHours())}</h1>
        </div>
        <Link to="/focus" className="btn btn-primary">
          <Icon name="play" size={16} /> {timer.status === "idle" ? "Start focus" : "Open timer"}
        </Link>
      </header>

      {isNew && (
        <div className="card welcome">
          <h2>Welcome 👋</h2>
          <p className="muted">Set things up in three steps:</p>
          <ol>
            <li>
              <Link to="/courses">Add your courses</Link> with their exam dates and lessons.
            </li>
            <li>
              <Link to="/tasks">Write down tasks</Link> with due dates and priorities.
            </li>
            <li>
              <Link to="/focus">Start a focus session</Link>. Study time is logged automatically.
            </li>
          </ol>
        </div>
      )}

      <section className="grid-4">
        <div className="card stat">
          <div className="stat-label">Today's goal</div>
          <div className="stat-value">
            {formatMinutes(todayMin)} <span className="stat-of">/ {formatMinutes(settings.dailyGoalMinutes)}</span>
          </div>
          <ProgressBar value={goalPct} />
        </div>
        <StatTile icon="flame" label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} hint={streak ? "Keep it going!" : "Study today to start one"} />
        <StatTile label="This week" value={formatMinutes(totalMinutes(sessions, startOfWeek()))} hint={`${sessions.length} sessions total`} />
        <StatTile
          label="Next exam"
          value={nextExam ? nextExam.name : "—"}
          hint={nextExam ? <DueBadge date={nextExam.examDate!} /> : "No exams scheduled"}
        />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Due now</h2>
            {overdue > 0 && <span className="badge badge-urgent">{overdue} overdue</span>}
            <Link to="/tasks" className="link-more">
              All tasks <Icon name="chevron" size={14} />
            </Link>
          </div>
          {focusTodos.length ? (
            <ul className="list">
              {focusTodos.map((t) => (
                <TodoItem key={t.id} todo={t} compact />
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing due today 🎉">Tasks due today, overdue, or without a date show up here.</EmptyState>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Upcoming exams</h2>
            <Link to="/calendar" className="link-more">
              Calendar <Icon name="chevron" size={14} />
            </Link>
          </div>
          {upcomingExams.length ? (
            <ul className="list">
              {upcomingExams.slice(0, 5).map((c) => {
                const p = courseProgress(c);
                return (
                  <li key={c.id} className="exam-row">
                    <span className="dot" style={{ background: c.color }} />
                    <Link to={`/courses/${c.id}`} className="exam-name">
                      {c.name}
                    </Link>
                    <span className="muted small">{formatDay(c.examDate!)}</span>
                    <DueBadge date={c.examDate!} />
                    <div className="exam-progress">
                      <ProgressBar value={p} color={c.color} />
                      <span className="small muted">{p}% of lessons</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No upcoming exams">Add an exam date to a course to see a countdown.</EmptyState>
          )}
        </div>
      </section>

      {courses.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Course progress</h2>
            <span className="muted small">{overallProgress(courses)}% overall</span>
          </div>
          <div className="course-bars">
            {courses.map((c) => (
              <Link to={`/courses/${c.id}`} key={c.id} className="course-bar">
                <span className="course-bar-name">{c.name}</span>
                <ProgressBar value={courseProgress(c)} color={c.color} />
                <span className="small muted">
                  {c.lessons.filter((l) => l.done).length}/{c.lessons.length}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
