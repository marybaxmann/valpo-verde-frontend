import { useState } from "react";
import { createTreeRiskAssessment } from "../api/treeRiskAssessments";
import {
  CONSECUENCIA_OPTIONS,
  TASA_OCUPACION_OPTIONS,
  ZONA_OBJETIVO_OPTIONS,
  type Consecuencia,
  type TasaOcupacion,
  type TreeRiskAssessmentDTO,
  type TreeRiskVariables,
  type ZonaObjetivo,
} from "../types/treeRisk";
import { Icon } from "./Icons";
import { ClassificationBadge } from "./ClassificationBadge";

const STEP_LABELS = [
  "Árbol y antecedentes",
  "Raíces y cuello",
  "Tronco",
  "Copa y ramas",
  "Objetivo / impacto / consecuencias",
  "Resultado",
];

function defaultVariables(): TreeRiskVariables {
  return {
    levantamiento_plato_radicular: false,
    angulo_inclinacion: 0,
    raices_expuestas: false,
    necrosis_radicular: null,
    raices_cortadas: null,
    cavidad_pudricion_basal: false,
    cavidad_basal_externa: null,
    sl_basal_pct: null,
    t_r_basal: null,

    presenta_cavidad_pudricion_tronco: false,
    cavidad_externa_tronco: null,
    sl_tronco_pct: null,
    t_r_tronco: null,
    presenta_heridas_tronco: false,
    condicion_heridas_tronco: null,
    corteza_muerta_ausente: false,
    presenta_exudaciones: false,
    presenta_fisura_grieta_tronco: false,
    afectacion_fisura_grieta: null,
    direccion_grieta: null,
    troncos_codominantes: false,
    grieta_union_codominante: null,
    corteza_incluida: null,

    ramas_secas: false,
    ramas_secas_pct_copa: null,
    ramas_quebradas: false,
    desequilibrio_copa: false,

    zona_objetivo: "Bajo la copa",
    tasa_ocupacion_objetivo: "Rara",

    consecuencia_raices_cuello: "Despreciable",
    consecuencia_tronco: "Despreciable",
    consecuencia_copa_ramas: "Despreciable",
  };
}

function YesNo({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <label>{label}</label>
      <div className="radio-row">
        <label className="radio-opt">
          <input type="radio" checked={value === true} onChange={() => onChange(true)} /> Sí
        </label>
        <label className="radio-opt">
          <input type="radio" checked={value === false} onChange={() => onChange(false)} /> No
        </label>
      </div>
    </div>
  );
}

/** Captura cavidad/pudrición (patrón compartido por raíces y tronco). */
function CavidadFields({
  presenta,
  externa,
  slPct,
  tR,
  onChange,
}: {
  presenta: boolean;
  externa: boolean | null;
  slPct: number | null;
  tR: number | null;
  onChange: (next: { presenta?: boolean; externa?: boolean | null; slPct?: number | null; tR?: number | null }) => void;
}) {
  return (
    <div className="card card--pad" style={{ marginBottom: 14, background: "var(--surface-background)" }}>
      <YesNo
        label="¿Presenta cavidad o pudrición?"
        value={presenta}
        onChange={(v) => onChange({ presenta: v, externa: null, slPct: null, tR: null })}
      />
      {presenta && (
        <>
          <YesNo
            label="¿La cavidad/pudrición es visible desde el exterior?"
            value={externa === true}
            onChange={(v) => onChange({ externa: v, slPct: null, tR: null })}
          />
          {externa === true && (
            <div className="field">
              <label>
                SL — pérdida estimada de resistencia (%) <span className="hint">si no se puede estimar, deja vacío</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={slPct ?? ""}
                onChange={(e) => onChange({ slPct: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
          )}
          {externa === false && (
            <div className="field">
              <label>
                t/R — espesor de pared residual / radio <span className="hint">si no se midió, deja vacío</span>
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={tR ?? ""}
                onChange={(e) => onChange({ tR: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RiskAssessmentModal({
  treeId,
  treeLabel,
  onClose,
  onSuccess,
}: {
  treeId: string;
  treeLabel: string;
  onClose: () => void;
  onSuccess: (dto: TreeRiskAssessmentDTO) => void;
}) {
  const [step, setStep] = useState(1);
  const [fechaEvaluacion, setFechaEvaluacion] = useState(new Date().toISOString().slice(0, 10));
  const [v, setV] = useState<TreeRiskVariables>(defaultVariables());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TreeRiskAssessmentDTO | null>(null);

  function update<K extends keyof TreeRiskVariables>(key: K, value: TreeRiskVariables[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await createTreeRiskAssessment(treeId, { fecha_evaluacion: fechaEvaluacion, variables: v });
      setResult(res.data);
      setStep(6);
      onSuccess(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo calcular y guardar la evaluación.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content sivu-modal-content--large">
        <header className="sivu-modal-header">
          <div>
            <h2>Nueva Evaluación Técnica</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              {treeLabel} — Paso {step} de 6: {STEP_LABELS[step - 1]}
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

        <div className="sivu-modal-body">
          {error && (
            <div className="card card--pad" style={{ marginBottom: 14, borderColor: "var(--classification-critical)" }}>
              <p style={{ color: "var(--classification-critical)", fontSize: 13 }}>
                <Icon name="alert" size={14} /> {error}
              </p>
            </div>
          )}

          {/* PASO 1 — Árbol y antecedentes */}
          {step === 1 && (
            <div className="sivu-form-section">
              <div className="sivu-form-section__header">
                <Icon name="leaf" size={15} /> 1. Árbol y antecedentes
              </div>
              <div className="field">
                <label>Árbol</label>
                <input type="text" value={treeLabel} disabled />
              </div>
              <div className="field">
                <label>Fecha de evaluación</label>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={fechaEvaluacion}
                  onChange={(e) => setFechaEvaluacion(e.target.value)}
                />
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                El inspector se registra automáticamente a partir de tu sesión.
              </p>
            </div>
          )}

          {/* PASO 2 — Raíces y cuello (R01) */}
          {step === 2 && (
            <div className="sivu-form-section">
              <div className="sivu-form-section__header">2. Raíces y cuello</div>

              <YesNo
                label="¿Levantamiento del plato radicular?"
                value={v.levantamiento_plato_radicular}
                onChange={(val) => update("levantamiento_plato_radicular", val)}
              />
              <div className="field">
                <label>Ángulo de inclinación (°)</label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  step="0.1"
                  value={v.angulo_inclinacion}
                  onChange={(e) => update("angulo_inclinacion", Number(e.target.value))}
                />
              </div>

              <YesNo
                label="¿Raíces expuestas?"
                value={v.raices_expuestas}
                onChange={(val) =>
                  setV((prev) => ({ ...prev, raices_expuestas: val, necrosis_radicular: null, raices_cortadas: null }))
                }
              />
              {v.raices_expuestas && (
                <>
                  <YesNo
                    label="¿Necrosis radicular?"
                    value={v.necrosis_radicular === true}
                    onChange={(val) => update("necrosis_radicular", val)}
                  />
                  <YesNo
                    label="¿Raíces cortadas?"
                    value={v.raices_cortadas === true}
                    onChange={(val) => update("raices_cortadas", val)}
                  />
                </>
              )}

              <CavidadFields
                presenta={v.cavidad_pudricion_basal}
                externa={v.cavidad_basal_externa}
                slPct={v.sl_basal_pct}
                tR={v.t_r_basal}
                onChange={(next) =>
                  setV((prev) => ({
                    ...prev,
                    cavidad_pudricion_basal: next.presenta ?? prev.cavidad_pudricion_basal,
                    cavidad_basal_externa: "externa" in next ? next.externa! : prev.cavidad_basal_externa,
                    sl_basal_pct: "slPct" in next ? next.slPct! : prev.sl_basal_pct,
                    t_r_basal: "tR" in next ? next.tR! : prev.t_r_basal,
                  }))
                }
              />
            </div>
          )}

          {/* PASO 3 — Tronco (R02) */}
          {step === 3 && (
            <div className="sivu-form-section">
              <div className="sivu-form-section__header">3. Tronco</div>

              <CavidadFields
                presenta={v.presenta_cavidad_pudricion_tronco}
                externa={v.cavidad_externa_tronco}
                slPct={v.sl_tronco_pct}
                tR={v.t_r_tronco}
                onChange={(next) =>
                  setV((prev) => ({
                    ...prev,
                    presenta_cavidad_pudricion_tronco: next.presenta ?? prev.presenta_cavidad_pudricion_tronco,
                    cavidad_externa_tronco: "externa" in next ? next.externa! : prev.cavidad_externa_tronco,
                    sl_tronco_pct: "slPct" in next ? next.slPct! : prev.sl_tronco_pct,
                    t_r_tronco: "tR" in next ? next.tR! : prev.t_r_tronco,
                  }))
                }
              />

              <YesNo
                label="¿Presenta heridas?"
                value={v.presenta_heridas_tronco}
                onChange={(val) =>
                  setV((prev) => ({ ...prev, presenta_heridas_tronco: val, condicion_heridas_tronco: null }))
                }
              />
              {v.presenta_heridas_tronco && (
                <div className="field">
                  <label>Condición de la herida</label>
                  <select
                    value={v.condicion_heridas_tronco ?? ""}
                    onChange={(e) => update("condicion_heridas_tronco", e.target.value as "Cerrada" | "En proceso de cierre" | "Abierta")}
                  >
                    <option value="" disabled>
                      — Selecciona —
                    </option>
                    <option value="Cerrada">Cerrada</option>
                    <option value="En proceso de cierre">En proceso de cierre</option>
                    <option value="Abierta">Abierta</option>
                  </select>
                </div>
              )}

              <YesNo
                label="¿Corteza muerta o ausente?"
                value={v.corteza_muerta_ausente}
                onChange={(val) => update("corteza_muerta_ausente", val)}
              />
              <YesNo
                label="¿Presenta exudaciones?"
                value={v.presenta_exudaciones}
                onChange={(val) => update("presenta_exudaciones", val)}
              />

              <YesNo
                label="¿Presenta fisura o grieta?"
                value={v.presenta_fisura_grieta_tronco}
                onChange={(val) =>
                  setV((prev) => ({
                    ...prev,
                    presenta_fisura_grieta_tronco: val,
                    afectacion_fisura_grieta: null,
                    direccion_grieta: null,
                  }))
                }
              />
              {v.presenta_fisura_grieta_tronco && (
                <>
                  <div className="field">
                    <label>Afectación</label>
                    <select
                      value={v.afectacion_fisura_grieta ?? ""}
                      onChange={(e) =>
                        setV((prev) => ({
                          ...prev,
                          afectacion_fisura_grieta: e.target.value as "Solo corteza" | "Penetra en madera",
                          direccion_grieta: e.target.value === "Solo corteza" ? null : prev.direccion_grieta,
                        }))
                      }
                    >
                      <option value="" disabled>
                        — Selecciona —
                      </option>
                      <option value="Solo corteza">Solo corteza</option>
                      <option value="Penetra en madera">Penetra en madera</option>
                    </select>
                  </div>
                  {v.afectacion_fisura_grieta === "Penetra en madera" && (
                    <div className="field">
                      <label>Dirección</label>
                      <select
                        value={v.direccion_grieta ?? ""}
                        onChange={(e) => update("direccion_grieta", e.target.value as "Longitudinal" | "Transversal")}
                      >
                        <option value="" disabled>
                          — Selecciona —
                        </option>
                        <option value="Longitudinal">Longitudinal</option>
                        <option value="Transversal">Transversal</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <YesNo
                label="¿Troncos codominantes / bifurcación?"
                value={v.troncos_codominantes}
                onChange={(val) =>
                  setV((prev) => ({
                    ...prev,
                    troncos_codominantes: val,
                    grieta_union_codominante: null,
                    corteza_incluida: null,
                  }))
                }
              />
              {v.troncos_codominantes && (
                <>
                  <YesNo
                    label="¿Grieta en la unión codominante?"
                    value={v.grieta_union_codominante === true}
                    onChange={(val) => update("grieta_union_codominante", val)}
                  />
                  {v.grieta_union_codominante !== true && (
                    <YesNo
                      label="¿La unión presenta corteza incluida?"
                      value={v.corteza_incluida === true}
                      onChange={(val) => update("corteza_incluida", val)}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* PASO 4 — Copa y ramas (R03) */}
          {step === 4 && (
            <div className="sivu-form-section">
              <div className="sivu-form-section__header">4. Copa y ramas</div>

              <YesNo
                label="¿Ramas secas?"
                value={v.ramas_secas}
                onChange={(val) =>
                  setV((prev) => ({ ...prev, ramas_secas: val, ramas_secas_pct_copa: null }))
                }
              />
              {v.ramas_secas && (
                <div className="field">
                  <label>Porcentaje de copa con ramas secas (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={v.ramas_secas_pct_copa ?? ""}
                    onChange={(e) =>
                      update("ramas_secas_pct_copa", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </div>
              )}

              <YesNo
                label="¿Ramas quebradas?"
                value={v.ramas_quebradas}
                onChange={(val) => update("ramas_quebradas", val)}
              />
              <YesNo
                label="¿Desequilibrio de copa?"
                value={v.desequilibrio_copa}
                onChange={(val) => update("desequilibrio_copa", val)}
              />
            </div>
          )}

          {/* PASO 5 — Objetivo / impacto / consecuencias (M01 + consecuencias) */}
          {step === 5 && (
            <div className="sivu-form-section">
              <div className="sivu-form-section__header">5. Objetivo, impacto y consecuencias</div>

              <div className="field">
                <label>Zona del objetivo</label>
                <select
                  value={v.zona_objetivo}
                  onChange={(e) => update("zona_objetivo", e.target.value as ZonaObjetivo)}
                >
                  {ZONA_OBJETIVO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Tasa de ocupación del objetivo</label>
                <select
                  value={v.tasa_ocupacion_objetivo}
                  onChange={(e) => update("tasa_ocupacion_objetivo", e.target.value as TasaOcupacion)}
                >
                  {TASA_OCUPACION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: "14px 0 6px" }}>
                Consecuencia esperada si el objetivo es impactado, por componente:
              </p>
              {(
                [
                  ["consecuencia_raices_cuello", "Raíces y cuello"],
                  ["consecuencia_tronco", "Tronco"],
                  ["consecuencia_copa_ramas", "Copa y ramas"],
                ] as const
              ).map(([key, label]) => (
                <div className="field" key={key}>
                  <label>{label}</label>
                  <select value={v[key]} onChange={(e) => update(key, e.target.value as Consecuencia)}>
                    {CONSECUENCIA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* PASO 6 — Resultado */}
          {step === 6 && result && (
            <div className="sivu-form-section">
              <div className="sivu-form-section__header">6. Resultado</div>
              <p style={{ fontSize: 13, color: "var(--sivu-primary)", fontWeight: 600, marginBottom: 14 }}>
                ✓ Evaluación registrada correctamente
              </p>

              <div className="sivu-tech-grid" style={{ marginBottom: 14 }}>
                <div className="sivu-tech-cell">
                  <span className="sivu-tech-cell__label">Probabilidad de falla — raíces/cuello</span>
                  <span className="sivu-tech-cell__value">{result.resultado.probabilidad_falla_raices_cuello ?? "No determinado"}</span>
                </div>
                <div className="sivu-tech-cell">
                  <span className="sivu-tech-cell__label">Probabilidad de falla — tronco</span>
                  <span className="sivu-tech-cell__value">{result.resultado.probabilidad_falla_tronco ?? "No determinado"}</span>
                </div>
                <div className="sivu-tech-cell">
                  <span className="sivu-tech-cell__label">Probabilidad de falla — copa/ramas</span>
                  <span className="sivu-tech-cell__value">{result.resultado.probabilidad_falla_copa_ramas ?? "No determinado"}</span>
                </div>
                <div className="sivu-tech-cell">
                  <span className="sivu-tech-cell__label">Probabilidad de impacto</span>
                  <span className="sivu-tech-cell__value">{result.resultado.probabilidad_impacto}</span>
                </div>
              </div>

              <div style={{ textAlign: "center", padding: "18px 0" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: 8 }}>
                  Nivel de riesgo
                </div>
                {result.resultado.clasificacion_riesgo ? (
                  <ClassificationBadge level={result.resultado.clasificacion_riesgo} className="risk-result-badge" />
                ) : (
                  <span className="status-pill">No determinado — ver nota abajo</span>
                )}
              </div>

              {!result.resultado.clasificacion_riesgo && (
                <p style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                  Al menos un componente quedó "No determinado" (faltó una medición requerida, p. ej. SL% o t/R
                  en una cavidad). El riesgo global no se calcula con un valor inventado en su lugar.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="sivu-modal-footer">
          {step < 6 && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
                disabled={submitting}
              >
                {step === 1 ? "Cancelar" : "Atrás"}
              </button>
              {step < 5 ? (
                <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
                  Siguiente
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Calculando..." : "Calcular y guardar evaluación"}
                </button>
              )}
            </>
          )}
          {step === 6 && (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Cerrar
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
