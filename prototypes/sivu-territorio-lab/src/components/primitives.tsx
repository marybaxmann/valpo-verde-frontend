import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { RISK_COLOR, type TreeRisk } from "../data/mock";

/** Material de vidrio: "dark" para el cromo de navegación, "light" para contenido elevado. */
export function Glass({
  tone = "dark",
  className = "",
  style,
  children,
  as: Tag = "div",
  ...rest
}: {
  tone?: "dark" | "light";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  as?: "div" | "section" | "aside" | "nav" | "header";
  "aria-label"?: string;
}) {
  return (
    <Tag className={`glass glass--${tone} ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}

export function IconButton({
  icon,
  label,
  tone = "dark",
  size = 40,
  onClick,
  active = false,
}: {
  icon: IconName;
  label: string;
  tone?: "dark" | "light" | "plain";
  size?: number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--${tone} ${active ? "is-active" : ""}`}
      style={{ width: size, height: size }}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} />
    </button>
  );
}

/** Control segmentado con indicador deslizante (comportamiento tipo iOS). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = "dark",
  label,
  size = "md",
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  tone?: "dark" | "light";
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`seg seg--${tone} seg--${size}`} role="tablist" aria-label={label} style={{ ["--n" as string]: options.length, ["--i" as string]: idx }}>
      <span className="seg__thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className="seg__opt" onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={size === "lg" ? 17 : 15} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function RiskDot({ level, size = 10 }: { level: TreeRisk; size?: number }) {
  return <span className="risk-dot" style={{ width: size, height: size, background: RISK_COLOR[level ?? "none"] }} aria-hidden="true" />;
}

export function RiskTag({ level }: { level: TreeRisk }) {
  const dark = level === "Alto" || level === "Extremo";
  return (
    <span className="risk-tag" style={{ background: RISK_COLOR[level ?? "none"], color: dark ? "#fff" : "#1d2a12", boxShadow: level === "Sin clasificación" ? "inset 0 0 0 1px rgba(10,30,20,.25)" : undefined }}>
      {level === "Sin clasificación" ? "Sin clasificación" : level ? `Riesgo ${level.toLowerCase()}` : "Sin evaluación"}
    </span>
  );
}
