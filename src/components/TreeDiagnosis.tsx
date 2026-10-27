import type { CodigoEtiqueta, Diagnostico } from "../types/diagnostico";
import { ClassificationBadge, getClassificationTone } from "./ClassificationBadge";
import { fechaChile } from "../lib/dates";

/** Color del componente según la clasificación del backend (paleta de PR-016). */
function color(c: CodigoEtiqueta | null | undefined): string {
  const t = c ? getClassificationTone(c.etiqueta) : "neutral";
  return t === "neutral" ? "#D5DCD7" : `var(--classification-${t})`;
}

/**
 * Esquema del árbol de la maqueta SIVU Lab (TreeSheet, `TreeGlyph`; SVG de
 * presentación adaptado, CC-058): cada parte se pinta con la clasificación
 * que entregó el backend para ese componente; el frontend no compara ni
 * elige el «más desfavorable».
 */
function TreeGlyph({ d }: { d: Diagnostico }) {
  const comp = d.resultado.componentes;
  const copa = color(comp?.copa_ramas?.clasificacion);
  const tronco = color(comp?.tronco?.clasificacion);
  const raices = color(comp?.raices_cuello?.clasificacion);
  return (
    <svg viewBox="0 0 90 110" className="sivu-treediag__glyph" role="img" aria-label="Esquema del árbol coloreado por componente">
      <g fill={copa} stroke="#4A5A51" strokeWidth="1.1">
        <circle cx="30" cy="40" r="19" />
        <circle cx="60" cy="38" r="20" />
        <circle cx="45" cy="24" r="19" />
        <circle cx="45" cy="50" r="17" />
      </g>
      <g fill={copa}>
        <circle cx="30" cy="40" r="18" />
        <circle cx="60" cy="38" r="19" />
        <circle cx="45" cy="24" r="18" />
        <circle cx="45" cy="50" r="16" />
      </g>
      <path d="M41 64h8l2 32H39Z" fill={tronco} stroke="#4A5A51" strokeWidth="1.1" />
      <path d="M22 100c8-5 15-6 23-4 8-2 15-1 23 4" stroke={raices} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M10 101h70" stroke="#C3CCC6" strokeDasharray="3 3" />
    </svg>
  );
}

/** Diagnóstico de la última inspección finalizada, en la ficha del árbol (B18 mínimo). */
export function TreeDiagnosis({ d }: { d: Diagnostico }) {
  const comp = d.resultado.componentes;
  const filas: [string, "copa_ramas" | "tronco" | "raices_cuello"][] = [
    ["Copa y ramas", "copa_ramas"],
    ["Tronco", "tronco"],
    ["Raíces y cuello", "raices_cuello"],
  ];
  const inf = d.resultado.infraestructura;
  return (
    <section className="sivu-treediag" aria-label="Diagnóstico del árbol">
      <div className="sivu-treediag__head">
        <h3>Diagnóstico finalizado</h3>
        {d.resultado.clasificacion_riesgo && <ClassificationBadge level={d.resultado.clasificacion_riesgo.etiqueta} />}
      </div>
      <div className="sivu-treediag__comps">
        <TreeGlyph d={d} />
        <ul>
          {filas.map(([nombre, clave]) => {
            const c = comp?.[clave];
            return (
              <li key={clave}>
                <span className="sivu-treediag__dot" style={{ background: color(c?.clasificacion) }} aria-hidden="true" />
                <div>
                  <strong>
                    {nombre} · {c?.clasificacion?.etiqueta ?? "—"}
                  </strong>
                  <span>Probabilidad de falla: {c?.probabilidad_falla?.etiqueta ?? "—"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <dl className="sivu-treediag__rows">
        <div>
          <dt>Infraestructura</dt>
          <dd>{inf?.clasificacion?.etiqueta ?? "—"}</dd>
        </div>
        <div>
          <dt>Prioridad</dt>
          <dd>{d.resultado.prioridad?.etiqueta ?? "—"}</dd>
        </div>
        <div>
          <dt>Próxima inspección</dt>
          <dd>{d.fecha_proxima_inspeccion ? fechaChile(d.fecha_proxima_inspeccion) : "—"}</dd>
        </div>
        <div>
          <dt>Próximo monitoreo</dt>
          <dd>{d.fecha_proximo_monitoreo ? fechaChile(d.fecha_proximo_monitoreo) : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
