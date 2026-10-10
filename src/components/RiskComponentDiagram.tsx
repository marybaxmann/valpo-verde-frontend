import type { TreeRiskAssessmentResultado } from "../types/treeRisk";

/**
 * Diagnóstico por componente: vector de árbol con copa, tronco y raíces y
 * cuello. Solo se pinta el componente cuyo nivel coincide con el del árbol
 * (R04 = componente más desfavorable), con el color de ese nivel; el resto
 * queda neutro. No calcula nada: solo representa `resultado` del backend.
 *
 * Vector genérico provisorio: queda pendiente decidir si se usa un diseño
 * general de árbol o uno según especie (frontend issue #4).
 */

const LEVEL_COLOR: Record<string, string> = {
  Bajo: "var(--classification-low)",
  Moderado: "var(--classification-medium)",
  Alto: "var(--classification-high)",
  Extremo: "var(--classification-critical)",
};
const SIN_NIVEL = "#9AA69E";

const CROWN =
  "M24 74 A18 18 0 0 1 22 42 A22 22 0 0 1 52 16 A20 20 0 0 1 86 22 A18 18 0 0 1 102 50 A16 16 0 0 1 94 76 A45 45 0 0 1 24 74 Z";
const TRUNK = "M49 138 C51 118 52 100 52 70 L64 70 C64 100 65 118 69 138 Z";
const ROOTS =
  "M51 139 C40 142 30 143 18 148 M54 140 C49 146 44 150 38 155 M59 140 L59 156 M64 140 C69 146 74 150 80 155 M67 139 C78 142 88 143 100 148";

function levelColor(level: string | null): string {
  return (level && LEVEL_COLOR[level]) || SIN_NIVEL;
}

export function RiskComponentDiagram({
  resultado,
  compact = false,
}: {
  resultado: TreeRiskAssessmentResultado;
  /** Versión reducida para paneles laterales angostos. */
  compact?: boolean;
}) {
  const arbol = resultado.clasificacion_riesgo;
  const componentes = [
    {
      key: "copa",
      label: "Copa y ramas",
      level: resultado.clasificacion_copa_ramas,
      prob: resultado.probabilidad_falla_copa_ramas,
      puntaje: resultado.puntaje_copa_ramas,
      consecuencia: resultado.consecuencia_copa_ramas,
    },
    {
      key: "tronco",
      label: "Tronco",
      level: resultado.clasificacion_tronco,
      prob: resultado.probabilidad_falla_tronco,
      puntaje: resultado.puntaje_tronco,
      consecuencia: resultado.consecuencia_tronco,
    },
    {
      key: "raices",
      label: "Raíces y cuello",
      level: resultado.clasificacion_raices_cuello,
      prob: resultado.probabilidad_falla_raices_cuello,
      puntaje: resultado.puntaje_raices_cuello,
      consecuencia: resultado.consecuencia_raices_cuello,
    },
  ];
  const critico = (level: string | null) => arbol !== null && level === arbol;
  const fill = (level: string | null) => (critico(level) ? levelColor(level) : "var(--diagram-neutral)");
  const [copa, tronco, raices] = componentes;

  const destacados = componentes.filter((c) => critico(c.level)).map((c) => c.label.toLowerCase());
  const ariaLabel = destacados.length
    ? `Árbol con ${destacados.join(" y ")} destacado como componente más desfavorable (${arbol}).`
    : "Árbol sin componente destacado: nivel no determinado.";

  return (
    <div className={`risk-diagram${compact ? " risk-diagram--compact" : ""}`}>
      <svg viewBox="0 0 120 160" className="risk-diagram__svg" role="img" aria-label={ariaLabel}>
        <rect x="0" y="138" width="120" height="22" fill="var(--surface-sunken)" />
        <path d={ROOTS} stroke="var(--diagram-outline)" strokeWidth={8} fill="none" strokeLinecap="round" />
        <path d={ROOTS} stroke={fill(raices.level)} strokeWidth={5.5} fill="none" strokeLinecap="round" />
        <path d={TRUNK} fill={fill(tronco.level)} stroke="var(--diagram-outline)" strokeWidth={1.5} strokeLinejoin="round" />
        <path d={CROWN} fill={fill(copa.level)} stroke="var(--diagram-outline)" strokeWidth={1.5} />
        <line x1="0" y1="138" x2="120" y2="138" stroke="var(--diagram-outline)" strokeWidth={1} strokeDasharray="3 3" />
      </svg>
      <ul className="risk-diagram__list">
        {componentes.map((c) => (
          <li key={c.key} className={critico(c.level) ? "is-critical" : undefined}>
            <i style={{ background: levelColor(c.level) }} aria-hidden="true" />
            <div>
              <strong>
                {c.label} · {c.level ?? "No determinado"}
                {critico(c.level) && <span className="risk-diagram__flag">Más desfavorable</span>}
              </strong>
              <span>
                {c.prob ?? "Probabilidad no determinada"}
                {c.puntaje !== null && ` · puntaje ${c.puntaje}`}
                {` · consecuencia ${c.consecuencia.toLowerCase()}`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
