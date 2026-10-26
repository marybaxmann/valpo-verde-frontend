import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import { Icon, type IconName } from "../components/Icons";
import { PendingNotice } from "../components/PendingNotice";
import { NAV_GROUPS } from "../lib/navigation";
import { ESTADO_PROYECTO_LABEL } from "../lib/projects";

/**
 * Dashboard del proyecto (Fase 7, Paso 4): composición de la maqueta
 * SIVU Lab (CC-057), sin mapa. Cada panel muestra el dato que entregue la
 * API de la Fase 6 o, mientras no exista, un estado «pendiente» que dice
 * qué falta (CC-059). El frontend no cuenta ni clasifica: los indicadores
 * esperan el resumen del proyecto (B7) y los listados (B1, B3, B5, B8, B9).
 * Referencias en docs/propuestas-cc/pendientes-backend.md.
 */

interface KpiSpec {
  label: string;
  icon: IconName;
  refs: string;
}

const KPIS: KpiSpec[] = [
  { label: "Árboles registrados", icon: "leaf", refs: "B1 · B7" },
  { label: "Georreferenciados", icon: "pin", refs: "B1 · B7" },
  { label: "Árboles evaluados", icon: "check-square", refs: "B7" },
  { label: "Especies", icon: "list", refs: "B7" },
  { label: "OT abiertas", icon: "wrench", refs: "B3 · B7" },
  { label: "Incidencias abiertas", icon: "alert", refs: "B9 · B7" },
];

export default function ProjectDashboard() {
  const { projectId = "" } = useParams();
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <section className="sivu-kpis" aria-label="Indicadores principales">
            {KPIS.map((k) => (
              <div key={k.label} className="sivu-kpi sivu-kpi--pending">
                <span className="sivu-kpi__icon" aria-hidden="true">
                  <Icon name={k.icon} size={16} />
                </span>
                <span className="sivu-kpi__lbl">{k.label}</span>
                <span className="sivu-kpi__val">Pendiente</span>
                <span className="sivu-kpi__sub">{k.refs}</span>
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
              <PendingNotice what="la clasificación de riesgo vigente por árbol" refs="Resumen del proyecto · B7" />
            </article>

            <article className="sivu-panel sivu-dash__comp">
              <div className="sivu-panel__head">
                <h2>Composición del inventario</h2>
                <Link to="../mapa" relative="path" className="sivu-panel__link">
                  Inventario <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              <PendingNotice what="los árboles por estado de ciclo de vida ni las especies más registradas" refs="Resumen del proyecto · B7" />
            </article>

            <article className="sivu-panel sivu-dash__ops">
              <div className="sivu-panel__head">
                <h2>Operación</h2>
              </div>
              <PendingNotice what="las órdenes de trabajo ni las incidencias por estado" refs="B3 · B9 · B7" compact />
            </article>

            <article className="sivu-panel sivu-dash__next">
              <div className="sivu-panel__head">
                <h2>Agenda</h2>
                <Link to="../mantencion" relative="path" className="sivu-panel__link">
                  Mantención <Icon name="arrow-right" size={12} />
                </Link>
              </div>
              <PendingNotice what="las OT programadas ni los recordatorios de próxima inspección y monitoreo" refs="B3 · B5 (CC-037)" />
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
