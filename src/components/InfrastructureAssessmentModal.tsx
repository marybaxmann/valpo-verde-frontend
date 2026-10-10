import { useEffect, useState } from "react";
import {
  createInfrastructureAssessment,
  getModuleCatalogs,
  type InfrastructureAssessmentDTO,
  type InfraVariables,
  type ModuleCatalogs,
} from "../api/moduleRecords";
import { Icon } from "./Icons";
import { INFRA_COMPONENTS, cleanInfraVariables, emptyInfraVariables, isVisible, type InfraField } from "./infrastructureFields";

/**
 * Registro de evaluación de infraestructura (datos crudos por componente).
 * Persiste vía POST /api/trees/:treeId/infrastructure-assessments. No
 * calcula severidad ni nivel global de conflicto (M04 fuera de este corte).
 */
export function InfrastructureAssessmentModal({
  treeId,
  treeLabel,
  onClose,
  onSuccess,
}: {
  treeId: string;
  treeLabel: string;
  onClose: () => void;
  onSuccess: (dto: InfrastructureAssessmentDTO) => void;
}) {
  const [catalogs, setCatalogs] = useState<ModuleCatalogs | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [vars, setVars] = useState<InfraVariables>(emptyInfraVariables);
  const [observaciones, setObservaciones] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModuleCatalogs()
      .then(setCatalogs)
      .catch((err: unknown) => setCatalogError(err instanceof Error ? err.message : "No se pudieron cargar los catálogos."));
  }, []);

  const set = (key: string, value: string | null) => setVars((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await createInfrastructureAssessment(treeId, {
        fecha_evaluacion: fecha,
        variables: cleanInfraVariables(vars),
        observaciones: observaciones.trim() || null,
      });
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la evaluación de infraestructura.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(f: InfraField) {
    if (f.kind === "check") {
      return (
        <label key={f.key} className="radio-opt" style={{ marginRight: 14 }}>
          <input type="checkbox" checked={vars[f.key] === "Sí"} onChange={(e) => set(f.key, e.target.checked ? "Sí" : "No")} />{" "}
          {f.label}
        </label>
      );
    }
    if (f.kind === "select") {
      const options = (f.domain && catalogs?.infrastructure[f.domain]) || [];
      return (
        <div key={f.key} className="field" style={{ marginBottom: 10 }}>
          <label>{f.label}</label>
          <select value={vars[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value || null)}>
            <option value="">Sin registrar</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div key={f.key} className="field" style={{ marginBottom: 10 }}>
        <label>{f.label}</label>
        <div className="radio-row">
          {["Sí", "No"].map((o) => (
            <label key={o} className="radio-opt">
              <input type="radio" checked={vars[f.key] === o} onChange={() => set(f.key, o)} /> {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content sivu-modal-content--large">
        <header className="sivu-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2>Registrar evaluación de infraestructura</h2>
            <span className="status-pill">{treeLabel}</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: "4px 8px", minHeight: "auto", border: "none" }} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="sivu-modal-body">
          {catalogError && <p style={{ color: "var(--classification-critical)", fontSize: 12.5 }}>{catalogError}</p>}

          <div className="field" style={{ maxWidth: 220, marginBottom: 14 }}>
            <label>Fecha de evaluación</label>
            <input type="date" value={fecha} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setFecha(e.target.value)} />
          </div>

          {INFRA_COMPONENTS.map((c) => {
            const gate = vars[c.gate.key];
            const checks = c.fields.filter((f) => f.kind === "check" && isVisible(f, gate, vars));
            const others = c.fields.filter((f) => f.kind !== "check" && isVisible(f, gate, vars));
            return (
              <div key={c.title} className="sivu-form-section">
                <div className="sivu-form-section__header">
                  <Icon name="building" size={15} /> {c.title}
                </div>
                {renderField(c.gate)}
                {gate === "Sí" && (
                  <>
                    {others.filter((f) => f.kind === "select").map(renderField)}
                    {checks.length > 0 && (
                      <div className="field" style={{ marginBottom: 10 }}>
                        <label>Tipo/s de conflicto o daño observados</label>
                        <div style={{ display: "flex", flexWrap: "wrap", rowGap: 6 }}>{checks.map(renderField)}</div>
                      </div>
                    )}
                    {others.filter((f) => f.kind === "yesno").map(renderField)}
                  </>
                )}
              </div>
            );
          })}

          <div className="field">
            <label>Observaciones (opcional)</label>
            <textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} style={{ width: "100%" }} />
          </div>

          <p style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
            Se registran las respuestas observadas por componente. La clasificación global de conflicto queda pendiente.
          </p>
          {error && <p style={{ color: "var(--classification-critical)", fontSize: 12.5 }}>{error}</p>}
        </div>

        <footer className="sivu-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !catalogs}>
            {submitting ? "Guardando..." : "Guardar evaluación"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Bloques de presentación del detalle. Redes / servicios se separa en red
 * aérea y red subterránea (mismas claves de DICCIONARIO_CAMPOS).
 */
function displayBlocks(v: InfraVariables) {
  return INFRA_COMPONENTS.flatMap((c) => {
    const gate = v[c.gate.key];
    const describe = (keys?: string[]) =>
      c.fields
        .filter((f) => (!keys || keys.includes(f.key)) && v[f.key] != null && !(f.kind === "check" && v[f.key] === "No"))
        .map((f) => (f.kind === "check" ? f.label : `${f.label}: ${v[f.key]}`));
    if (c.gate.key === "interferencia_redes_servicios") {
      const aerea = ["red_aerea_presente", "tipo_red_aerea"];
      const sub = ["red_subterranea_presente", "tipo_red_subterranea", "afectacion_fisica_red_subterranea", "compromete_funcionalidad_red_subterranea"];
      return [
        { title: "Red aérea", gateLabel: c.gate.label, gate, detalles: describe(aerea) },
        { title: "Red subterránea", gateLabel: c.gate.label, gate, detalles: describe(sub) },
      ];
    }
    return [{ title: c.title, gateLabel: c.gate.label, gate, detalles: describe() }];
  });
}

/** Cantidad de componentes con presencia/interferencia registrada ("Sí" en su compuerta). */
export function componentesRegistrados(v: InfraVariables): number {
  return INFRA_COMPONENTS.filter((c) => v[c.gate.key] === "Sí").length;
}

/** Resumen de una evaluación de infraestructura: solo lo efectivamente registrado. */
export function InfrastructureAssessmentSummary({ dto }: { dto: InfrastructureAssessmentDTO }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {displayBlocks(dto.variables).map((b) => (
        <div key={b.title} style={{ fontSize: 12, borderBottom: "1px solid var(--border-soft)", paddingBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ color: "var(--text-primary)" }}>{b.title}</strong>
            <span className="status-pill" style={{ fontSize: 10.5 }} title={b.gateLabel}>
              {b.gate === "Sí" ? (b.detalles.length > 0 ? "Registrado" : "Sí") : b.gate == null ? "No determinado" : "No aplica"}
            </span>
          </div>
          {b.gate === "Sí" && b.detalles.length > 0 && (
            <div style={{ color: "var(--text-secondary)", marginTop: 2, fontSize: 11.5 }}>{b.detalles.join(" · ")}</div>
          )}
        </div>
      ))}
      {dto.observaciones && <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>Obs.: {dto.observaciones}</div>}
      <div style={{ fontSize: 11.5 }}>
        <span className="sivu-tech-cell__label">Clasificación global</span>{" "}
        <span className="status-pill" style={{ fontSize: 10.5 }}>Clasificación global pendiente</span>
      </div>
    </div>
  );
}

/** Detalle completo de una evaluación de infraestructura (solo lectura). */
export function InfrastructureAssessmentDetailModal({
  dto,
  treeLabel,
  onClose,
  onNew,
}: {
  dto: InfrastructureAssessmentDTO;
  treeLabel: string;
  onClose: () => void;
  onNew?: () => void;
}) {
  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content">
        <header className="sivu-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2>Evaluación de infraestructura</h2>
            <span className="status-pill">{treeLabel}</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: "4px 8px", border: "none" }} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="sivu-modal-body">
          <div className="sivu-tech-grid" style={{ marginBottom: 14 }}>
            <div className="sivu-tech-cell">
              <span className="sivu-tech-cell__label">Fecha</span>
              <span className="sivu-tech-cell__value">{dto.fecha_evaluacion}</span>
            </div>
            <div className="sivu-tech-cell">
              <span className="sivu-tech-cell__label">Inspector</span>
              <span className="sivu-tech-cell__value">{dto.inspector_nombre || "—"}</span>
            </div>
          </div>
          <InfrastructureAssessmentSummary dto={dto} />
        </div>
        <footer className="sivu-modal-footer" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          {onNew && (
            <button className="btn btn-primary" onClick={onNew} style={{ gap: 6 }}>
              <Icon name="plus" size={13} /> Nueva evaluación
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
