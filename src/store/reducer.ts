import type { AppState, Course, Lesson, Settings, StudySession, Todo } from "../types";

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  dailyGoalMinutes: 120,
};

export function emptyState(): AppState {
  return {
    version: 2,
    courses: [],
    todos: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: 0,
  };
}

export type Action =
  | { type: "course/add"; course: Course }
  | { type: "course/update"; id: string; patch: Partial<Omit<Course, "id" | "lessons">> }
  | { type: "course/delete"; id: string }
  | { type: "lesson/add"; courseId: string; lesson: Lesson }
  | { type: "lesson/toggle"; courseId: string; lessonId: string }
  | { type: "lesson/rename"; courseId: string; lessonId: string; name: string }
  | { type: "lesson/delete"; courseId: string; lessonId: string }
  | { type: "todo/add"; todo: Todo }
  | { type: "todo/update"; id: string; patch: Partial<Omit<Todo, "id">> }
  | { type: "todo/toggle"; id: string; at: number }
  | { type: "todo/delete"; id: string }
  | { type: "todo/clearDone" }
  | { type: "session/add"; session: StudySession }
  | { type: "session/delete"; id: string }
  | { type: "settings/update"; patch: Partial<Settings> }
  /** Replaces the whole state (cloud pull, backup import). Keeps the given updatedAt. */
  | { type: "hydrate"; state: AppState }
  | { type: "reset" };

function mapCourse(state: AppState, id: string, fn: (c: Course) => Course): Course[] {
  return state.courses.map((c) => (c.id === id ? fn(c) : c));
}

function mapLessons(state: AppState, courseId: string, fn: (l: Lesson[]) => Lesson[]): Course[] {
  return mapCourse(state, courseId, (c) => ({ ...c, lessons: fn(c.lessons) }));
}

function apply(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "course/add":
      return { ...state, courses: [...state.courses, action.course] };
    case "course/update":
      return { ...state, courses: mapCourse(state, action.id, (c) => ({ ...c, ...action.patch })) };
    case "course/delete":
      return {
        ...state,
        courses: state.courses.filter((c) => c.id !== action.id),
        // Keep the history, just detach it from the removed course.
        todos: state.todos.map((t) => (t.courseId === action.id ? { ...t, courseId: null } : t)),
        sessions: state.sessions.map((s) => (s.courseId === action.id ? { ...s, courseId: null } : s)),
      };

    case "lesson/add":
      return { ...state, courses: mapLessons(state, action.courseId, (ls) => [...ls, action.lesson]) };
    case "lesson/toggle":
      return {
        ...state,
        courses: mapLessons(state, action.courseId, (ls) =>
          ls.map((l) => (l.id === action.lessonId ? { ...l, done: !l.done } : l)),
        ),
      };
    case "lesson/rename":
      return {
        ...state,
        courses: mapLessons(state, action.courseId, (ls) =>
          ls.map((l) => (l.id === action.lessonId ? { ...l, name: action.name } : l)),
        ),
      };
    case "lesson/delete":
      return {
        ...state,
        courses: mapLessons(state, action.courseId, (ls) => ls.filter((l) => l.id !== action.lessonId)),
      };

    case "todo/add":
      return { ...state, todos: [...state.todos, action.todo] };
    case "todo/update":
      return { ...state, todos: state.todos.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)) };
    case "todo/toggle":
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, done: !t.done, completedAt: t.done ? null : action.at } : t,
        ),
      };
    case "todo/delete":
      return { ...state, todos: state.todos.filter((t) => t.id !== action.id) };
    case "todo/clearDone":
      return { ...state, todos: state.todos.filter((t) => !t.done) };

    case "session/add":
      // Idempotent: a timer block has a fixed id, so replays can't double-log it.
      if (state.sessions.some((s) => s.id === action.session.id)) return state;
      return { ...state, sessions: [...state.sessions, action.session] };
    case "session/delete":
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };

    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "hydrate":
      return action.state;
    case "reset":
      return emptyState();
  }
}

export function reducer(state: AppState, action: Action): AppState {
  const next = apply(state, action);
  if (next === state || action.type === "hydrate") return next;
  return { ...next, updatedAt: Date.now() };
}
