import { useState, type ReactNode } from "react";
import type { CatalogItem } from "../api/moduleRecords";
import { Icon } from "./Icons";

/**
 * Detalle de un registro de gestión (orden de trabajo / incidencia) con
 * cambio de estado persistido en el backend. El cambio de estado solo se
 * ofrece al Usuario municipal (PR-003 v6.0, CC-022); el Administrador es
 * solo lectura. El backend y RLS lo vuelven a exigir.
 */
export function RecordDetailModal({
  title,
  code,
  fields,
  states,
  currentState,
  canChangeState,
  withNote = false,
  onChangeState,
  onClose,
  footerExtra,
}: {
  title: string;
  code: string | null;
  fields: { label: string; value: ReactNode; full?: boolean }[];
  states: CatalogItem[];
  currentState: string;
  canChangeState: boolean;
  withNote?: boolean;
  onChangeState: (estado: string, nota: string | null) => Promise<void>;
  onClose: () => void;
  footerExtra?: ReactNode;
}) {
  const [nextState, setNextState] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSave() {
    if (!nextState) return setError("Selecciona el nuevo estado.");
    setSaving(true);
    setError(null);
    try {
      await onChangeState(nextState, nota.trim() || null);
      setDone("Estado actualizado.");
      setNextState("");
      setNota("");
    } catch (err: unknown) {
      setError(err instanceof Error ? `No fue posible actualizar el estado: ${err.message}` : "No fue posible actualizar el estado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content">
        <header className="sivu-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2>{title}</h2>
            {code && <span className="status-pill">{code}</span>}
            {done && <span style={{ fontSize: 12, color: "var(--sivu-primary)", fontWeight: 600 }}>✓ {done}</span>}
          </div>
          <button className="btn btn-secondary" style={{ padding: "4px 8px", border: "none" }} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="sivu-modal-body">
          <div className="sivu-tech-grid" style={{ marginBottom: 14 }}>
            {fields.map((f) => (
              <div key={f.label} className={`sivu-tech-cell ${f.full ? "sivu-tech-cell--full" : ""}`}>
                <span className="sivu-tech-cell__label">{f.label}</span>
                <span className="sivu-tech-cell__value" style={{ whiteSpace: "pre-line" }}>
                  {f.value || "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="card card--pad" style={{ background: "var(--surface-background)", padding: 14 }}>
            <span className="sivu-tech-cell__label" style={{ display: "block", marginBottom: 8 }}>
              Estado
            </span>
            {canChangeState ? (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={nextState} onChange={(e) => setNextState(e.target.value)} style={{ minWidth: 200, height: 34 }}>
                    <option value="">Cambiar a…</option>
                    {states
                      .filter((s) => s.codigo !== currentState)
                      .map((s) => (
                        <option key={s.codigo} value={s.codigo}>
                          {s.etiqueta}
                        </option>
                      ))}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !nextState}>
                    <Icon name="check" size={13} />
                    {saving ? "Guardando..." : "Actualizar estado"}
                  </button>
                </div>
                {withNote && (
                  <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                    <label>Nota de seguimiento (opcional)</label>
                    <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} style={{ width: "100%" }} />
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                La actualización de estado la realiza el Usuario municipal del proyecto.
              </p>
            )}
            {error && <p style={{ color: "var(--classification-critical)", fontSize: 12.5, margin: "8px 0 0" }}>{error}</p>}
          </div>
        </div>
        <footer className="sivu-modal-footer" style={{ justifyContent: "space-between" }}>
          <div>{footerExtra}</div>
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
