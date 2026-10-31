import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listProjects } from "../api/projects";
import type { Project } from "../types/project";
import { Icon } from "../components/Icons";
import { Badge } from "../components/Badge";
import { NewProjectModal } from "../components/NewProjectModal";
import { ESTADO_PROYECTO_LABEL } from "../lib/projects";
import { fechaHoraChile } from "../lib/dates";
import { basePathForRole } from "../lib/roles";

/**
 * Listado real de GET /api/sivu/projects (Fase 7, Paso 2; antes F6 con la demo). Compartido entre /admin y
 * /usuario: el backend ya devuelve solo lo que corresponde a cada rol
 * (admin → todos; usuario_municipal → solo sus membresías) — este
 * componente no filtra por rol. Los proyectos cerrados se ocultan de la
 * vista inicial y se muestran con «Ver proyectos cerrados».
 *
 * "Crear proyecto" se decide con `profile.role` real, no con la ruta
 * desde la que se montó este componente.
 */
export default function ProjectsList() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const basePath = basePathForRole(profile?.role);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [creado, setCreado] = useState<string | null>(null);
  const [verCerrados, setVerCerrados] = useState(false);
  const cerrados = (projects ?? []).filter((p) => p.estado_proyecto === "cerrado").length;
  const visibles = (projects ?? []).filter((p) => verCerrados || p.estado_proyecto !== "cerrado");

  function load() {
    setLoading(true);
    setError(null);
    listProjects()
      .then((data) => setProjects(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los proyectos.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isAdmin ? "Proyectos" : "Mis proyectos"}</h1>
          <p className="page-header__sub">
            Selecciona el proyecto de gestión territorial en el que deseas trabajar.
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setCreado(null);
              setShowModal(true);
            }}
          >
            <Icon name="plus" size={15} />
            Crear proyecto
          </button>
        )}
      </div>

      {creado && (
        <p className="sivu-state sivu-state--ok" role="status">
          {creado}
        </p>
      )}

      {loading && <p style={{ color: "var(--text-muted)" }}>Cargando proyectos…</p>}

      {!loading && error && (
        <p style={{ color: "var(--red-500)" }}>
          <Icon name="alert" size={12} /> {error}
        </p>
      )}

      {!loading && !error && projects && projects.length === 0 && (
        <div className="card card--pad">
          <p style={{ color: "var(--text-muted)" }}>
            {isAdmin ? "Todavía no hay proyectos creados." : "No tienes acceso a ningún proyecto todavía."}
          </p>
        </div>
      )}

      {!loading && !error && projects && projects.length > 0 && (
        <div className="sivu-project-grid">
          {visibles.map((p) => (
            <div key={p.id} className="card card--pad sivu-project-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 className="sivu-project-card__title">{p.nombre_proyecto}</h3>
                </div>
                <Badge tone={p.estado_proyecto === "activo" ? "green" : "slate"}>
                  {ESTADO_PROYECTO_LABEL[p.estado_proyecto]}
                </Badge>
              </div>
              <div className="sivu-project-card__meta">
                <span>Creado</span>
                <strong>{fechaHoraChile(p.created_at)}</strong>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <Link
                  className="btn btn-primary"
                  to={`${basePath}/projects/${p.id}/dashboard`}
                  style={{ flex: 1, justifyContent: "center", gap: 6 }}
                >
                  <Icon name="leaf" size={14} />
                  Entrar al proyecto
                </Link>
                <Link
                  className="btn btn-secondary"
                  to={`${basePath}/projects/${p.id}`}
                  title={isAdmin ? "Ficha, configuración y miembros del proyecto" : "Ficha del proyecto"}
                  style={{ gap: 6 }}
                >
                  <Icon name={isAdmin ? "wrench" : "eye"} size={14} />
                  {isAdmin ? "Configurar" : "Ficha"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && cerrados > 0 && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => setVerCerrados((v) => !v)}>
          {verCerrados ? "Ocultar proyectos cerrados" : `Ver proyectos cerrados (${cerrados})`}
        </button>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(r) => {
            setShowModal(false);
            setCreado(
              r.superficiesExcluidas > 0
                ? `Proyecto creado. ${r.superficiesExcluidas} punto(s) o línea(s) del archivo no se incluyeron en el sector.`
                : "Proyecto creado."
            );
            load(); // recarga desde el backend — no se agrega localmente
          }}
        />
      )}
    </div>
  );
}
