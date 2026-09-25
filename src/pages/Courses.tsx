import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { DueBadge, EmptyState, ProgressBar } from "../components/ui";
import { dayKey, formatDay, formatMinutes } from "../lib/date";
import { COURSE_COLORS, uid } from "../lib/id";
import { courseProgress, minutesByCourse } from "../lib/stats";
import { useStore } from "../store/context";

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="colors" role="radiogroup" aria-label="Color">
      {COURSE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          className={`swatch${value === c ? " selected" : ""}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

export default function Courses() {
  const { state, dispatch } = useStore();
  const { courses, sessions } = state;
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [color, setColor] = useState(COURSE_COLORS[courses.length % COURSE_COLORS.length]);

  const studied = minutesByCourse(sessions);

  // Upcoming exams first (soonest on top), then courses without an exam, then passed exams.
  const today = dayKey();
  const rank = (d: string | null) => (d === null ? 1 : d >= today ? 0 : 2);
  const sorted = [...courses].sort(
    (a, b) => rank(a.examDate) - rank(b.examDate) || (a.examDate ?? "").localeCompare(b.examDate ?? "") || a.createdAt - b.createdAt,
  );

  function add(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({
      type: "course/add",
      course: { id: uid(), name: trimmed, color, examDate: examDate || null, lessons: [], note: "", createdAt: Date.now() },
    });
    setName("");
    setExamDate("");
    setColor(COURSE_COLORS[(courses.length + 1) % COURSE_COLORS.length]);
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{courses.length} course{courses.length === 1 ? "" : "s"}</p>
          <h1>Courses</h1>
        </div>
      </header>

      <form className="card form-row" onSubmit={add}>
        <label className="field grow">
          <span>Course name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Linear Algebra" required />
        </label>
        <label className="field">
          <span>Exam date (optional)</span>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </label>
        <div className="field">
          <span>Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <button className="btn btn-primary" type="submit">
          <Icon name="plus" size={16} /> Add course
        </button>
      </form>

      {sorted.length ? (
        <div className="course-grid">
          {sorted.map((c) => {
            const p = courseProgress(c);
            const done = c.lessons.filter((l) => l.done).length;
            return (
              <Link key={c.id} to={`/courses/${c.id}`} className="card course-card" style={{ borderTopColor: c.color }}>
                <div className="course-card-head">
                  <h2>{c.name}</h2>
                  {c.examDate && <DueBadge date={c.examDate} prefix="Exam" />}
                </div>
                <ProgressBar value={p} color={c.color} />
                <div className="course-meta">
                  <span>
                    {done}/{c.lessons.length} lessons · {p}%
                  </span>
                  <span>{formatMinutes(studied.get(c.id) ?? 0)} studied</span>
                </div>
                {c.examDate && <div className="small muted">Exam on {formatDay(c.examDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>}
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No courses yet">Add your first course above. You can add lessons and notes afterwards.</EmptyState>
      )}
    </div>
  );
}
