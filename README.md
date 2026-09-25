# 📚 Study Tracker

A minimalist study planner for students: track courses and exams, break them into lessons, manage tasks, run a Pomodoro focus timer, and see your study habits in charts. It works offline in the browser with no sign-up. You can optionally create an account to sync across devices.

**Stack:** React 19 · TypeScript · Vite · React Router · Recharts · Supabase (auth + Postgres) · Vitest + Testing Library

## Features

- **Today dashboard:** daily goal progress, study streak, this week's total, next exam countdown, tasks due now, course progress.
- **Courses:** exam date with a color-coded countdown, lessons checklist with progress bar, notes, color labels, per-course study log. Everything can be edited inline or deleted.
- **Tasks:** priority (high/medium/low), due date, optional course. Grouped into Overdue / Today / Upcoming / No date, with filters.
- **Focus timer:** Pomodoro with focus / short break / long break, configurable lengths, round counter, sound + desktop notification. Finished focus blocks are logged as study sessions automatically. The timer keeps running across pages and reloads. You can also log time manually.
- **Stats:** minutes per day (7/30/90 days, with a table view), time by course, total, weekly, average per study day, current and best streak.
- **Calendar:** month view with exam days, task deadlines and study intensity; click a day for details.
- **Accounts & cloud sync (optional):** email/password sign-up, password reset, automatic sync with Supabase. Data you add as a guest is merged into your account the first time you sign in.
- **Also:** light/dark/system theme, JSON backup export and import, responsive layout with a bottom tab bar on mobile, and automatic migration of data saved by the first version of the app.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without any configuration the app stores everything in `localStorage`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite once (`npm run test:watch` to watch) |
| `npm run lint` | ESLint |
| `npm run build` | Type-check and build to `dist/` |

## Enabling accounts & sync (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). It creates one `study_data` table with row-level security so each user can only access their own row.
3. In **Authentication → URL Configuration**, set the Site URL to where the app runs (e.g. `http://localhost:5173` or your deployed URL).
4. Copy `.env.example` to `.env` and fill in the values from **Project Settings → API**:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
5. Restart `npm run dev`. The Settings page now shows sign-in.

The anon/publishable key is designed to be public; the row-level security policies are what protect the data.

## Deploying

The app is a static site. On **Vercel** or **Netlify**, import the repo, keep the defaults (build `npm run build`, output `dist`), and add the two `VITE_SUPABASE_*` environment variables if you want sync. `vercel.json` and `public/_redirects` make page URLs like `/courses/…` work on refresh.

## How it works

```
src/
  store/        reducer (all state changes), localStorage persistence + migration, Supabase sync
  timer/        Pomodoro state machine, timestamp-based so it survives background tabs and reloads
  lib/          date and statistics helpers (pure, unit-tested)
  pages/        one component per route
  components/   shared UI (inline edit, confirm delete, badges, icons)
```

- **State** is a single reducer (`store/reducer.ts`). It's loaded from storage *before* the first render, which fixes the original bug where reloading could wipe saved data.
- **Sync** stores the whole state as one JSON document per user. After the first merge, the newest copy wins (compared by `updatedAt`). Edits are pushed after a short debounce, and the app pulls again whenever the tab regains focus.
- **Timer sessions** get an id derived from their start time, so a block can never be logged twice.
