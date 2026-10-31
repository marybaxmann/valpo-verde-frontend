import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import { Icon, type IconName } from "../components/Icons";

const MODULE_LINKS: { to: string; label: string; icon: IconName }[] = [
  // Orden y nombres de CC-059 / CC-060.
  { to: "dashboard", label: "Dashboard", icon: "chart" },
  { to: "indices", label: "Indicadores biométricos", icon: "sort" },
  { to: "mantencion", label: "Mantención", icon: "wrench" },
  { to: "incidencias", label: "Incidencias", icon: "alert" },
  { to: "mapa", label: "Inventario", icon: "leaf" },
  { to: "inspeccion", label: "Riesgo Arbóreo", icon: "check-square" },
  { to: "infraestructura", label: "Infraestructura", icon: "building" },
];
import { Badge } from "../components/Badge";
import { useAuth } from "../hooks/useAuth";
import ProjectMembersSection from "./ProjectMembersSection";
import { ProjectEditForm } from "../components/ProjectEditForm";
import { ProjectStateControl } from "../components/ProjectStateControl";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { fechaHoraChile } from "../lib/dates";
import { ESTADO_PROYECTO_LABEL } from "../lib/projects";

/**
 * Detalle real de GET /api/sivu/projects/:id (Fase 7, Paso 2; antes F6
 * con la demo): proyecto y su sector. Compartido entre /admin
 * y /usuario: el backend decide acceso (admin siempre; usuario_municipal
 * solo con membership) — un 403/404 real se muestra tal cual, sin
 * inventar un proyecto de repuesto ni redirigir a otro lado.
 *
 * La sección de miembros (F7) solo se monta si `profile.role === "admin"`
 * — los endpoints de /members son admin-only en el backend, así que
 * usuario_municipal ni siquiera ve los controles, aunque el backend
 * también los rechazaría igual si los llamara directo.
 */
export default function ProjectDetail() {
  const { projectId = "" } = useParams();
  const { profile } = useAuth();
  const { hash } = useLocation();
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0);
  const { refresh: refreshCurrentProject } = useCurrentProject();
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    let cancelled = false;

    getProjectWithSector(projectId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el proyecto.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, version]);

  function handleSaved() {
    setEditing(false);
    setSaved(true);
    setVersion((v) => v + 1); // la ficha se vuelve a leer del backend
    refreshCurrentProject(); // y el nombre de la barra superior
  }

  // «Miembros del proyecto» (menú del proyecto, barra superior) llega con #miembros.
  useEffect(() => {
    if (hash === "#miembros" && detail) {
      document.getElementById("miembros")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, detail]);

  // Al cambiar de proyecto, la ficha anterior no se muestra mientras llega la nueva.
  if (loading || (detail && detail.proyecto.id !== projectId && !error)) {
    return <p style={{ color: "var(--text-muted)" }}>Cargando proyecto…</p>;
  }

  if (error) {
    return (
      <div className="card card--pad">
        <p style={{ color: "var(--red-500)" }}>
          <Icon name="alert" size={12} /> {error}
        </p>
      </div>
    );
  }

  if (!detail) return null;
  const { proyecto: project, sector } = detail;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{project.nombre_proyecto}</h1>
          <p className="page-header__sub">Ficha del proyecto</p>
        </div>
        <Badge tone={project.estado_proyecto === "activo" ? "green" : "slate"}>
          {ESTADO_PROYECTO_LABEL[project.estado_proyecto]}
        </Badge>
      </div>

      {isAdmin && !editing && (
        <div className="sivu-project-state-row">
          <ProjectStateControl key={project.estado_proyecto} project={project} onChanged={handleSaved} />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {MODULE_LINKS.map((m, i) => (
          <Link
            key={m.to}
            to={m.to}
            className={`btn ${i === 0 ? "btn-primary" : "btn-secondary"}`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Icon name={m.icon} size={15} />
            {m.label}
          </Link>
        ))}
      </div>

      <div className="card card--pad">
        {isAdmin && !editing && (
          <div className="sivu-project-card__head">
            {saved && <span className="sivu-state sivu-state--ok">Cambios guardados.</span>}
            {project.estado_proyecto === "cerrado" ? (
              <span className="sivu-state">Proyecto cerrado: los nombres no se pueden editar.</span>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSaved(false);
                  setEditing(true);
                }}
              >
                <Icon name="edit" size={13} />
                Editar nombres
              </button>
            )}
          </div>
        )}
        {editing ? (
          <ProjectEditForm
            project={project}
            sector={sector}
            onCancel={() => setEditing(false)}
            onSaved={handleSaved}
          />
        ) : (
        <div className="info-list">
          <div className="info-list__item">
            <span>Sector</span>
            {sector ? sector.nombre_sector : "Sin sector registrado"}
          </div>
          {sector && (
            <div className="info-list__item">
              <span>Superficie del sector</span>
              {sector.superficie_sector_m2.toLocaleString("es-CL")} m²
            </div>
          )}
          <div className="info-list__item">
            <span>Creado</span>
            {fechaHoraChile(project.created_at)}
          </div>
          <div className="info-list__item">
            <span>Última actualización</span>
            {/* El nombre del sector se guarda en su propia tabla: cuenta el cambio más reciente de los dos. */}
            {fechaHoraChile(sector && Date.parse(sector.updated_at) > Date.parse(project.updated_at) ? sector.updated_at : project.updated_at)}
          </div>
        </div>
        )}
      </div>

      {isAdmin && (
        <div id="miembros">
          <ProjectMembersSection projectId={project.id} />
        </div>
      )}
    </div>
  );
}
