import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import { Icon, type IconName } from "../components/Icons";
import { PendingNotice } from "../components/PendingNotice";
import { GraficoEspecies } from "../components/GraficoEspecies";
import { ESTADO_PROYECTO_LABEL } from "../lib/projects";
import { obtenerResumen } from "../api/resumen";
import { listarDiagnosticos } from "../api/diagnosticos";
import type { Diagnostico } from "../types/diagnostico";
import { fechaChile } from "../lib/dates";
import type { ResumenProyecto } from "../types/resumen";
import type { ConteoCatalogo } from "../types/resumen";
import { getClassificationTone } from "../components/ClassificationBadge";
import { obtenerInfraestructura } from "../api/infraestructura";
import { obtenerIndicadores } from "../api/indicadores";
import type { IndicadoresProyecto } from "../types/indicadores";
import type { RespuestaInfraestructura } from "../types/infraestructura";
import { CATEGORIAS_CON_AFECTACION, COMPONENTES } from "../lib/infraestructura";

/**
 * Dashboard del proyecto (Fase 7, Paso 4): composición de la maqueta
 * SIVU Lab (CC-057), sin mapa. Cada panel muestra el dato que entregue la
 * API de la Fase 6 o, mientras no exista, un estado «pendiente» que dice
 * qué falta (CC-059). El frontend no cuenta ni clasifica: los indicadores
 * esperan el resumen del proyecto (B7) y los listados (B1, B3, B5, B8, B9).
 * Referencias en docs/propuestas-cc/pendientes-backend.md.
 */

/** Color de la barra según la clasificación del backend (paleta de PR-016). */
function tonoBarra(etiqueta: string | null): string {
  const t = etiqueta ? getClassificationTone(etiqueta) : "neutral";
  return t === "neutral" ? "#A7B0AB" : `var(--classification-${t})`;
}

/** Color de cada estado de OT (valores de la maqueta SIVU Lab, `OT_COLOR`; CC-058). */
const COLOR_ESTADO_OT: Record<string, string> = {
  pendiente: "var(--ot-pendiente)",
  programada: "var(--ot-programada)",
  en_ejecucion: "var(--ot-en-ejecucion)",
  completada: "var(--ot-completada)",
  cancelada: "var(--ot-cancelada)",
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Anillo de riesgo (maqueta: `Donut`). Dibuja los conteos que entrega B7,
 * sin calcular nada: cada tramo es proporcional a su conteo. «Sin
 * clasificación» va en blanco, como en la maqueta.
 */
function RiskDonut({ partes, total }: { partes: ConteoCatalogo[]; total: number }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  const suma = partes.reduce((a, p) => a + p.total, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 180 180" className="sivu-donut" role="img" aria-label={`${total} árboles con diagnóstico, por nivel de riesgo`}>
      <circle cx="90" cy="90" r={R} fill="none" className="sivu-donut__track" strokeWidth="22" />
      {suma > 0 &&
        partes.map((p) => {
          const len = (p.total / suma) * C;
          const el = (
            <circle
              key={p.codigo ?? "sin"}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={p.etiqueta ? tonoBarra(p.etiqueta) : "#FFFFFF"}
              className={`sivu-donut__seg ${p.etiqueta ? "" : "sivu-donut__seg--white"}`}
              strokeWidth="22"
              strokeDasharray={`${Math.max(0, len - (partes.length > 1 ? 2 : 0))} ${C}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 90 90)"
            />
          );
          acc += len;
          return el;
        })}
      <text x="90" y="88" textAnchor="middle" className="sivu-donut__num">
        {total}
      </text>
      <text x="90" y="110" textAnchor="middle" className="sivu-donut__lbl">
        con diagnóstico
      </text>
    </svg>
  );
}

export default function ProjectDashboard() {
  const { projectId = "" } = useParams();
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<{ id: string; data: ResumenProyecto } | { id: string; error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    obtenerResumen(projectId)
      .then((data) => {
        if (!cancelled) setResumen({ id: projectId, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResumen({ id: projectId, error: err instanceof Error ? err.message : "No se pudo cargar el resumen." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Infraestructura (B8): cobertura y árboles con afectación por componente, contados por el backend.
  const [infra, setInfra] = useState<{ id: string; data: RespuestaInfraestructura } | { id: string; error: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    obtenerInfraestructura(projectId)
      .then((data) => {
        if (!cancelled) setInfra({ id: projectId, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setInfra({ id: projectId, error: err instanceof Error ? err.message : "No se pudo cargar la infraestructura." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Indicadores biométricos (B19) para el panel compacto del Dashboard.
  const [indic, setIndic] = useState<{ id: string; data: IndicadoresProyecto } | { id: string; error: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    obtenerIndicadores(projectId)
      .then((data) => {
        if (!cancelled) setIndic({ id: projectId, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setIndic({ id: projectId, error: err instanceof Error ? err.message : "No se pudieron cargar los indicadores." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Agenda: fechas sugeridas de los diagnósticos finalizados (no son
  // recordatorios vigentes; esos llegan con B5 al completar la OT).
  const [agenda, setAgenda] = useState<{ id: string; items: { fecha: string; tipo: string; d: Diagnostico }[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    listarDiagnosticos(projectId)
      .then((diags) => {
        if (cancelled) return;
        const items = diags.flatMap((d) => [
          ...(d.fecha_proximo_monitoreo ? [{ fecha: d.fecha_proximo_monitoreo, tipo: "Próximo monitoreo", d }] : []),
          ...(d.fecha_proxima_inspeccion ? [{ fecha: d.fecha_proxima_inspeccion, tipo: "Próxima inspección", d }] : []),
        ]);
        items.sort((x, y) => x.fecha.localeCompare(y.fecha));
        setAgenda({ id: projectId, items });
      })
      .catch(() => {
        if (!cancelled) setAgenda({ id: projectId, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    getProjectWithSector(projectId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el proyecto.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const loading = !detail && !error;
  const project = detail?.proyecto;
  const sector = detail?.sector;
  const agendaActual = agenda?.id === projectId ? agenda.items : null;
  const infraActual = infra?.id === projectId ? infra : null;
  const actual = resumen?.id === projectId ? resumen : null;
  const r = actual && "data" in actual ? actual.data : null;
  const errorResumen = actual && "error" in actual ? actual.error : null;
  // Íconos y tonos de la maqueta (`Kpi`): menta por defecto; el tono propio tiñe el ícono y su fondo.
  // Seis indicadores como la maqueta SIVU Lab (Dashboard compacto, 2026-11-19). Solo se suman conteos de B7.
  const otAbiertas = r ? r.ot_por_estado.filter((c) => c.codigo !== "completada" && c.codigo !== "cancelada").reduce((s, c) => s + c.total, 0) : undefined;
  const otEnEjecucion = r?.ot_por_estado.find((c) => c.codigo === "en_ejecucion")?.total ?? 0;
  const incAbiertas = r?.incidencias_por_estado
    ? r.incidencias_por_estado.filter((c) => c.codigo !== "resuelta" && c.codigo !== "descartada").reduce((s, c) => s + c.total, 0)
    : undefined;
  const incSinRevisar = r?.incidencias_por_estado?.find((c) => c.codigo === "ingresada")?.total ?? 0;
  const kpis: { label: string; icon: IconName; value: number | undefined; sub: string; tone?: string }[] = [
    { label: "Árboles registrados", icon: "leaf", value: r?.arboles_total, sub: "en el inventario" },
    { label: "Georreferenciados", icon: "pin", value: r?.georreferenciados, sub: r ? `${r.sin_georreferenciar} sin georreferenciar` : "" },
    { label: "Árboles evaluados", icon: "clipboard", value: r?.con_diagnostico, sub: r ? `${r.sin_evaluacion} sin evaluación` : "" },
    { label: "Especies", icon: "sparkle", value: r?.especies_distintas, sub: "en el inventario" },
    { label: "OT abiertas", icon: "wrench", value: otAbiertas, sub: r ? `${otEnEjecucion} en ejecución` : "", tone: "var(--ot-programada)" },
    {
      label: "Incidencias abiertas",
      icon: "inbox",
      value: incAbiertas,
      sub: r?.incidencias_por_estado ? `${incSinRevisar} sin revisar` : "sin datos del resumen",
      tone: "var(--incidencia)",
    },
  ];

  const indicActual = indic?.id === projectId ? indic : null;
  const ind = indicActual && "data" in indicActual ? indicActual.data : null;
  const num = (v: number | null | undefined, dec = 0) => (v === null || v === undefined ? "—" : v.toLocaleString("es-CL", { maximumFractionDigits: dec, minimumFractionDigits: dec }));
  const indicadores: { label: string; valor: string; unidad?: string; sub: string; title?: string }[] = ind
    ? [
        {
          label: "Densidad arbórea",
          valor: num(ind.densidad_arborea.valor, 1),
          unidad: "árb/ha",
          sub: ind.densidad_arborea.valor === null ? "sin superficie del sector" : "árboles por hectárea",
          title: ind.densidad_arborea.motivo ?? undefined,
        },
        { label: "Diversidad (Shannon)", valor: num(ind.diversidad_shannon.valor, 2), sub: `${ind.riqueza_especies.valor} especies` },
        {
          // No «nativos»: el origen biogeográfico aún falta en buena parte del catálogo de especies.
          label: "Identificados a especie",
          valor: num(ind.cobertura_taxonomica.porcentaje_identificados, 0),
          unidad: "%",
          sub: `${ind.cobertura_taxonomica.identificados_especie} de ${ind.cobertura_taxonomica.presentes}`,
        },
        {
          label: "Área de copa",
          valor: num(ind.area_proyectada_copa.total_m2, 0),
          unidad: "m²",
          sub: `${ind.area_proyectada_copa.n_con_area} árboles medidos`,
        },
      ]
    : [];

  return (
    <div className="sivu-dash">
      <header className="sivu-phead">
        <div>
          <div className="sivu-phead__eyebrow">
            {project && (
              <span className={`sivu-chip ${project.estado_proyecto === "activo" ? "sivu-chip--ok" : ""}`}>
                {ESTADO_PROYECTO_LABEL[project.estado_proyecto]}
              </span>
            )}
            {sector && <span>{sector.nombre_sector}</span>}
          </div>
          <h1 className="sivu-phead__title">Dashboard</h1>
          <p className="sivu-phead__meta">
            {loading && "Cargando proyecto…"}
            {error && (
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {error}
              </span>
            )}
            {project && `Resumen de ${project.nombre_proyecto}`}
          </p>
        </div>
        <Link to="../mapa" relative="path" className="btn btn-ghost">
          <Icon name="leaf" size={15} />
          Ver territorio
        </Link>
      </header>

      {/* Sin acceso o sin proyecto: solo el error real, sin paneles «pendiente». */}
      {!error && (
        <>
          {errorResumen && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {errorResumen}
            </p>
          )}
          <section className="sivu-kpis" aria-label="Indicadores principales">
            {kpis.map((k) => (
              <div key={k.label} className={`sivu-kpi ${r ? "" : "sivu-kpi--pending"}`}>
                <span className={`sivu-kpi__icon ${k.tone ? "sivu-kpi__icon--tono" : ""}`} aria-hidden="true" style={k.tone ? { ["--tono" as string]: k.tone } : undefined}>
                  <Icon name={k.icon} size={16} />
                </span>
                <span className="sivu-kpi__lbl">{k.label}</span>
                <span className="sivu-kpi__val">{r ? (k.value ?? "—") : errorResumen ? "—" : "…"}</span>
                <span className="sivu-kpi__sub">{k.sub}</span>
              </div>
            ))}
          </section>

          <section className="sivu-dash__grid">
            <article className="sivu-panel sivu-dash__risk">
              <div className="sivu-panel__head">
                <h2>Distribución por riesgo</h2>
                <Link to="../inspeccion" relative="path" className="sivu-panel__link">
                  Riesgo Arbóreo <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              {r ? (
                <>
                  <div className="sivu-risk-split">
                    <RiskDonut partes={r.por_riesgo} total={r.con_diagnostico} />
                    <ul className="sivu-risk-legend">
                      {r.por_riesgo.map((c) => (
                        <li key={c.codigo ?? "sin"}>
                          <i style={{ background: c.etiqueta ? tonoBarra(c.etiqueta) : "#FFFFFF" }} />
                          <span>{c.etiqueta ?? "Sin clasificación"}</span>
                          <strong>{c.total}</strong>
                        </li>
                      ))}
                      <li className="sivu-risk-legend__muted">
                        <i className="sivu-risk-legend__none" />
                        <span>Sin evaluación</span>
                        <strong>{r.sin_evaluacion}</strong>
                      </li>
                    </ul>
                  </div>
                  <p className="sivu-terr__note">Según el diagnóstico finalizado; pasa a vigente al completar la OT.</p>
                </>
              ) : (
                <p className="sivu-state">{errorResumen ? "Sin datos." : "Cargando…"}</p>
              )}
            </article>

            <article className="sivu-panel sivu-dash__comp">
              <div className="sivu-panel__head">
                <h2>Composición del inventario</h2>
                <Link to="../mapa?vista=especies" relative="path" className="sivu-panel__link">
                  Especies del inventario <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              {r ? (
                <>
                  <p className="sivu-comp__resumen">
                    <strong>{r.arboles_total}</strong> árboles · <strong>{r.especies_distintas}</strong> especies
                  </p>
                  <GraficoEspecies especies={r.especies_top} total={r.arboles_total} />
                </>
              ) : (
                <p className="sivu-state">{errorResumen ? "Sin datos." : "Cargando…"}</p>
              )}
            </article>

            <article className="sivu-panel sivu-dash__ops">
              <div className="sivu-panel__head">
                <h2>Operación</h2>
              </div>
              {r && r.ot_por_estado.length > 0 && (
                <>
                  <span className="sivu-panel__sub">Órdenes de trabajo por estado</span>
                  <ul className="sivu-statelist">
                    {r.ot_por_estado.map((c) => (
                      <li key={c.codigo ?? "sin"}>
                        <i style={{ background: COLOR_ESTADO_OT[c.codigo ?? ""] ?? "var(--ot-pendiente)" }} />
                        <span>{c.etiqueta ?? c.codigo ?? "—"}</span>
                        <strong>{c.total}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {r && r.ot_por_estado.length === 0 && <p className="sivu-state">El proyecto no tiene órdenes de trabajo.</p>}
              {/* Incidencias por estado: conteos de B7 (D-184). Un backend anterior que no los envía muestra el aviso. */}
              {r && r.incidencias_por_estado && r.incidencias_por_estado.length > 0 && (
                <>
                  <span className="sivu-panel__sub">
                    Incidencias por estado ·{" "}
                    <Link to="../incidencias" relative="path" className="sivu-panel__link">
                      Ver incidencias
                    </Link>
                  </span>
                  <ul className="sivu-statelist">
                    {r.incidencias_por_estado.map((c) => (
                      <li key={c.codigo ?? "sin"}>
                        <i style={{ background: "var(--incidencia)" }} />
                        <span>{c.etiqueta ?? c.codigo ?? "—"}</span>
                        <strong>{c.total}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {r && r.incidencias_por_estado && r.incidencias_por_estado.length === 0 && <p className="sivu-state">El proyecto no tiene incidencias.</p>}
              {r && !r.incidencias_por_estado && <PendingNotice what="las incidencias por estado" refs="B7 · incidencias_por_estado" compact />}
            </article>

            <article className="sivu-panel sivu-dash__next">
              <div className="sivu-panel__head">
                <h2>Agenda</h2>
                <Link to="../mantencion" relative="path" className="sivu-panel__link">
                  Mantención <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              {agendaActual === null && <p className="sivu-state">Cargando…</p>}
              {agendaActual && agendaActual.length === 0 && <p className="sivu-state">Sin fechas sugeridas todavía.</p>}
              {agendaActual && agendaActual.length > 0 && (
                <ul className="sivu-dash__agenda">
                  {/* Dashboard compacto: 3 fechas; el resto desde el enlace del encabezado. */}
                  {agendaActual.slice(0, 3).map((it) => (
                    <li key={`${it.d.tree_id}-${it.tipo}`}>
                      <span className="sivu-dash__agenda-date" title={fechaChile(it.fecha)}>
                        <strong>{it.fecha.slice(8, 10)}</strong>
                        <small>{MESES[Number(it.fecha.slice(5, 7)) - 1]}</small>
                      </span>
                      <span className="sivu-dash__agenda-text">
                        <strong>{it.tipo}</strong>
                        <small>
                          {it.d.tree_code} · {it.d.nombre_comun ?? it.d.especie_cientifica ?? ""} · {it.fecha.slice(0, 4)}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="sivu-terr__note">
                {agendaActual && agendaActual.length > 3 ? `${agendaActual.length - 3} fechas más · ` : ""}Fechas sugeridas del diagnóstico finalizado.
              </p>
            </article>

            <article className="sivu-panel sivu-dash__infra">
              <div className="sivu-panel__head">
                <h2>Infraestructura con daño o interferencia</h2>
                <Link to="../infraestructura" relative="path" className="sivu-panel__link">
                  Mapa <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              {infraActual === null && <p className="sivu-state">Cargando…</p>}
              {infraActual && "error" in infraActual && <p className="sivu-state">Sin datos.</p>}
              {infraActual && "data" in infraActual && (
                <>
                  {/* Como la maqueta: filas de una línea con los árboles con afectación de cada componente (B8). */}
                  <ul className="sivu-bars sivu-bars--infra">
                    {(() => {
                      const filas = COMPONENTES.map((c) => {
                        const comp = infraActual.data.resumen.por_componente.find((p) => p.componente.codigo === c.codigo);
                        return { c, n: CATEGORIAS_CON_AFECTACION.reduce((s, k) => s + (comp?.categorias.find((x) => x.codigo === k)?.arboles ?? 0), 0) };
                      });
                      const max = Math.max(1, ...filas.map((f) => f.n));
                      return filas.map(({ c, n }) => (
                        <li key={c.codigo}>
                          <span>{c.nombre}</span>
                          <i>
                            <b style={{ width: `${(n / max) * 100}%` }} />
                          </i>
                          <strong>{n}</strong>
                        </li>
                      ));
                    })()}
                  </ul>
                  <p className="sivu-terr__note">
                    {infraActual.data.cobertura.arboles_con_evaluacion_valida} árboles con evaluación · {infraActual.data.cobertura.arboles_sin_evaluacion_valida} sin evaluación
                  </p>
                </>
              )}
            </article>

            <article className="sivu-panel sivu-dash__mods">
              <div className="sivu-panel__head">
                <h2>Indicadores biométricos</h2>
                <Link to="../indices" relative="path" className="sivu-panel__link">
                  Indicadores <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              {indicActual === null && <p className="sivu-state">Cargando…</p>}
              {indicActual && "error" in indicActual && <p className="sivu-state">Sin datos.</p>}
              {ind && (
                <>
                  <div className="sivu-indgrid">
                    {indicadores.map((x) => (
                      <div key={x.label} title={x.title}>
                        <span className="sivu-indgrid__lbl">{x.label}</span>
                        <strong>
                          {x.valor}
                          {x.unidad && x.valor !== "—" && <small>{x.unidad}</small>}
                        </strong>
                        <span className="sivu-indgrid__sub">{x.sub}</span>
                      </div>
                    ))}
                  </div>
                  <p className="sivu-terr__note">Inventario de {ind.cobertura.arboles_presentes} árboles presentes (B19).</p>
                </>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
