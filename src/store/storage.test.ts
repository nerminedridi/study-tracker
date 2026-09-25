import { describe, expect, it } from "vitest";
import { emptyState } from "./reducer";
import { loadState, normalizeState, saveState, STORAGE_KEY } from "./storage";
import { mergeStates } from "./sync";

describe("storage", () => {
  it("returns an empty state when nothing is saved", () => {
    expect(loadState(localStorage).courses).toEqual([]);
  });

  it("round-trips saved state", () => {
    const s = {
      ...emptyState(),
      updatedAt: 5,
      todos: [{ id: "t", text: "x", done: false, priority: "low" as const, dueDate: null, courseId: null, createdAt: 1, completedAt: null }],
    };
    saveState(s, localStorage);
    expect(loadState(localStorage)).toEqual(s);
  });

  it("migrates data from the first version of the app", () => {
    localStorage.setItem(
      "courses",
      JSON.stringify([{ id: 1714000000000, name: "Math", examDate: "2026-10-01", lessons: [{ id: 1, name: "Limits", done: true }], note: "hi" }]),
    );
    localStorage.setItem("todos", JSON.stringify([{ id: 2, text: "Homework", done: false }]));

    const s = loadState(localStorage);
    expect(s.courses[0]).toMatchObject({ id: "1714000000000", name: "Math", examDate: "2026-10-01", note: "hi" });
    expect(s.courses[0].lessons[0]).toEqual({ id: "1", name: "Limits", done: true });
    expect(s.todos[0]).toMatchObject({ id: "2", text: "Homework", priority: "medium", dueDate: null });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("drops invalid entries from untrusted data", () => {
    const s = normalizeState({
      courses: [{ name: "" }, null, { name: "Ok", examDate: "not a date" }],
      sessions: [{ minutes: -5, start: 1 }, { minutes: 20, start: 1000 }],
      settings: { focusMinutes: "abc", theme: "dark" },
    });
    expect(s.courses).toHaveLength(1);
    expect(s.courses[0].examDate).toBeNull();
    expect(s.sessions).toHaveLength(1);
    expect(s.settings.focusMinutes).toBe(25);
    expect(s.settings.theme).toBe("dark");
  });
});

describe("mergeStates", () => {
  it("unions items by id with the account's copy winning", () => {
    const local = normalizeState({ courses: [{ id: "a", name: "Local A" }, { id: "b", name: "Only local" }] });
    const remote = normalizeState({ courses: [{ id: "a", name: "Remote A" }, { id: "c", name: "Only remote" }], updatedAt: 10 });
    const merged = mergeStates(local, remote);
    expect(merged.courses.map((c) => c.name).sort()).toEqual(["Only local", "Only remote", "Remote A"]);
  });
});
