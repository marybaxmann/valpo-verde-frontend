import { ClassificationBadge } from "./ClassificationBadge";

export interface RiskCounts {
  Bajo: number;
  Moderado: number;
  Alto: number;
  Extremo: number;
  /** Evaluados con resultado "No determinado" (sin clasificación global). */
  noDeterminado: number;
  sinEvaluacion: number;
}

/**
 * Conteo de árboles por nivel de riesgo de su última evaluación. Es solo
 * una agregación de resultados ya calculados y persistidos por el backend;
 * no clasifica ni recalcula nada.
 */
export function RiskDistribution({ counts, total }: { counts: RiskCounts; total: number }) {
  const rows: { key: string; badge: React.ReactNode; value: number }[] = [
    { key: "Extremo", badge: <ClassificationBadge level="Extremo" />, value: counts.Extremo },
    { key: "Alto", badge: <ClassificationBadge level="Alto" />, value: counts.Alto },
    { key: "Moderado", badge: <ClassificationBadge level="Moderado" />, value: counts.Moderado },
    { key: "Bajo", badge: <ClassificationBadge level="Bajo" />, value: counts.Bajo },
  ];
  if (counts.noDeterminado > 0) {
    rows.push({ key: "nd", badge: <span className="status-pill">Sin clasificación</span>, value: counts.noDeterminado });
  }
  rows.push({ key: "sin", badge: <span className="status-pill">Sin evaluación</span>, value: counts.sinEvaluacion });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
        return (
          <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {r.badge}
            <span style={{ fontSize: 12.5 }}>
              <strong>{r.value}</strong>
              <span style={{ color: "var(--text-secondary)", marginLeft: 6 }}>{pct}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Agrega el resumen de riesgo del proyecto (tree_id → clasificación). */
export function countRisks(riskByTreeId: Record<string, string | null>, totalTrees: number): RiskCounts {
  const counts: RiskCounts = { Bajo: 0, Moderado: 0, Alto: 0, Extremo: 0, noDeterminado: 0, sinEvaluacion: 0 };
  let evaluados = 0;
  for (const r of Object.values(riskByTreeId)) {
    evaluados++;
    if (r === "Bajo" || r === "Moderado" || r === "Alto" || r === "Extremo") counts[r]++;
    else counts.noDeterminado++;
  }
  counts.sinEvaluacion = Math.max(0, totalTrees - evaluados);
  return counts;
}
