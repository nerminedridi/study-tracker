import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "../types";
import { normalizeState } from "./storage";

const TABLE = "study_data";

export async function pullRemote(client: SupabaseClient, userId: string): Promise<AppState | null> {
  const { data, error } = await client.from(TABLE).select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? normalizeState(data.data) : null;
}

export async function pushRemote(client: SupabaseClient, userId: string, state: AppState): Promise<void> {
  const { error } = await client
    .from(TABLE)
    .upsert({ user_id: userId, data: state, updated_at: new Date(state.updatedAt || Date.now()).toISOString() });
  if (error) throw error;
}

function unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const ids = new Set(remote.map((x) => x.id));
  return [...remote, ...local.filter((x) => !ids.has(x.id))];
}

/**
 * Used the first time this device syncs with an account: nothing is lost,
 * items are combined by id and the account's copy wins on duplicates.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  return {
    version: 2,
    courses: unionById(local.courses, remote.courses),
    todos: unionById(local.todos, remote.todos),
    sessions: unionById(local.sessions, remote.sessions),
    settings: remote.updatedAt ? remote.settings : local.settings,
    updatedAt: Date.now(),
  };
}
