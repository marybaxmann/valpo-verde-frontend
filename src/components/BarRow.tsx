export function BarRow({
  label,
  value,
  total,
  tone = "var(--green-500)",
}: {
  label: string;
  value: number;
  total: number;
  tone?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
        <span style={{ color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "var(--surface-muted)" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: tone }} />
      </div>
    </div>
  );
}
