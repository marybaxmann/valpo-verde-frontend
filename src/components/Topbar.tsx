import { Icon } from "./Icons";

export function Topbar({
  title,
  roleLabel,
  roleTone,
}: {
  title: string;
  roleLabel: string;
  roleTone: "admin" | "user";
}) {
  return (
    <header className="topbar">
      <span className="topbar__title">{title}</span>
      <div className="topbar__meta">
        <span className={`role-pill ${roleTone === "user" ? "user" : ""}`}>{roleLabel}</span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--surface-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          <Icon name="user" size={15} />
        </div>
      </div>
    </header>
  );
}
