import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Lesson = {
  id: number;
  name: string;
  done: boolean;
};

type Todo = {
  id: number;
  text: string;
  done: boolean;
};

type Course = {
  id: number;
  name: string;
  examDate: string;
  lessons: Lesson[];
  note: string;
};

function daysLeft(date: string) {
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  const [todoInput, setTodoInput] = useState("");
  const [lessonInput, setLessonInput] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const [dark, setDark] = useState(false);

  /* THEME */
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  /* LOAD */
  useEffect(() => {
    const c = localStorage.getItem("courses");
    const t = localStorage.getItem("todos");

    if (c) setCourses(JSON.parse(c));
    if (t) setTodos(JSON.parse(t));
  }, []);

  /* SAVE */
  useEffect(() => {
    localStorage.setItem("courses", JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  /* ADD COURSE */
  function addCourse() {
    if (!name || !date) return;

    setCourses((p) => [
      ...p,
      {
        id: Date.now(),
        name,
        examDate: date,
        lessons: [],
        note: ""
      }
    ]);

    setName("");
    setDate("");
  }

  /* TODO */
  function addTodo() {
    if (!todoInput) return;
    setTodos((p) => [
      ...p,
      { id: Date.now(), text: todoInput, done: false }
    ]);
    setTodoInput("");
  }

  function toggleTodo(id: number) {
    setTodos((p) =>
      p.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  /* LESSONS */
  function addLesson(courseId: number) {
    const text = lessonInput[courseId];
    if (!text) return;

    setCourses((p) =>
      p.map((c) =>
        c.id === courseId
          ? {
              ...c,
              lessons: [
                ...c.lessons,
                { id: Date.now(), name: text, done: false }
              ]
            }
          : c
      )
    );

    setLessonInput((p) => ({ ...p, [courseId]: "" }));
  }

  function toggleLesson(courseId: number, lessonId: number) {
    setCourses((p) =>
      p.map((c) =>
        c.id === courseId
          ? {
              ...c,
              lessons: c.lessons.map((l) =>
                l.id === lessonId ? { ...l, done: !l.done } : l
              )
            }
          : c
      )
    );
  }

  function updateNote(courseId: number, value: string) {
    setCourses((p) =>
      p.map((c) =>
        c.id === courseId ? { ...c, note: value } : c
      )
    );
  }

  /* PROGRESS */
  function progress(c: Course) {
    if (!c.lessons.length) return 0;
    return Math.round(
      (c.lessons.filter((l) => l.done).length / c.lessons.length) * 100
    );
  }

  function color(p: number) {
    if (p < 40) return "#ef4444";
    if (p < 70) return "#facc15";
    return "#22c55e";
  }

  /* EXAMS SORTED */
  const exams = useMemo(() => {
    return [...courses].sort(
      (a, b) => daysLeft(a.examDate) - daysLeft(b.examDate)
    );
  }, [courses]);

  return (
    <div className="container">

      {/* HEADER */}
      <h1>📚 Study Tracker</h1>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={() => setDark(!dark)}>
          {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      {/* DASHBOARD */}
      <div className="card dashboard">
        <div className="stat"><div className="stat-number">{courses.length}</div><div className="stat-label">Courses</div></div>
        <div className="stat"><div className="stat-number">{courses.reduce((a,c)=>a+c.lessons.length,0)}</div><div className="stat-label">Lessons</div></div>
        <div className="stat"><div className="stat-number">{courses.reduce((a,c)=>a+c.lessons.filter(l=>l.done).length,0)}</div><div className="stat-label">Done</div></div>
        <div className="stat"><div className="stat-number">{progress({id:0,name:"",examDate:"",lessons:courses.flatMap(c=>c.lessons),note:""})}%</div><div className="stat-label">Progress</div></div>
      </div>

      {/* TODO + EXAMS SIDE BY SIDE FIX */}
      <div className="top-row">

        <div className="card">
          <h3>🧠 To Do</h3>

          <input
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            placeholder="Add task..."
          />
          <button onClick={addTodo}>Add</button>

          <ul>
            {todos.map((t) => (
              <li key={t.id}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} />
                {t.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>⏳ Exams</h3>
          <ul>
            {exams.map((c) => (
              <li key={c.id}>
                {c.name} : {c.examDate} : d-{daysLeft(c.examDate)}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>📘 Add Course</h3>
          <div className="form-bar">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Course" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button onClick={addCourse}>Add</button>
          </div>
        </div>

      </div>

      {/* COURSES */}
      <div className="courses">
        {courses.map((c) => {
          const p = progress(c);

          return (
            <div className={`card ${p < 40 ? "urgent" : p < 70 ? "soon" : "safe"}`} key={c.id}>

              <h3 onClick={() =>
                setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))
              }>
                📘 {c.name}
              </h3>

              {/* PROGRESS */}
              <div className="progress-bar">
                <div style={{
                  width: `${p}%`,
                  height: 10,
                  background: color(p)
                }} />
              </div>

              {/* COLLAPSE */}
              {open[c.id] && (
                <>
                  <input
                    value={lessonInput[c.id] || ""}
                    onChange={(e) =>
                      setLessonInput({ ...lessonInput, [c.id]: e.target.value })
                    }
                    placeholder="New lesson"
                  />
                  <button onClick={() => addLesson(c.id)}>Add</button>

                  <ul>
                    {c.lessons.map((l) => (
                      <li key={l.id}>
                        <input
                          type="checkbox"
                          checked={l.done}
                          onChange={() => toggleLesson(c.id, l.id)}
                        />
                        {l.name}
                      </li>
                    ))}
                  </ul>

                  <textarea
                    value={c.note}
                    onChange={(e) => updateNote(c.id, e.target.value)}
                    placeholder="Notes..."
                  />
                </>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}