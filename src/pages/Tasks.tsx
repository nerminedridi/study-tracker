import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { ConfirmDelete, DueBadge, EmptyState, InlineEdit } from "../components/ui";
import { dayKey } from "../lib/date";
import { uid } from "../lib/id";
import { useStore } from "../store/context";
import type { Priority, Todo } from "../types";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function byUrgency(a: Todo, b: Todo) {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
    a.createdAt - b.createdAt
  );
}

export function TodoItem({ todo, compact }: { todo: Todo; compact?: boolean }) {
  const { state, dispatch } = useStore();
  const course = state.courses.find((c) => c.id === todo.courseId);

  return (
    <li className={`item todo${todo.done ? " done" : ""}`}>
      <input
        type="checkbox"
        checked={todo.done}
        aria-label={`Mark ${todo.text} ${todo.done ? "not done" : "done"}`}
        onChange={() => dispatch({ type: "todo/toggle", id: todo.id, at: Date.now() })}
      />
      <div className="todo-body">
        {compact ? (
          <span className="item-text">{todo.text}</span>
        ) : (
          <InlineEdit className="item-text" label="task" value={todo.text} onSave={(text) => dispatch({ type: "todo/update", id: todo.id, patch: { text } })} />
        )}
        <div className="todo-meta">
          <span className={`prio prio-${todo.priority}`} title={`${todo.priority} priority`}>
            {todo.priority}
          </span>
          {course && (
            <span className="tag" style={{ borderColor: course.color, color: course.color }}>
              {course.name}
            </span>
          )}
          {todo.dueDate && <DueBadge date={todo.dueDate} done={todo.done} />}
        </div>
      </div>
      {!compact && (
        <div className="todo-edit">
          <select
            aria-label="Priority"
            value={todo.priority}
            onChange={(e) => dispatch({ type: "todo/update", id: todo.id, patch: { priority: e.target.value as Priority } })}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="date"
            aria-label="Due date"
            value={todo.dueDate ?? ""}
            onChange={(e) => dispatch({ type: "todo/update", id: todo.id, patch: { dueDate: e.target.value || null } })}
          />
          <ConfirmDelete label="Delete task" onConfirm={() => dispatch({ type: "todo/delete", id: todo.id })} />
        </div>
      )}
    </li>
  );
}

type Filter = "active" | "done" | "all";

export default function Tasks() {
  const { state, dispatch } = useStore();
  const { todos, courses } = state;
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [courseId, setCourseId] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [courseFilter, setCourseFilter] = useState("");

  const today = dayKey();

  function add(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    dispatch({
      type: "todo/add",
      todo: {
        id: uid(),
        text: t,
        done: false,
        priority,
        dueDate: dueDate || null,
        courseId: courseId || null,
        createdAt: Date.now(),
        completedAt: null,
      },
    });
    setText("");
    setDueDate("");
  }

  const visible = todos.filter(
    (t) => (filter === "all" || (filter === "done") === t.done) && (!courseFilter || t.courseId === courseFilter),
  );

  const groups: { title: string; items: Todo[] }[] =
    filter === "done"
      ? [{ title: "Completed", items: [...visible].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)) }]
      : [
          { title: "Overdue", items: visible.filter((t) => !t.done && t.dueDate && t.dueDate < today) },
          { title: "Today", items: visible.filter((t) => !t.done && t.dueDate === today) },
          { title: "Upcoming", items: visible.filter((t) => !t.done && t.dueDate && t.dueDate > today) },
          { title: "No date", items: visible.filter((t) => !t.done && !t.dueDate) },
          { title: "Completed", items: visible.filter((t) => t.done) },
        ].map((g) => ({ ...g, items: g.items.sort(byUrgency) }));

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{todos.length - doneCount} open · {doneCount} done</p>
          <h1>Tasks</h1>
        </div>
        {doneCount > 0 && (
          <button className="btn btn-ghost" onClick={() => dispatch({ type: "todo/clearDone" })}>
            Clear completed
          </button>
        )}
      </header>

      <form className="card form-row" onSubmit={add}>
        <label className="field grow">
          <span>Task</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Finish problem set 3" required />
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="field">
          <span>Due</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Course</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">None</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" type="submit">
          <Icon name="plus" size={16} /> Add
        </button>
      </form>

      <div className="toolbar">
        <div className="segmented" role="tablist">
          {(["active", "done", "all"] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f === "active" ? "To do" : f === "done" ? "Done" : "All"}
            </button>
          ))}
        </div>
        {courses.length > 0 && (
          <select aria-label="Filter by course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {visible.length ? (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.title} className="card">
              <div className="card-head">
                <h2>{g.title}</h2>
                <span className="muted small">{g.items.length}</span>
              </div>
              <ul className="list">
                {g.items.map((t) => (
                  <TodoItem key={t.id} todo={t} />
                ))}
              </ul>
            </section>
          ))
      ) : (
        <EmptyState title={filter === "done" ? "Nothing completed yet" : "All clear ✨"}>
          {filter === "done" ? "Completed tasks will show up here." : "Add a task above to get started."}
        </EmptyState>
      )}
    </div>
  );
}
