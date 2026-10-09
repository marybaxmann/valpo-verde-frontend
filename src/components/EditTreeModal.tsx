import { useEffect, useState } from "react";
import { listSpeciesCatalog, updateTree } from "../api/trees";
import type { SpeciesItem, TreeDetailDTO } from "../types/tree";
import { Icon } from "./Icons";
import { SpeciesCombobox } from "./SpeciesCombobox";

/**
 * Edición de identidad del árbol (PR-006 v7.0): especie, dirección, comuna
 * y lugar de referencia. Nunca medición dendrométrica ni ciclo de vida —
 * ver nota en tree.service.ts (backend) sobre por qué es un concepto
 * distinto de "corregir una medición".
 */
export function EditTreeModal({
  tree,
  onClose,
  onSuccess,
}: {
  tree: TreeDetailDTO;
  onClose: () => void;
  onSuccess: (updated: TreeDetailDTO) => void;
}) {
  const [speciesList, setSpeciesList] = useState<SpeciesItem[]>([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [speciesError, setSpeciesError] = useState<string | null>(null);

  const [speciesId, setSpeciesId] = useState(tree.species?.id ?? "");
  const [direccion, setDireccion] = useState(tree.direccion ?? "");
  const [comuna, setComuna] = useState(tree.comuna ?? "");
  const [lugarReferencia, setLugarReferencia] = useState(tree.lugar_referencia ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listSpeciesCatalog()
      .then((data) => {
        setSpeciesList(data);
        setLoadingSpecies(false);
      })
      .catch((err: unknown) => {
        setSpeciesError(
          err instanceof Error ? err.message : "No se pudo cargar el catálogo de especies."
        );
        setLoadingSpecies(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!speciesId) {
      setErrorMessage("Debes seleccionar una especie.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateTree(tree.id, {
        species_id: speciesId,
        direccion: direccion.trim() || null,
        comuna: comuna.trim() || null,
        lugar_referencia: lugarReferencia.trim() || null,
      });
      onSuccess(res.data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "No se pudo guardar la edición.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content">
        <header className="sivu-modal-header">
          <div>
            <h2>Editar Árbol</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              {tree.tree_code} — identificación y referencia territorial
            </p>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px", minHeight: "auto", border: "none" }}
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="sivu-modal-body">
            {errorMessage && (
              <div className="card card--pad" style={{ marginBottom: 14, borderColor: "var(--classification-critical)" }}>
                <p style={{ color: "var(--classification-critical)", fontSize: 13 }}>
                  <Icon name="alert" size={14} /> {errorMessage}
                </p>
              </div>
            )}

            <div className="sivu-form-section">
              <div className="sivu-form-section__header">
                <Icon name="edit" size={15} /> Datos editables
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Especie *
                </label>
                <SpeciesCombobox
                  species={speciesList}
                  loading={loadingSpecies}
                  error={speciesError}
                  value={speciesId}
                  onChange={setSpeciesId}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Dirección
                  </label>
                  <input
                    type="text"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Comuna
                  </label>
                  <input
                    type="text"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Lugar de Referencia
                </label>
                <input
                  type="text"
                  className="sivu-sig-controls-input"
                  style={{ width: "100%" }}
                  value={lugarReferencia}
                  onChange={(e) => setLugarReferencia(e.target.value)}
                />
              </div>

              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 14, marginBottom: 0 }}>
                La ubicación territorial y la medición dendrométrica no se editan aquí: la
                medición conserva su historial propio y se corrige registrando una nueva.
              </p>
            </div>
          </div>

          <footer className="sivu-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
