import { useRef, useState, type FormEvent } from "react";
import { ConfirmDelete } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useAuth, useStore } from "../store/context";
import { normalizeState } from "../store/storage";
import type { Theme } from "../types";

type Mode = "signin" | "signup" | "reset";

function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setMessage({ kind: "ok", text: "Check your inbox to confirm your email, then sign in." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account` });
        if (error) throw error;
        setMessage({ kind: "ok", text: "If an account exists for that email, a reset link is on its way." });
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
          Create account
        </button>
      </div>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      {mode !== "reset" && (
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
      )}
      {message && <p className={message.kind === "error" ? "error-text" : "ok-text"}>{message.text}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
      </button>
      {mode === "signin" && (
        <button type="button" className="link-btn small" onClick={() => setMode("reset")}>
          Forgot password?
        </button>
      )}
      {mode === "reset" && (
        <button type="button" className="link-btn small" onClick={() => setMode("signin")}>
          Back to sign in
        </button>
      )}
    </form>
  );
}

function ChangePassword() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password });
    setMsg(error ? error.message : "Password updated.");
    if (!error) setPassword("");
  }
  return (
    <form className="form-row tight" onSubmit={submit}>
      <label className="field grow">
        <span>New password</span>
        <input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button className="btn btn-ghost" type="submit">
        Change password
      </button>
      {msg && <p className="small muted">{msg}</p>}
    </form>
  );
}

const SYNC_TEXT = { local: "Not syncing", syncing: "Syncing…", synced: "All changes saved to the cloud", error: "Sync problem" } as const;

export default function Account() {
  const { state, dispatch } = useStore();
  const auth = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    try {
      const data = normalizeState(JSON.parse(await file.text()));
      dispatch({ type: "hydrate", state: { ...data, updatedAt: Date.now() } });
      setImportMsg(`Imported ${data.courses.length} courses, ${data.todos.length} tasks, ${data.sessions.length} sessions.`);
    } catch {
      setImportMsg("That file isn't a valid backup.");
    }
  }

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>{auth.user ? "Account" : "Settings"}</h1>
      </header>

      <section className="card">
        <h2>Cloud sync</h2>
        {!auth.enabled ? (
          <p className="muted">
            Your data is saved in this browser. Cloud sync isn't set up for this deployment. See the README to connect a free Supabase project.
          </p>
        ) : auth.loading ? (
          <p className="muted">Loading…</p>
        ) : auth.user ? (
          <div className="stack">
            <p>
              Signed in as <strong>{auth.user.email}</strong>
            </p>
            <p className={auth.sync === "error" ? "error-text" : "muted"}>
              <span className={`sync-dot sync-${auth.sync}`} /> {SYNC_TEXT[auth.sync]}
              {auth.syncError && `: ${auth.syncError}`}
              {auth.lastSyncedAt && auth.sync === "synced" && ` · ${new Date(auth.lastSyncedAt).toLocaleTimeString()}`}
            </p>
            <div className="actions">
              <button className="btn btn-ghost" onClick={() => auth.syncNow()}>
                Sync now
              </button>
              <button className="btn btn-ghost" onClick={() => auth.signOut()}>
                Sign out
              </button>
            </div>
            <ChangePassword />
          </div>
        ) : (
          <>
            <p className="muted">
              Sign in to back up your data and use it on any device. Everything you've added as a guest will be kept and merged into your account.
            </p>
            <AuthForm />
          </>
        )}
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {(["system", "light", "dark"] as Theme[]).map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={state.settings.theme === t}
              className={state.settings.theme === t ? "active" : ""}
              onClick={() => dispatch({ type: "settings/update", patch: { theme: t } })}
            >
              {t === "system" ? "System" : t === "light" ? "☀️ Light" : "🌙 Dark"}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted small">Download everything as a JSON file, or restore from one. Importing replaces the current data.</p>
        <div className="actions">
          <button className="btn btn-ghost" onClick={exportBackup}>
            Export backup
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
        </div>
        {importMsg && <p className="small muted">{importMsg}</p>}
      </section>

      <section className="card danger-zone">
        <h2>Reset</h2>
        <p className="muted small">
          Delete all courses, tasks and study history{auth.user ? " on every synced device" : " from this browser"}. This can't be undone.
        </p>
        <ConfirmDelete label="Delete all data" onConfirm={() => dispatch({ type: "reset" })} />
      </section>
    </div>
  );
}
