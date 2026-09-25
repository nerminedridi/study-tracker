import { lazy, Suspense } from "react";
import { NavLink, Route, Routes } from "react-router";
import { Icon, type IconName } from "./components/Icon";
import { formatClock } from "./timer/timer";
import { useTimer } from "./timer/context";
import { useAuth } from "./store/context";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Tasks from "./pages/Tasks";
import Focus from "./pages/Focus";
import CalendarPage from "./pages/Calendar";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

// Charts are the heaviest dependency; load them only when the Stats page opens.
const Stats = lazy(() => import("./pages/Stats"));

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Today", icon: "home" },
  { to: "/courses", label: "Courses", icon: "book" },
  { to: "/tasks", label: "Tasks", icon: "check" },
  { to: "/focus", label: "Focus", icon: "timer" },
  { to: "/stats", label: "Stats", icon: "chart" },
  { to: "/calendar", label: "Calendar", icon: "calendar" },
];

function TimerChip() {
  const { timer, remainingMs } = useTimer();
  if (timer.status === "idle") return null;
  return (
    <NavLink to="/focus" className={`timer-chip ${timer.mode}`}>
      <Icon name={timer.status === "running" ? "timer" : "pause"} size={14} />
      {formatClock(remainingMs)}
    </NavLink>
  );
}

function AccountLink() {
  const { enabled, user, sync } = useAuth();
  const label = user ? (user.email ?? "Account") : "Settings";
  return (
    <NavLink to="/account" className="nav-link account-link">
      <Icon name={user ? "cloud" : "user"} />
      <span className="nav-label">{label}</span>
      {enabled && user && <span className={`sync-dot sync-${sync}`} title={`Sync: ${sync}`} />}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">📚</span>
          <span className="brand-name">Study Tracker</span>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className="nav-link">
              <Icon name={n.icon} />
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <TimerChip />
          <AccountLink />
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/focus" element={<Focus />} />
          <Route
            path="/stats"
            element={
              <Suspense fallback={<p className="muted">Loading stats…</p>}>
                <Stats />
              </Suspense>
            }
          />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
