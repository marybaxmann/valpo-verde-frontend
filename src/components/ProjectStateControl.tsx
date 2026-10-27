import { useState } from "react";
import { changeProjectState } from "../api/projects";
import { ApiError } from "../api/client";
import type { Project } from "../types/project";
import { Icon } from "./Icons";

/**
 * Cerrar o reabrir el proyecto (PATCH /api/sivu/projects/:id/estado; D-265,
 * CC-042). Solo Administrador; siempre con confirmación. Los textos resumen
 * CC-042 sin agregar reglas: cerrado = solo consulta; las OT e incidencias
 * abiertas se conservan sin avanzar; los miembros se siguen gestionando.
 */
export function ProjectStateControl({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cerrar = project.estado_proyecto === "activo";

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await changeProjectState(project.id, cerrar ? "cerrado" : "activo");
      setConfirming(false);
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "Solo el Administrador puede cerrar o reabrir el proyecto."
          : err instanceof Error
            ? err.message
            : "No se pudo cambiar el estado del proyecto."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        <Icon name={cerrar ? "lock" : "unlock"} size={13} />
        {cerrar ? "Cerrar proyecto" : "Reabrir proyecto"}
      </button>
    );
  }

  return (
    <div className="sivu-project-state" role="alertdialog" aria-labelledby="estado-titulo">
      <h2 id="estado-titulo">{cerrar ? "¿Cerrar el proyecto?" : "¿Reabrir el proyecto?"}</h2>
      {cerrar ? (
        <ul>
          <li>Quedará solo para consulta: árboles, mapa, fichas, indicadores e historial.</li>
          <li>No se podrán registrar árboles ni crear OT, inspecciones, mantenimientos o incidencias.</li>
          <li>Las OT e incidencias abiertas se conservan en su estado y no avanzan hasta que se reabra.</li>
          <li>Los miembros se pueden seguir gestionando. Se puede reabrir en cualquier momento.</li>
        </ul>
      ) : (
        <p>Volverá a estar activo. Su historial no cambia y las OT e incidencias abiertas podrán avanzar.</p>
      )}
      {error && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      )}
      <div className="sivu-project-state__actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className={`btn btn-sm ${cerrar ? "btn-danger" : "btn-primary"}`}
          onClick={handleConfirm}
          disabled={saving}
        >
          {saving ? "Guardando…" : cerrar ? "Sí, cerrar" : "Sí, reabrir"}
        </button>
      </div>
    </div>
  );
}
