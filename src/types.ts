export type Priority = "low" | "medium" | "high";
export type Theme = "system" | "light" | "dark";

export interface Lesson {
  id: string;
  name: string;
  done: boolean;
}

export interface Course {
  id: string;
  name: string;
  color: string;
  /** Local calendar date, `YYYY-MM-DD`, or null when no exam is scheduled. */
  examDate: string | null;
  lessons: Lesson[];
  note: string;
  createdAt: number;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  /** Local calendar date, `YYYY-MM-DD`. */
  dueDate: string | null;
  courseId: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface StudySession {
  id: string;
  courseId: string | null;
  /** Epoch ms when the session started. */
  start: number;
  minutes: number;
  source: "timer" | "manual";
}

export interface Settings {
  theme: Theme;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  dailyGoalMinutes: number;
}

export interface AppState {
  version: 2;
  courses: Course[];
  todos: Todo[];
  sessions: StudySession[];
  settings: Settings;
  /** Epoch ms of the last local change; used for cloud sync. */
  updatedAt: number;
}
