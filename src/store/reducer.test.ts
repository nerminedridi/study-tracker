import { describe, expect, it } from "vitest";
import type { Course, StudySession, Todo } from "../types";
import { emptyState, reducer } from "./reducer";

const course: Course = { id: "c1", name: "Physics", color: "#2a78d6", examDate: null, lessons: [], note: "", createdAt: 1 };
const todo: Todo = { id: "t1", text: "Read ch. 2", done: false, priority: "high", dueDate: null, courseId: "c1", createdAt: 1, completedAt: null };
const session: StudySession = { id: "s1", courseId: "c1", start: 1, minutes: 25, source: "timer" };

function seeded() {
  let s = emptyState();
  s = reducer(s, { type: "course/add", course });
  s = reducer(s, { type: "todo/add", todo });
  s = reducer(s, { type: "session/add", session });
  return s;
}

describe("reducer", () => {
  it("stamps updatedAt on changes", () => {
    expect(reducer(emptyState(), { type: "course/add", course }).updatedAt).toBeGreaterThan(0);
  });

  it("manages lessons inside a course", () => {
    let s = seeded();
    s = reducer(s, { type: "lesson/add", courseId: "c1", lesson: { id: "l1", name: "Kinematics", done: false } });
    s = reducer(s, { type: "lesson/toggle", courseId: "c1", lessonId: "l1" });
    s = reducer(s, { type: "lesson/rename", courseId: "c1", lessonId: "l1", name: "Motion" });
    expect(s.courses[0].lessons).toEqual([{ id: "l1", name: "Motion", done: true }]);
    s = reducer(s, { type: "lesson/delete", courseId: "c1", lessonId: "l1" });
    expect(s.courses[0].lessons).toEqual([]);
  });

  it("keeps tasks and history when a course is deleted", () => {
    const s = reducer(seeded(), { type: "course/delete", id: "c1" });
    expect(s.courses).toHaveLength(0);
    expect(s.todos[0].courseId).toBeNull();
    expect(s.sessions[0].courseId).toBeNull();
  });

  it("records completion time when toggling a task", () => {
    let s = reducer(seeded(), { type: "todo/toggle", id: "t1", at: 500 });
    expect(s.todos[0]).toMatchObject({ done: true, completedAt: 500 });
    s = reducer(s, { type: "todo/toggle", id: "t1", at: 600 });
    expect(s.todos[0]).toMatchObject({ done: false, completedAt: null });
    s = reducer(reducer(s, { type: "todo/toggle", id: "t1", at: 700 }), { type: "todo/clearDone" });
    expect(s.todos).toHaveLength(0);
  });

  it("ignores a session that was already logged", () => {
    const s = seeded();
    expect(reducer(s, { type: "session/add", session })).toBe(s);
  });

  it("hydrate keeps the incoming timestamp", () => {
    const incoming = { ...emptyState(), updatedAt: 42 };
    expect(reducer(seeded(), { type: "hydrate", state: incoming }).updatedAt).toBe(42);
  });
});
