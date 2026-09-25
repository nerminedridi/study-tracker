import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { ConfirmDelete, DueBadge, EmptyState, InlineEdit, ProgressBar } from "../components/ui";
import { dayKey, formatDay, formatMinutes } from "../lib/date";
import { uid } from "../lib/id";
import { courseProgress } from "../lib/stats";
import { useStore } from "../store/context";
import { useTimer } from "../timer/context";
import { ColorPicker } from "./Courses";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const { setCourse, setMode, start, timer } = useTimer();
  const [lessonName, setLessonName] = useState("");

  const course = state.courses.find((c) => c.id === id);
  if (!course) {
    return (
      <div className="page">
        <EmptyState title="Course not found">
          It may have been deleted. <Link to="/courses">Back to courses</Link>
        </EmptyState>
      </div>
    );
  }

  const courseId = course.id;
  const p = courseProgress(course);
  const sessions = state.sessions.filter((s) => s.courseId === courseId).sort((a, b) => b.start - a.start);
  const total = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const openTodos = state.todos.filter((t) => t.courseId === courseId && !t.done).length;

  function addLesson(e: FormEvent) {
    e.preventDefault();
    const name = lessonName.trim();
    if (!name) return;
    dispatch({ type: "lesson/add", courseId, lesson: { id: uid(), name, done: false } });
    setLessonName("");
  }

  function focusOnThis() {
    if (timer.status === "idle") {
      setMode("focus");
      setCourse(courseId);
      start();
    } else {
      setCourse(courseId);
    }
    navigate("/focus");
  }

  return (
    <div className="page">
      <Link to="/courses" className="back-link">
        <Icon name="back" size={14} /> Courses
      </Link>

      <header className="page-head">
        <div className="title-edit">
          <span className="dot big" style={{ background: course.color }} />
          <InlineEdit
            className="h1"
            label="course name"
            value={course.name}
            onSave={(name) => dispatch({ type: "course/update", id: courseId, patch: { name } })}
          />
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={focusOnThis}>
            <Icon name="play" size={16} /> Study this
          </button>
          <ConfirmDelete
            label="Delete course"
            onConfirm={() => {
              dispatch({ type: "course/delete", id: courseId });
              navigate("/courses");
            }}
          />
        </div>
      </header>

      <section className="grid-3">
        <div className="card">
          <div className="stat-label">Exam date</div>
          <input
            type="date"
            aria-label="Exam date"
            value={course.examDate ?? ""}
            onChange={(e) => dispatch({ type: "course/update", id: courseId, patch: { examDate: e.target.value || null } })}
          />
          <div className="stat-hint">{course.examDate ? <DueBadge date={course.examDate} prefix="Exam" /> : "No exam set"}</div>
        </div>
        <div className="card">
          <div className="stat-label">Progress</div>
          <div className="stat-value">{p}%</div>
          <ProgressBar value={p} color={course.color} />
        </div>
        <div className="card">
          <div className="stat-label">Time studied</div>
          <div className="stat-value">{formatMinutes(total)}</div>
          <div className="stat-hint">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} · <Link to="/tasks">{openTodos} open tasks</Link>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Lessons</h2>
            <span className="muted small">
              {course.lessons.filter((l) => l.done).length}/{course.lessons.length} done
            </span>
          </div>
          <form className="inline-form" onSubmit={addLesson}>
            <input value={lessonName} onChange={(e) => setLessonName(e.target.value)} placeholder="Add a lesson or chapter…" aria-label="New lesson" />
            <button className="btn btn-primary" type="submit">
              Add
            </button>
          </form>
          {course.lessons.length ? (
            <ul className="list">
              {course.lessons.map((l) => (
                <li key={l.id} className={`item${l.done ? " done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={l.done}
                    aria-label={`Mark ${l.name} done`}
                    onChange={() => dispatch({ type: "lesson/toggle", courseId, lessonId: l.id })}
                  />
                  <InlineEdit
                    className="item-text"
                    label="lesson name"
                    value={l.name}
                    onSave={(name) => dispatch({ type: "lesson/rename", courseId, lessonId: l.id, name })}
                  />
                  <ConfirmDelete label="Delete lesson" onConfirm={() => dispatch({ type: "lesson/delete", courseId, lessonId: l.id })} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No lessons yet">Break the course into chapters to track progress.</EmptyState>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h2>Notes</h2>
            <textarea
              rows={8}
              value={course.note}
              onChange={(e) => dispatch({ type: "course/update", id: courseId, patch: { note: e.target.value } })}
              placeholder="Formulas, weak spots, exam room, anything…"
              aria-label="Notes"
            />
          </div>
          <div className="card">
            <h2>Color</h2>
            <ColorPicker value={course.color} onChange={(color) => dispatch({ type: "course/update", id: courseId, patch: { color } })} />
          </div>
          <div className="card">
            <h2>Study log</h2>
            {sessions.length ? (
              <ul className="list">
                {sessions.slice(0, 8).map((s) => (
                  <li key={s.id} className="item">
                    <span className="item-text">
                      {formatDay(dayKey(s.start))} ·{" "}
                      {new Date(s.start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="muted small">{formatMinutes(s.minutes)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No sessions yet. Use “Study this” to start a focus timer.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
