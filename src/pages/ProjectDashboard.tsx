import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import { Icon, type IconName } from "../components/Icons";
import { PendingNotice } from "../components/PendingNotice";
import { NAV_GROUPS } from "../lib/navigation";
import { ESTADO_PROYECTO_LABEL } from "../lib/projects";
import { obtenerResumen } from "../api/resumen";
import { listarDiagnosticos } from "../api/diagnosticos";
import type { Diagnostico } from "../types/diagnostico";
import { fechaChile } from "../lib/dates";
import type { ResumenProyecto } from "../types/resumen";
import { BarRow } from "../components/BarRow";
import { getClassificationTone } from "../components/ClassificationBadge";

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
  const actual = resumen?.id === projectId ? resumen : null;
  const r = actual && "data" in actual ? actual.data : null;
  const errorResumen = actual && "error" in actual ? actual.error : null;
  const kpis: { label: string; icon: IconName; value: number | undefined; sub: string }[] = [
    { label: "Árboles registrados", icon: "leaf", value: r?.arboles_total, sub: "en el inventario" },
    { label: "Georreferenciados", icon: "pin", value: r?.georreferenciados, sub: r ? `${r.sin_georreferenciar} sin ubicación` : "" },
    { label: "Con diagnóstico", icon: "check-square", value: r?.con_diagnostico, sub: "inspección finalizada" },
    { label: "Sin evaluación", icon: "alert", value: r?.sin_evaluacion, sub: "aún no inspeccionados" },
    { label: "Especies", icon: "list", value: r?.especies_distintas, sub: "distintas" },
  ];
  const modules = NAV_GROUPS.flatMap((g) => g.modules).filter((m) => m.path !== "dashboard");

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
                <span className="sivu-kpi__icon" aria-hidden="true">
                  <Icon name={k.icon} size={16} />
                </span>
                <span className="sivu-kpi__lbl">{k.label}</span>
                <span className="sivu-kpi__val">{r ? k.value : errorResumen ? "—" : "…"}</span>
                <span className="sivu-kpi__sub">{k.sub}</span>
              </div>
            ))}
            <div className="sivu-kpi sivu-kpi--pending" data-refs="B9">
              <span className="sivu-kpi__icon" aria-hidden="true">
                <Icon name="alert" size={16} />
              </span>
              <span className="sivu-kpi__lbl">Incidencias abiertas</span>
              <span className="sivu-kpi__val">Pendiente</span>
              <span className="sivu-kpi__sub">en desarrollo</span>
            </div>
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
                  {r.por_riesgo.map((c) => (
                    <BarRow key={c.codigo ?? "sin"} label={c.etiqueta ?? "Sin clasificación"} value={c.total} total={r.arboles_total} tone={tonoBarra(c.etiqueta)} />
                  ))}
                  <BarRow label="Sin evaluación" value={r.sin_evaluacion} total={r.arboles_total} tone="#A7B0AB" />
                  <p className="sivu-terr__note">Según el diagnóstico finalizado; pasa a vigente al completar la OT.</p>
                </>
              ) : (
                <p className="sivu-state">{errorResumen ? "Sin datos." : "Cargando…"}</p>
              )}
            </article>

            <article className="sivu-panel sivu-dash__comp">
              <div className="sivu-panel__head">
                <h2>Composición del inventario</h2>
                <Link to="../mapa" relative="path" className="sivu-panel__link">
                  Inventario <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              {r ? (
                <>
                  {r.por_ciclo_vida.map((c) => (
                    <BarRow key={c.codigo ?? "sin"} label={c.etiqueta ?? c.codigo ?? "—"} value={c.total} total={r.arboles_total} />
                  ))}
                  <h3 className="sivu-dash__sub">Especies más registradas</h3>
                  {r.especies_top.map((e) => (
                    <BarRow
                      key={e.especie_cientifica ?? e.nombre_comun ?? "sin"}
                      label={e.nombre_comun ? `${e.nombre_comun} (${e.especie_cientifica ?? "—"})` : e.especie_cientifica ?? "Sin especie"}
                      value={e.total}
                      total={r.arboles_total}
                      tone="#3fb07e"
                    />
                  ))}
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
                <ul className="sivu-dash__states">
                  {r.ot_por_estado.map((c) => (
                    <li key={c.codigo ?? "sin"}>
                      <span>{c.etiqueta ?? c.codigo ?? "—"}</span>
                      <strong>{c.total}</strong>
                    </li>
                  ))}
                </ul>
              )}
              {r && r.ot_por_estado.length === 0 && <p className="sivu-state">El proyecto no tiene órdenes de trabajo.</p>}
              <PendingNotice what="las incidencias por estado" refs="B9" compact />
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
                  {agendaActual.slice(0, 6).map((it) => (
                    <li key={`${it.d.tree_id}-${it.tipo}`}>
                      <span className="sivu-dash__agenda-date">{fechaChile(it.fecha)}</span>
                      <span>
                        <strong>{it.tipo}</strong>
                        <small>
                          {it.d.tree_code} · {it.d.nombre_comun ?? it.d.especie_cientifica ?? ""}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="sivu-terr__note">Fechas sugeridas del diagnóstico finalizado.</p>
            </article>

            <article className="sivu-panel sivu-dash__infra">
              <div className="sivu-panel__head">
                <h2>Infraestructura con daño o interferencia</h2>
                <Link to="../infraestructura" relative="path" className="sivu-panel__link">
                  Infraestructura <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              <PendingNotice what="las evaluaciones de infraestructura por componente" refs="B8" />
            </article>

            <article className="sivu-panel sivu-dash__mods">
              <div className="sivu-panel__head">
                <h2>Módulos</h2>
              </div>
              <div className="sivu-modgrid">
                {modules.map((m) => (
                  <Link key={m.path} to={`../${m.path}`} relative="path" className="sivu-modtile">
                    <span className="sivu-modtile__icon">
                      <Icon name={m.icon} size={17} />
                    </span>
                    <strong>{m.label}</strong>
                    <small>{m.hint}</small>
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
