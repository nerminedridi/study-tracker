import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, StatTile } from "../components/ui";
import { formatDay, formatMinutes } from "../lib/date";
import { bestStreak, courseProgress, currentStreak, dailySeries, minutesByCourse, minutesByDay, startOfWeek, totalMinutes } from "../lib/stats";
import { useStore } from "../store/context";

const RANGES = [7, 30, 90] as const;

function DayTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { key: string; minutes: number };
  return (
    <div className="chart-tooltip">
      <div className="muted small">{formatDay(row.key, { weekday: "long", month: "short", day: "numeric" })}</div>
      <strong>{formatMinutes(row.minutes)}</strong>
    </div>
  );
}

export default function Stats() {
  const { state } = useStore();
  const { sessions, courses, settings } = state;
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);

  if (!sessions.length) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>Stats</h1>
        </header>
        <EmptyState title="No study time logged yet">Finish a focus session or log time manually, and your charts will show up here.</EmptyState>
      </div>
    );
  }

  const series = dailySeries(sessions, range).map((d) => ({
    ...d,
    label: range === 7 ? formatDay(d.key, { weekday: "short" }) : formatDay(d.key, { month: "short", day: "numeric" }),
  }));
  const rangeTotal = series.reduce((s, d) => s + d.minutes, 0);
  const activeDays = minutesByDay(sessions).size;
  const total = totalMinutes(sessions);
  const goalDays = series.filter((d) => d.minutes >= settings.dailyGoalMinutes).length;

  const byCourse = minutesByCourse(sessions);
  const courseRows = [
    ...courses.map((c) => ({ id: c.id, name: c.name, color: c.color, minutes: byCourse.get(c.id) ?? 0, progress: courseProgress(c) })),
    ...(byCourse.get(null) ? [{ id: "general", name: "General", color: "var(--series-neutral)", minutes: byCourse.get(null)!, progress: null }] : []),
  ].sort((a, b) => b.minutes - a.minutes);
  const maxCourse = Math.max(1, ...courseRows.map((r) => r.minutes));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{sessions.length} sessions logged</p>
          <h1>Stats</h1>
        </div>
      </header>

      <section className="grid-4">
        <StatTile label="Total studied" value={formatMinutes(total)} hint={`over ${activeDays} day${activeDays === 1 ? "" : "s"}`} />
        <StatTile label="This week" value={formatMinutes(totalMinutes(sessions, startOfWeek()))} hint="since Monday" />
        <StatTile label="Avg per study day" value={formatMinutes(total / activeDays)} />
        <StatTile icon="flame" label="Streak" value={`${currentStreak(sessions)}d`} hint={`best ${bestStreak(sessions)}d`} />
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Study time per day</h2>
            <p className="muted small">
              {formatMinutes(rangeTotal)} in the last {range} days · daily goal hit on {goalDays} day{goalDays === 1 ? "" : "s"}
            </p>
          </div>
          <div className="segmented" role="tablist" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r} role="tab" aria-selected={range === r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>
                {r}d
              </button>
            ))}
          </div>
        </div>
        <div className="chart" role="img" aria-label={`Bar chart of minutes studied per day over the last ${range} days`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap={range === 7 ? "30%" : 2}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={48} tickFormatter={(v: number) => (v < 60 ? `${v}m` : `${+(v / 60).toFixed(1)}h`)} />
              <Tooltip content={(p) => <DayTooltip active={p.active} payload={p.payload} />} cursor={{ className: "chart-cursor" }} />
              <Bar dataKey="minutes" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="table-view">
          <summary className="small">Show as table</summary>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Studied</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((d) => (
                <tr key={d.key}>
                  <td>{formatDay(d.key)}</td>
                  <td>{formatMinutes(d.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Time by course</h2>
          <span className="muted small">all time</span>
        </div>
        <ul className="hbars">
          {courseRows.map((r) => (
            <li key={r.id} className="hbar" title={`${r.name}: ${formatMinutes(r.minutes)}`}>
              <span className="hbar-label">{r.name}</span>
              <span className="hbar-track">
                <span className="hbar-fill" style={{ width: `${(r.minutes / maxCourse) * 100}%`, background: r.color }} />
              </span>
              <span className="hbar-value">
                {formatMinutes(r.minutes)}
                {r.progress !== null && <span className="muted"> · {r.progress}% done</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
