import { useEffect, useState } from "react";
import { getTreeDetail, getTreeMeasurements } from "../api/trees";
import { listTreeRiskAssessments } from "../api/treeRiskAssessments";
import type { TreeDetailDTO, TreeMeasurementRow } from "../types/tree";
import type { TreeRiskAssessmentDTO } from "../types/treeRisk";
import { Icon } from "./Icons";
import { AgeClassBadge, ClassificationBadge } from "./ClassificationBadge";
import { EditTreeModal } from "./EditTreeModal";
import { RiskAssessmentModal } from "./RiskAssessmentModal";
import { SivuTable } from "./SivuTable";
import { useCanWrite } from "../hooks/useCanWrite";
import { TreeModulesSummary } from "./TreeModulesSummary";

function fallaCompacta(r: TreeRiskAssessmentDTO["resultado"]): string {
  return `RC: ${r.probabilidad_falla_raices_cuello ?? "—"} · TR: ${r.probabilidad_falla_tronco ?? "—"} · CR: ${r.probabilidad_falla_copa_ramas ?? "—"}`;
}

function consecuenciaCompacta(r: TreeRiskAssessmentDTO["resultado"]): string {
  return `RC: ${r.consecuencia_raices_cuello} · TR: ${r.consecuencia_tronco} · CR: ${r.consecuencia_copa_ramas}`;
}

/** Clasificación (M02+M03) de un componente, tal como la devolvió el backend. */
function ComponenteRiesgo({ label, level }: { label: string; level: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10.5, color: "var(--text-secondary)" }}>{label}</span>
      {level ? <ClassificationBadge level={level} /> : <span className="status-pill">No determinado</span>}
    </div>
  );
}

export function TreeDetailModal({
  treeId,
  onClose,
  onTreeUpdated,
  onRiskAssessmentCreated,
}: {
  treeId: string;
  onClose: () => void;
  /** Se notifica tras guardar una edición, para refrescar listado/mapa. */
  onTreeUpdated?: (updated: TreeDetailDTO) => void;
  /** Se notifica tras guardar una evaluación, para recolorear el mapa. */
  onRiskAssessmentCreated?: (treeId: string, dto: TreeRiskAssessmentDTO) => void;
}) {
  const [detail, setDetail] = useState<TreeDetailDTO | null>(null);
  const [measurements, setMeasurements] = useState<TreeMeasurementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const [assessments, setAssessments] = useState<TreeRiskAssessmentDTO[]>([]);
  const [assessmentsError, setAssessmentsError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const canWrite = useCanWrite();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getTreeDetail(treeId), getTreeMeasurements(treeId)])
      .then(([detailRes, measRes]) => {
        if (cancelled) return;
        setDetail(detailRes.data);
        setMeasurements(measRes.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar ficha técnica");
        setLoading(false);
      });

    listTreeRiskAssessments(treeId)
      .then((res) => {
        if (cancelled) return;
        setAssessments(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAssessmentsError(
          err instanceof Error ? err.message : "No se pudo cargar el historial de evaluaciones."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [treeId]);

  const ultimaEvaluacion = assessments[0] ?? null;
  // Medición vigente según el backend (no se elige en el cliente).
  const medicionActual = detail?.medicion_actual ?? null;
  const especie =
    detail?.species?.nombre_comun || detail?.species?.nombre_cientifico || "Especie no identificada";

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content sivu-modal-content--large">
        <header className="sivu-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2>Ficha Técnica de Árbol Urbano</h2>
            {detail && <span className="status-pill">{detail.tree_code}</span>}
            {savedFeedback && (
              <span style={{ fontSize: 12, color: "var(--sivu-primary)", fontWeight: 600 }}>
                ✓ Cambios guardados
              </span>
            )}
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px", minHeight: "auto", border: "none" }}
            onClick={onClose}
            aria-label="Cerrar ficha"
          >
            ✕
          </button>
        </header>

        <div className="sivu-modal-body">
          {loading && <p style={{ color: "var(--text-secondary)" }}>Cargando datos técnicos…</p>}

          {!loading && error && (
            <div className="card card--pad">
              <p style={{ color: "var(--red-500)" }}>
                <Icon name="alert" size={14} /> {error}
              </p>
            </div>
          )}

          {!loading && detail && (
            <div>
              {/* Resumen del ejemplar: qué árbol → dónde → cuánto mide →
                  cuándo fue evaluado → qué riesgo tiene. Solo datos ya
                  persistidos; el riesgo es el último calculado por el backend. */}
              <div className="sivu-ficha-summary">
                <div className="sivu-ficha-summary__item">
                  <span className="sivu-ficha-summary__label">Árbol</span>
                  <span className="sivu-ficha-summary__value">{detail.tree_code}</span>
                  <span className="sivu-ficha-summary__sub">{especie}</span>
                </div>
                <div className="sivu-ficha-summary__item">
                  <span className="sivu-ficha-summary__label">Ubicación</span>
                  <span className="sivu-ficha-summary__value">
                    {detail.lugar_referencia || detail.direccion || "Sin referencia"}
                  </span>
                  <span className="sivu-ficha-summary__sub">{detail.comuna || "—"}</span>
                </div>
                <div className="sivu-ficha-summary__item">
                  <span className="sivu-ficha-summary__label">Dimensiones</span>
                  <span className="sivu-ficha-summary__value">
                    {medicionActual ? `${medicionActual.altura_total_m} m de altura` : "Sin medición"}
                  </span>
                  <span className="sivu-ficha-summary__sub">
                    {medicionActual
                      ? medicionActual.dap_cm !== null
                        ? `DAP ${medicionActual.dap_cm} cm`
                        : medicionActual.dap_fustes_cm
                        ? `${medicionActual.dap_fustes_cm.length} fustes`
                        : "—"
                      : "—"}
                  </span>
                </div>
                <div className="sivu-ficha-summary__item">
                  <span className="sivu-ficha-summary__label">Última evaluación</span>
                  <span className="sivu-ficha-summary__value">
                    {ultimaEvaluacion ? ultimaEvaluacion.fecha_evaluacion : "Sin evaluar"}
                  </span>
                  <span className="sivu-ficha-summary__sub">
                    {assessments.length > 0 ? `${assessments.length} evaluación(es)` : "—"}
                  </span>
                </div>
                <div className="sivu-ficha-summary__item sivu-ficha-summary__item--risk">
                  <span className="sivu-ficha-summary__label">Nivel de riesgo</span>
                  {ultimaEvaluacion?.resultado.clasificacion_riesgo ? (
                    <ClassificationBadge level={ultimaEvaluacion.resultado.clasificacion_riesgo} />
                  ) : ultimaEvaluacion ? (
                    <span className="status-pill">No determinado</span>
                  ) : (
                    <span className="status-pill">Sin evaluación</span>
                  )}
                </div>
              </div>

              {/* Sección 1: Identificación y Registro */}
              <div className="sivu-form-section">
                <div className="sivu-form-section__header">
                  <Icon name="leaf" size={15} /> 1. Identificación y Especie
                </div>
                <div className="sivu-tech-grid">
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Código Canónico</span>
                    <span className="sivu-tech-cell__value">{detail.tree_code}</span>
                  </div>
                  {detail.legacy_id && (
                    <div className="sivu-tech-cell">
                      <span className="sivu-tech-cell__label">Referencia histórica</span>
                      <span className="sivu-tech-cell__value">{detail.legacy_id}</span>
                    </div>
                  )}
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Estado Ciclo de Vida</span>
                    <span className="sivu-tech-cell__value">{detail.estado_ciclo_vida}</span>
                  </div>
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Nombre Científico</span>
                    <span className="sivu-tech-cell__value" style={{ fontStyle: "italic" }}>
                      {detail.species?.nombre_cientifico || "—"}
                    </span>
                  </div>
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Nombre Común</span>
                    <span className="sivu-tech-cell__value">
                      {detail.species?.nombre_comun || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 2: Espacio y Territorio */}
              <div className="sivu-form-section">
                <div className="sivu-form-section__header">
                  <Icon name="building" size={15} /> 2. Ubicación Territorial
                </div>
                <div className="sivu-tech-grid">
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Coordenadas WGS84</span>
                    <span className="sivu-tech-cell__value">
                      {detail.ubicacion
                        ? `${detail.ubicacion.lat.toFixed(6)}, ${detail.ubicacion.lon.toFixed(6)}`
                        : "Sin ubicación"}
                    </span>
                  </div>
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Comuna</span>
                    <span className="sivu-tech-cell__value">{detail.comuna || "Valparaíso"}</span>
                  </div>
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Dirección</span>
                    <span className="sivu-tech-cell__value">{detail.direccion || "—"}</span>
                  </div>
                  <div className="sivu-tech-cell">
                    <span className="sivu-tech-cell__label">Lugar de Referencia</span>
                    <span className="sivu-tech-cell__value">
                      {detail.lugar_referencia || "—"}
                    </span>
                  </div>
                  {detail.public_spaces && (
                    <div className="sivu-tech-cell sivu-tech-cell--full">
                      <span className="sivu-tech-cell__label">Espacio Público</span>
                      <span className="sivu-tech-cell__value">
                        {detail.public_spaces.nombre} ({detail.public_spaces.tipo || "espacio"})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 3: Historial Cronológico de Mediciones */}
              <div className="sivu-form-section">
                <div className="sivu-form-section__header">
                  <Icon name="list" size={15} /> 3. Mediciones Dendrométricas
                </div>

                <SivuTable
                  columns={[
                    { label: "Fecha" },
                    { label: "DAP (cm)" },
                    { label: "Altura total" },
                    { label: "Copa" },
                    { label: "1ª rama" },
                    { label: "Clase de edad" },
                    { label: "Fustes" },
                    { label: "Estado" },
                  ]}
                  empty={
                    measurements.length === 0
                      ? { icon: "list", title: "No hay mediciones registradas para este árbol." }
                      : null
                  }
                >
                  {measurements.map((m) => (
                    <tr key={m.id}>
                      <td className="sivu-table__strong">{m.fecha_medicion}</td>
                      <td className="sivu-table__num">
                        {m.dap_cm !== null
                          ? `${m.dap_cm} cm`
                          : m.dap_fustes_cm
                          ? `[${m.dap_fustes_cm.join(", ")}]`
                          : "—"}
                      </td>
                      <td className="sivu-table__num">{m.altura_total_m} m</td>
                      <td className="sivu-table__num">{m.diametro_copa_m} m</td>
                      <td className="sivu-table__num">{m.altura_primera_rama_m} m</td>
                      <td>
                        <AgeClassBadge claseEdad={m.clase_edad} />
                      </td>
                      <td>{m.configuracion_fustes}</td>
                      <td>
                        <span className={`badge badge--${m.estado_medicion === "valida" ? "green" : "slate"}`}>
                          {m.estado_medicion === "valida" ? "Válida" : m.estado_medicion}
                        </span>
                      </td>
                    </tr>
                  ))}
                </SivuTable>
              </div>

              {/* Sección 4: Evaluación de Riesgo */}
              <div className="sivu-form-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div className="sivu-form-section__header" style={{ marginBottom: 0, border: "none", padding: 0 }}>
                    <Icon name="check-square" size={15} /> 4. Evaluación de Riesgo
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: "5px 10px", gap: 6 }}
                      onClick={() => setIsEvaluating(true)}
                    >
                      <Icon name="plus" size={13} />
                      Nueva evaluación
                    </button>
                  )}
                </div>

                {assessmentsError && (
                  <p style={{ fontSize: 12, color: "var(--classification-critical)" }}>{assessmentsError}</p>
                )}

                {!assessmentsError && !ultimaEvaluacion && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Este árbol aún no posee una evaluación de riesgo.
                  </p>
                )}

                {ultimaEvaluacion && (
                  <>
                    <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                      <div
                        style={{
                          fontSize: 10.5,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--text-secondary)",
                          marginBottom: 6,
                        }}
                      >
                        Nivel de riesgo
                      </div>
                      {ultimaEvaluacion.resultado.clasificacion_riesgo ? (
                        <ClassificationBadge
                          level={ultimaEvaluacion.resultado.clasificacion_riesgo}
                          className="risk-result-badge"
                        />
                      ) : (
                        <span className="status-pill">No determinado</span>
                      )}
                    </div>

                    <div className="sivu-tech-grid" style={{ marginBottom: 10 }}>
                      <div className="sivu-tech-cell">
                        <span className="sivu-tech-cell__label">Fecha</span>
                        <span className="sivu-tech-cell__value">{ultimaEvaluacion.fecha_evaluacion}</span>
                      </div>
                      <div className="sivu-tech-cell">
                        <span className="sivu-tech-cell__label">Inspector</span>
                        <span className="sivu-tech-cell__value">
                          {ultimaEvaluacion.inspector_nombre || "—"}
                        </span>
                      </div>
                      <div className="sivu-tech-cell sivu-tech-cell--full">
                        <span className="sivu-tech-cell__label">Probabilidad de falla</span>
                        <span className="sivu-tech-cell__value" style={{ fontSize: 11.5 }}>
                          {fallaCompacta(ultimaEvaluacion.resultado)}
                        </span>
                      </div>
                      <div className="sivu-tech-cell">
                        <span className="sivu-tech-cell__label">Probabilidad de impacto</span>
                        <span className="sivu-tech-cell__value">{ultimaEvaluacion.resultado.probabilidad_impacto}</span>
                      </div>
                      <div className="sivu-tech-cell sivu-tech-cell--full">
                        <span className="sivu-tech-cell__label">Consecuencias</span>
                        <span className="sivu-tech-cell__value" style={{ fontSize: 11.5 }}>
                          {consecuenciaCompacta(ultimaEvaluacion.resultado)}
                        </span>
                      </div>
                      <div className="sivu-tech-cell sivu-tech-cell--full">
                        <span className="sivu-tech-cell__label">Clasificación por componente</span>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                          <ComponenteRiesgo label="Raíces y cuello" level={ultimaEvaluacion.resultado.clasificacion_raices_cuello} />
                          <ComponenteRiesgo label="Tronco" level={ultimaEvaluacion.resultado.clasificacion_tronco} />
                          <ComponenteRiesgo label="Copa y ramas" level={ultimaEvaluacion.resultado.clasificacion_copa_ramas} />
                        </div>
                      </div>
                    </div>

                    {assessments.length > 1 && (
                      <div style={{ marginTop: 14 }}>
                        <div className="sivu-tech-cell__label" style={{ marginBottom: 6 }}>
                          Historial de evaluaciones ({assessments.length})
                        </div>
                        <SivuTable
                          columns={[
                            { label: "Fecha", width: "14%" },
                            { label: "Prob. de falla", width: "32%" },
                            { label: "Impacto", width: "12%" },
                            { label: "Consecuencias", width: "28%" },
                            { label: "Riesgo", width: "14%" },
                          ]}
                        >
                          {assessments.map((a) => (
                            <tr key={a.id}>
                              <td className="sivu-table__strong">{a.fecha_evaluacion}</td>
                              <td style={{ fontSize: 11.5 }}>{fallaCompacta(a.resultado)}</td>
                              <td>{a.resultado.probabilidad_impacto}</td>
                              <td style={{ fontSize: 11.5 }}>{consecuenciaCompacta(a.resultado)}</td>
                              <td>
                                {a.resultado.clasificacion_riesgo ? (
                                  <ClassificationBadge level={a.resultado.clasificacion_riesgo} />
                                ) : (
                                  <span className="status-pill">No determinado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </SivuTable>
                      </div>
                    )}
                  </>
                )}
              </div>

              <TreeModulesSummary treeId={treeId} projectId={detail.project_id} />
            </div>
          )}
        </div>

        <footer className="sivu-modal-footer" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ gap: 6 }}>
            ← Volver al mapa
          </button>
          {detail && canWrite && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-secondary" style={{ gap: 6 }} onClick={() => setIsEditing(true)}>
                <Icon name="edit" size={13} />
                Editar árbol
              </button>
              <button className="btn btn-primary" style={{ gap: 6 }} onClick={() => setIsEvaluating(true)}>
                <Icon name="plus" size={13} />
                Nueva evaluación
              </button>
            </div>
          )}
        </footer>
      </div>

      {isEditing && detail && (
        <EditTreeModal
          tree={detail}
          onClose={() => setIsEditing(false)}
          onSuccess={(updated) => {
            setDetail(updated);
            setIsEditing(false);
            setSavedFeedback(true);
            setTimeout(() => setSavedFeedback(false), 4000);
            onTreeUpdated?.(updated);
          }}
        />
      )}

      {isEvaluating && detail && (
        <RiskAssessmentModal
          treeId={treeId}
          treeLabel={`${detail.tree_code} — ${detail.species?.nombre_comun || detail.species?.nombre_cientifico || "Especie no identificada"}`}
          onClose={() => setIsEvaluating(false)}
          onSuccess={(dto) => {
            setAssessments((prev) => [dto, ...prev]);
            onRiskAssessmentCreated?.(treeId, dto);
          }}
        />
      )}
    </div>
  );
}
