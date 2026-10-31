import { useEffect, useState } from "react";
import { SivuTable } from "../components/SivuTable";
import { addProjectMember, listProjectMembers, removeProjectMember } from "../api/projectMembers";
import { ApiError } from "../api/client";
import type { ProjectMember } from "../types/projectMember";
import { Icon } from "../components/Icons";
import { fechaChile } from "../lib/dates";

/**
 * Miembros del proyecto (`/api/sivu`; PR-004 v7.0). Solo se monta para el
 * Administrador (ver ProjectDetail.tsx): los tres endpoints son admin-only en
 * el backend; ocultarlo a los demás roles es solo UX, el backend sigue
 * bloqueando (403). Con el proyecto Cerrado los miembros se siguen
 * gestionando (CC-042).
 *
 * «Agregar miembro» pide el `user_id` directamente: no existe un endpoint
 * para listar usuarios (B11, docs/propuestas-cc/pendientes-backend.md), así
 * que no se inventa un selector.
 */
export default function ProjectMembersSection({ projectId }: { projectId: string }) {
  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newUserId, setNewUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Sin setState síncrono: «cargando» se deduce de que aún no hay lista ni error.
  function load() {
    listProjectMembers(projectId)
      .then((data) => {
        setMembers(data);
        setError(null);
      })
      .catch((err: unknown) => setError(mensajeError(err, "No se pudieron cargar los miembros.")));
  }

  useEffect(load, [projectId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserId.trim()) return;
    setAdding(true);
    setAddError(null);
    setAdded(false);
    try {
      await addProjectMember(projectId, { user_id: newUserId.trim() });
      setNewUserId("");
      setAdded(true);
      load(); // la lista se vuelve a leer del backend
    } catch (err) {
      setAddError(
        err instanceof ApiError && err.status === 400
          ? "El identificador no tiene el formato correcto (ocho, cuatro, cuatro, cuatro y doce caracteres separados por guiones)."
          : mensajeError(err, "No se pudo agregar el miembro.")
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    setRemoveError(null);
    try {
      await removeProjectMember(projectId, userId);
      setConfirmingId(null);
      load();
    } catch (err) {
      setRemoveError(mensajeError(err, "No se pudo quitar el miembro."));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="card card--pad sivu-members" aria-labelledby="miembros-titulo">
      <header className="sivu-members__head">
        <h2 id="miembros-titulo">Miembros del proyecto</h2>
        {members && !error && (
          <span className="sivu-members__count">
            {members.length} {members.length === 1 ? "miembro" : "miembros"}
          </span>
        )}
      </header>
      <p className="sivu-members__intro">
        Solo los miembros acceden al proyecto. El rol de cada persona es el de su cuenta, no el del proyecto.
      </p>

      {!members && !error && <p className="sivu-state">Cargando miembros…</p>}

      {error && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {error}
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
            Reintentar
          </button>
        </p>
      )}

      {!error && members && (
        <SivuTable
          columns={[
            { label: "Persona", width: "52%" },
            { label: "Desde", width: "18%" },
            { label: "", width: "30%", align: "right" },
          ]}
          empty={members.length === 0 ? { icon: "user", title: "Este proyecto todavía no tiene miembros." } : null}
        >
          {members.map((m) => (
            <tr key={m.id}>
              <td className="sivu-table__strong sivu-members__person">
                {m.user?.nombre ?? <span className="sivu-members__noname">Sin nombre registrado</span>}
                <small className="sivu-members__id">{m.user_id}</small>
              </td>
              <td className="sivu-table__num">{fechaChile(m.created_at)}</td>
              <td className="sivu-table__actions">
                {confirmingId === m.user_id ? (
                  <span className="sivu-members__confirm">
                    <span>¿Quitar del proyecto?</span>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemove(m.user_id)}
                      disabled={removingId === m.user_id}
                    >
                      {removingId === m.user_id ? "Quitando…" : "Sí, quitar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmingId(null)}
                      disabled={removingId === m.user_id}
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setRemoveError(null);
                      setAdded(false);
                      setConfirmingId(m.user_id);
                    }}
                  >
                    Quitar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </SivuTable>
      )}

      {removeError && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {removeError}
        </p>
      )}

      {!error && members && (
        <form className="sivu-members__add" onSubmit={handleAdd}>
          <div className="field">
            <label htmlFor="nuevo-miembro">
              Agregar miembro <span className="hint">identificador de usuario</span>
            </label>
            <div className="sivu-members__addrow">
              <input
                id="nuevo-miembro"
                type="text"
                placeholder="00000000-0000-0000-0000-000000000000"
                autoComplete="off"
                spellCheck={false}
                value={newUserId}
                onChange={(e) => {
                  setNewUserId(e.target.value);
                  setAdded(false);
                }}
                disabled={adding}
              />
              <button type="submit" className="btn btn-primary" disabled={adding || !newUserId.trim()}>
                <Icon name="plus" size={14} />
                {adding ? "Agregando…" : "Agregar"}
              </button>
            </div>
            <small className="hint" data-refs="B11">
              Todavía no se puede elegir a la persona de una lista: el sistema no entrega el listado de usuarios.
              Usa el identificador de su cuenta.
            </small>
          </div>
          {addError && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {addError}
            </p>
          )}
          {added && <p className="sivu-state sivu-state--ok">Miembro agregado.</p>}
        </form>
      )}
    </section>
  );
}

/** Mensaje del backend, salvo el 403, que se explica en palabras simples. */
function mensajeError(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError && err.status === 403) {
    return "Solo el Administrador gestiona los miembros del proyecto.";
  }
  return err instanceof Error ? err.message : porDefecto;
}
