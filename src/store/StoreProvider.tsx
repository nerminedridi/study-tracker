import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { AuthContext, StoreContext, type AuthValue, type SyncStatus } from "./context";
import { reducer } from "./reducer";
import { loadState, saveState } from "./storage";
import { mergeStates, pullRemote, pushRemote } from "./sync";

const SYNCED_USER_KEY = "study-tracker:synced-user";
const PUSH_DELAY_MS = 1200;

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "message" in e) return String((e as { message: unknown }).message);
  return "Sync failed";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [sync, setSync] = useState<SyncStatus>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Highest local updatedAt known to match the cloud copy; avoids echo pushes.
  const syncedVersion = useRef(0);
  const ready = useRef(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Apply the theme to <html> so CSS variables switch.
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", state.settings.theme);
  }, [state.settings.theme]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((prev) => (prev?.id === session?.user.id ? prev : (session?.user ?? null)));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const push = useCallback(async () => {
    if (!supabase || !user) return;
    const snapshot = stateRef.current;
    setSync("syncing");
    try {
      await pushRemote(supabase, user.id, snapshot);
      syncedVersion.current = Math.max(syncedVersion.current, snapshot.updatedAt);
      setSync("synced");
      setSyncError(null);
      setLastSyncedAt(Date.now());
    } catch (e) {
      setSync("error");
      setSyncError(errorMessage(e));
    }
  }, [user]);

  /** Reconciles local and cloud copies; newest wins, first sync on a device merges. */
  const reconcile = useCallback(async () => {
    if (!supabase || !user) return;
    setSync("syncing");
    try {
      const remote = await pullRemote(supabase, user.id);
      const local = stateRef.current;
      const firstSyncHere = localStorage.getItem(SYNCED_USER_KEY) !== user.id;

      if (!remote) {
        await pushRemote(supabase, user.id, local);
        syncedVersion.current = local.updatedAt;
      } else if (firstSyncHere) {
        const merged = mergeStates(local, remote);
        dispatch({ type: "hydrate", state: merged });
        stateRef.current = merged;
        await pushRemote(supabase, user.id, merged);
        syncedVersion.current = merged.updatedAt;
      } else if (remote.updatedAt > local.updatedAt) {
        dispatch({ type: "hydrate", state: remote });
        syncedVersion.current = remote.updatedAt;
      } else if (local.updatedAt > remote.updatedAt) {
        await pushRemote(supabase, user.id, local);
        syncedVersion.current = local.updatedAt;
      } else {
        syncedVersion.current = local.updatedAt;
      }

      localStorage.setItem(SYNCED_USER_KEY, user.id);
      ready.current = true;
      setSync("synced");
      setSyncError(null);
      setLastSyncedAt(Date.now());
    } catch (e) {
      setSync("error");
      setSyncError(errorMessage(e));
    }
  }, [user]);

  // Initial sync on sign-in, and re-check when returning to the tab (other device may have changed data).
  useEffect(() => {
    ready.current = false;
    if (!user) return;
    // Deferred so a StrictMode double-mount only syncs once.
    const initial = setTimeout(reconcile, 0);
    const onFocus = () => {
      if (document.visibilityState === "visible") reconcile();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(initial);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, reconcile]);

  // Debounced push after local edits.
  useEffect(() => {
    if (!user || !ready.current || state.updatedAt <= syncedVersion.current) return;
    const timer = setTimeout(push, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, user, push]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    if (user && stateRef.current.updatedAt > syncedVersion.current) await push();
    await supabase.auth.signOut();
    localStorage.removeItem(SYNCED_USER_KEY);
    // The data lives in the account now; don't leave it on a possibly shared device.
    dispatch({ type: "reset" });
    setUser(null);
  }, [user, push]);

  const store = useMemo(() => ({ state, dispatch }), [state]);
  const auth = useMemo<AuthValue>(
    () => ({
      enabled: Boolean(supabase),
      user,
      loading,
      sync: user ? sync : "local",
      syncError,
      lastSyncedAt,
      signOut,
      syncNow: reconcile,
    }),
    [user, loading, sync, syncError, lastSyncedAt, signOut, reconcile],
  );

  return (
    <StoreContext.Provider value={store}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </StoreContext.Provider>
  );
}
