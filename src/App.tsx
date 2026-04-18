import { useEffect, useMemo, useState } from "react";

type Lesson = {
  id: number;
  name: string;
  done: boolean;
};

type Course = {
  id: number;
  name: string;
  examDate: string;
  lessons: Lesson[]; 
  note: string;
};

function formatDDMM(date: string) {
  const d = new Date(date);
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  return `${day}/${month}`;
}

function daysLeft(date: string) {
  return Math.ceil(
    (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("study");
    if (saved) setCourses(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("study", JSON.stringify(courses));
  }, [courses]);

  function addCourse() {
    if (!name || !date) return;

    setCourses([
      ...courses,
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

  const stats = useMemo(() => {
    const totalLessons = courses.reduce((a, c) => a + c.lessons.length, 0);
    const done = courses.reduce(
      (a, c) => a + c.lessons.filter((l) => l.done).length,
      0
    );

    return {
      courses: courses.length,
      lessons: totalLessons,
      done,
      progress: totalLessons ? Math.round((done / totalLessons) * 100) : 0
    };
  }, [courses]);

  return (
    <div className="container">

      <h1>📚 Study Tracker</h1>

      {/* DASHBOARD */}
      <div className="card">
        <div>Courses: {stats.courses}</div>
        <div>Lessons: {stats.lessons}</div>
        <div>Done: {stats.done}</div>
        <div>Progress: {stats.progress}%</div>
      </div>

      {/* INPUT */}
      <div className="card">
        <input
          placeholder="Course"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button onClick={addCourse}>Add</button>
      </div>

      {/* COURSES */}
      <div className="courses">
        {courses.map((c) => (
          <div className="card" key={c.id}>
            <h3>{c.name}</h3>
            <p>
              📅 {formatDDMM(c.examDate)} ({daysLeft(c.examDate)} days left)
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}