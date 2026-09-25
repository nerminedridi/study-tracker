import { COURSE_COLORS } from "../lib/id";
import type { AppState, Course, Priority, StudySession, Todo } from "../types";
import { DEFAULT_SETTINGS, emptyState } from "./reducer";

export const STORAGE_KEY = "study-tracker:v2";
const LEGACY_COURSES_KEY = "courses";
const LEGACY_TODOS_KEY = "todos";

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const dateOrNull = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function normalizeCourse(raw: unknown, index: number): Course | null {
  if (!isObj(raw) || !str(raw.name).trim()) return null;
  return {
    id: str(raw.id) || `c-${index}-${Date.now()}`,
    name: str(raw.name).trim(),
    color: str(raw.color) || COURSE_COLORS[index % COURSE_COLORS.length],
    examDate: dateOrNull(raw.examDate),
    lessons: arr(raw.lessons)
      .filter(isObj)
      .map((l, i) => ({ id: str(l.id) || `l-${index}-${i}`, name: str(l.name), done: l.done === true }))
      .filter((l) => l.name.trim()),
    note: str(raw.note),
    createdAt: num(raw.createdAt, Date.now()),
  };
}

const PRIORITIES: Priority[] = ["low", "medium", "high"];

function normalizeTodo(raw: unknown, index: number): Todo | null {
  if (!isObj(raw) || !str(raw.text).trim()) return null;
  const done = raw.done === true;
  return {
    id: str(raw.id) || `t-${index}-${Date.now()}`,
    text: str(raw.text).trim(),
    done,
    priority: PRIORITIES.includes(raw.priority as Priority) ? (raw.priority as Priority) : "medium",
    dueDate: dateOrNull(raw.dueDate),
    courseId: typeof raw.courseId === "string" ? raw.courseId : null,
    createdAt: num(raw.createdAt, Date.now()),
    completedAt: done ? num(raw.completedAt, Date.now()) : null,
  };
}

function normalizeSession(raw: unknown): StudySession | null {
  if (!isObj(raw) || !(num(raw.minutes) > 0) || !num(raw.start)) return null;
  return {
    id: str(raw.id) || `s-${num(raw.start)}`,
    courseId: typeof raw.courseId === "string" ? raw.courseId : null,
    start: num(raw.start),
    minutes: num(raw.minutes),
    source: raw.source === "manual" ? "manual" : "timer",
  };
}

/** Coerces untrusted data (storage, cloud, imported backups) into a valid AppState. */
export function normalizeState(raw: unknown): AppState {
  const base = emptyState();
  if (!isObj(raw)) return base;
  const settings = isObj(raw.settings) ? raw.settings : {};
  const theme = settings.theme === "light" || settings.theme === "dark" ? settings.theme : "system";
  const positive = (v: unknown, d: number) => (num(v) > 0 ? num(v) : d);
  return {
    version: 2,
    courses: arr(raw.courses).map(normalizeCourse).filter((c): c is Course => c !== null),
    todos: arr(raw.todos).map(normalizeTodo).filter((t): t is Todo => t !== null),
    sessions: arr(raw.sessions).map(normalizeSession).filter((s): s is StudySession => s !== null),
    settings: {
      theme,
      focusMinutes: positive(settings.focusMinutes, DEFAULT_SETTINGS.focusMinutes),
      shortBreakMinutes: positive(settings.shortBreakMinutes, DEFAULT_SETTINGS.shortBreakMinutes),
      longBreakMinutes: positive(settings.longBreakMinutes, DEFAULT_SETTINGS.longBreakMinutes),
      longBreakEvery: positive(settings.longBreakEvery, DEFAULT_SETTINGS.longBreakEvery),
      dailyGoalMinutes: positive(settings.dailyGoalMinutes, DEFAULT_SETTINGS.dailyGoalMinutes),
    },
    updatedAt: num(raw.updatedAt),
  };
}

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Reads saved state synchronously so the first render already has the data
 * (the old version loaded in an effect and could overwrite storage with []).
 * Falls back to the data format used by the first version of the app.
 */
export function loadState(storage: Storage = localStorage): AppState {
  const saved = readJson(storage, STORAGE_KEY);
  if (saved) return normalizeState(saved);

  const legacyCourses = readJson(storage, LEGACY_COURSES_KEY);
  const legacyTodos = readJson(storage, LEGACY_TODOS_KEY);
  if (!legacyCourses && !legacyTodos) return emptyState();

  const migrated = normalizeState({ courses: legacyCourses, todos: legacyTodos, updatedAt: Date.now() });
  saveState(migrated, storage);
  return migrated;
}

export function saveState(state: AppState, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode); the app keeps working in memory.
  }
}
