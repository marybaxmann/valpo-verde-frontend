import { useEffect, useState } from "react";
import { addProjectMember, listProjectMembers, removeProjectMember } from "../api/projectMembers";
import type { ProjectMember } from "../types/projectMember";
import { Icon } from "../components/Icons";

/**
 * Sección de miembros del proyecto (F7). Solo se monta para admin (ver
 * ProjectDetail.tsx) — los tres endpoints son admin-only en el backend
 * (assertAdmin); ocultar esto para usuario_municipal es solo UX, el
 * backend sigue siendo quien de verdad bloquea (403).
 *
 * "Agregar miembro" pide `user_id` (UUID) directamente: no existe
 * todavía ningún endpoint para listar usuarios municipales disponibles
 * (ver README/backend), así que no se inventa un selector — cuando ese
 * endpoint exista, este campo se reemplaza por uno real.
 */
export default function ProjectMembersSection({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newUserId, setNewUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listProjectMembers(projectId)
      .then((data) => setMembers(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los miembros.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [projectId]);

  async function handleAdd() {
    if (!newUserId.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await addProjectMember(projectId, { user_id: newUserId.trim() });
      setNewUserId("");
      load(); // recarga desde el backend, igual que crear proyecto en F6
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "No se pudo agregar el miembro.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    setRemoveError(null);
    try {
      await removeProjectMember(projectId, userId);
      load();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "No se pudo eliminar el miembro.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="card card--pad" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 10 }}>Miembros del proyecto</h3>

      {loading && <p style={{ color: "var(--text-muted)" }}>Cargando miembros…</p>}

      {!loading && error && (
        <p style={{ color: "var(--red-500)" }}>
          <Icon name="alert" size={12} /> {error}
        </p>
      )}

      {!loading && !error && members && members.length === 0 && (
        <p style={{ color: "var(--text-muted)", marginBottom: 14 }}>
          Este proyecto todavía no tiene miembros.
        </p>
      )}

      {!loading && !error && members && members.length > 0 && (
        <table className="dtable" style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Agregado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.user?.nombre ?? m.user_id}</td>
                <td>{m.created_at}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemove(m.user_id)}
                    disabled={removingId === m.user_id}
                  >
                    {removingId === m.user_id ? "Eliminando..." : "Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {removeError && (
        <p style={{ color: "var(--red-500)", fontSize: 12.5, marginBottom: 12 }}>{removeError}</p>
      )}

      {!loading && !error && (
        <div className="field" style={{ maxWidth: 420 }}>
          <label>
            Agregar miembro por user_id <span className="hint">(sin selector de usuarios todavía)</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="UUID del usuario"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              disabled={adding}
            />
            <button className="btn btn-primary" onClick={handleAdd} disabled={adding || !newUserId.trim()}>
              <Icon name="plus" size={14} />
              {adding ? "Agregando..." : "Agregar"}
            </button>
          </div>
          {addError && (
            <p style={{ color: "var(--red-500)", fontSize: 12.5, marginTop: 8 }}>{addError}</p>
          )}
        </div>
      )}
    </div>
  );
}
