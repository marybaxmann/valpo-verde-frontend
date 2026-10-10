import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createProject, listProjects } from "../api/projects";
import type { Project } from "../types/project";
import { Icon } from "../components/Icons";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";

/**
 * Listado real de GET /api/projects (F6). Compartido entre /admin y
 * /usuario: el backend ya devuelve solo lo que corresponde a cada rol
 * (admin → todos; usuario_municipal → solo sus membresías) — este
 * componente no filtra nada por su cuenta, solo muestra lo que llega.
 *
 * "Crear proyecto" se decide con `profile.role` real, no con la ruta
 * desde la que se montó este componente.
 */
export default function ProjectsList() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const basePath = isAdmin ? "/admin" : "/usuario";

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", institution_name: "", responsible_professional: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  async function handleCreate() {
    if (!form.name.trim() || !form.institution_name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createProject({
        name: form.name.trim(),
        institution_name: form.institution_name.trim(),
        responsible_professional: form.responsible_professional.trim() || undefined,
      });
      setShowModal(false);
      setForm({ name: "", institution_name: "", responsible_professional: "" });
      load(); // recarga desde el backend — no se agrega localmente
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudo crear el proyecto.");
    } finally {
      setCreating(false);
    }
  }

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
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={15} />
            Crear proyecto
          </button>
        )}
      </div>

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
          {projects.map((p) => (
            <div key={p.id} className="card card--pad sivu-project-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <h3 className="sivu-project-card__title">{p.name}</h3>
                  <p className="sivu-project-card__inst">{p.institution_name}</p>
                </div>
                <Badge tone={p.status === "activo" ? "green" : "slate"}>{p.status}</Badge>
              </div>
              <div className="sivu-project-card__meta">
                <span>Profesional responsable</span>
                <strong>{p.responsible_professional ?? "—"}</strong>
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

      {showModal && (
        <Modal
          title="Crear proyecto"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={creating}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Creando..." : "Crear proyecto"}
              </button>
            </>
          }
        >
          {createError && (
            <p style={{ color: "var(--red-500)", fontSize: 12.5, marginBottom: 12 }}>{createError}</p>
          )}
          <div className="field">
            <label>Nombre del proyecto</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={creating}
            />
          </div>
          <div className="field">
            <label>Institución responsable</label>
            <input
              type="text"
              value={form.institution_name}
              onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
              disabled={creating}
            />
          </div>
          <div className="field">
            <label>
              Profesional responsable <span className="hint">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.responsible_professional}
              onChange={(e) => setForm({ ...form, responsible_professional: e.target.value })}
              disabled={creating}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
