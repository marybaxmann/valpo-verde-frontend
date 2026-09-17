import React from "react";

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="stat-grid">{children}</div>;
}

export function StatCard({
  label,
  value,
  foot,
}: {
  label: string;
  value: React.ReactNode;
  foot?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {foot && <div className="stat-card__foot">{foot}</div>}
    </div>
  );
}
