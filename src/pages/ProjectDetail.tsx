import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProject } from "../api/projects";
import type { Project } from "../types/project";
import { Icon } from "../components/Icons";
import { Badge } from "../components/Badge";
import { useAuth } from "../hooks/useAuth";
import ProjectMembersSection from "./ProjectMembersSection";

/**
 * Detalle real de GET /api/projects/:id (F6). Compartido entre /admin
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
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProject(null);

    getProject(projectId)
      .then((data) => {
        if (cancelled) return;
        setProject(data);
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
  }, [projectId]);

  if (loading) {
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

  if (!project) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p className="page-header__sub">{project.institution_name}</p>
        </div>
        <Badge tone={project.status === "activo" ? "green" : "slate"}>{project.status}</Badge>
      </div>

      <div className="card card--pad">
        <div className="info-list">
          <div className="info-list__item">
            <span>Profesional responsable</span>
            {project.responsible_professional ?? "—"}
          </div>
          <div className="info-list__item">
            <span>Creado</span>
            {project.created_at}
          </div>
          <div className="info-list__item">
            <span>Última actualización</span>
            {project.updated_at}
          </div>
        </div>
      </div>

      {profile?.role === "admin" && <ProjectMembersSection projectId={project.id} />}

      <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 14 }}>
        Sin inventario ni módulos internos todavía — fases posteriores.
      </p>
    </div>
  );
}
