import { useState } from "react";
import { editProject } from "../api/projects";
import { ApiError } from "../api/client";
import type { EditProjectInput, Project, ProjectSector } from "../types/project";
import { Icon } from "./Icons";

/**
 * Editar el nombre del proyecto y el del sector (PATCH /api/sivu/projects/:id;
 * solo Administrador). Envía solo lo que cambió. La delimitación del sector
 * (KML/KMZ, D-255) no se edita aquí. Con el proyecto Cerrado el backend
 * rechaza el cambio (409, CC-042); ese mensaje se muestra tal cual.
 */
export function ProjectEditForm({
  project,
  sector,
  onCancel,
  onSaved,
}: {
  project: Project;
  sector: ProjectSector | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nombreProyecto, setNombreProyecto] = useState(project.nombre_proyecto);
  const [nombreSector, setNombreSector] = useState(sector?.nombre_sector ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input: EditProjectInput = {};
  if (nombreProyecto.trim() !== project.nombre_proyecto) input.nombre_proyecto = nombreProyecto.trim();
  if (sector && nombreSector.trim() !== sector.nombre_sector) input.sector = { nombre_sector: nombreSector.trim() };
  const vacio = !nombreProyecto.trim() || (sector !== null && !nombreSector.trim());
  const sinCambios = input.nombre_proyecto === undefined && input.sector === undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (vacio || sinCambios) return;
    setSaving(true);
    setError(null);
    try {
      await editProject(project.id, input);
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "Solo el Administrador puede editar el proyecto."
          : err instanceof Error
            ? err.message
            : "No se pudieron guardar los cambios."
      );
      setSaving(false);
    }
  }

  return (
    <form className="sivu-project-edit" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="nombre-proyecto">Nombre del proyecto</label>
        <input
          id="nombre-proyecto"
          type="text"
          value={nombreProyecto}
          onChange={(e) => setNombreProyecto(e.target.value)}
          disabled={saving}
          autoFocus
        />
      </div>
      {sector && (
        <div className="field">
          <label htmlFor="nombre-sector">Nombre del sector</label>
          <input
            id="nombre-sector"
            type="text"
            value={nombreSector}
            onChange={(e) => setNombreSector(e.target.value)}
            disabled={saving}
          />
          <small className="hint">La delimitación del sector no cambia.</small>
        </div>
      )}
      {vacio && <p className="sivu-state sivu-state--error">Los nombres no pueden quedar vacíos.</p>}
      {error && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      )}
      <div className="sivu-project-edit__actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || vacio || sinCambios}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
