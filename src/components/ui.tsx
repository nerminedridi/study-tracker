import { useState, type ReactNode } from "react";
import { daysUntil, relativeDay } from "../lib/date";
import { Icon } from "./Icon";

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

/** Colored "in 5 days" pill for exam and due dates. */
export function DueBadge({ date, prefix, done }: { date: string; prefix?: string; done?: boolean }) {
  const n = daysUntil(date);
  const tone = done ? "neutral" : n < 0 ? "past" : n <= 3 ? "urgent" : n <= 10 ? "soon" : "safe";
  const text = n < 0 && prefix === "Exam" ? "exam passed" : `${prefix ? prefix + " " : ""}${relativeDay(date)}`;
  return <span className={`badge badge-${tone}`}>{text}</span>;
}

export function IconButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button type="button" className={`icon-btn${danger ? " danger" : ""}`} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size={16} />
    </button>
  );
}

/** Delete button that asks for a second click instead of a browser dialog. */
export function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <IconButton icon="trash" label={label} onClick={() => setArmed(true)} danger />;
  return (
    <span className="confirm">
      <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}>
        Delete
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  );
}

/** Text that turns into an input on click; saves on Enter/blur, cancels on Escape. */
export function InlineEdit({
  value,
  onSave,
  className,
  label,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        className={`inline-edit ${className ?? ""}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title={`Edit ${label}`}
      >
        {value}
      </button>
    );
  }

  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onSave(v);
    setEditing(false);
  };

  return (
    <input
      className={`inline-input ${className ?? ""}`}
      aria-label={label}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

export function StatTile({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: Parameters<typeof Icon>[0]["name"] }) {
  return (
    <div className="card stat">
      <div className="stat-label">
        {icon && <Icon name={icon} size={14} />} {label}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
