import type { User } from "@supabase/supabase-js";
import { createContext, useContext, type Dispatch } from "react";
import type { AppState } from "../types";
import type { Action } from "./reducer";

export type SyncStatus = "local" | "syncing" | "synced" | "error";

export interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export interface AuthValue {
  /** False when the build has no Supabase credentials. */
  enabled: boolean;
  user: User | null;
  loading: boolean;
  sync: SyncStatus;
  syncError: string | null;
  lastSyncedAt: number | null;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const StoreContext = createContext<StoreValue | null>(null);
export const AuthContext = createContext<AuthValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside <StoreProvider>");
  return value;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <StoreProvider>");
  return value;
}
