import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectBase } from "../hooks/useProjectBase";
import { useCanWrite } from "../hooks/useCanWrite";
import { getTreeDetail } from "../api/trees";
import { getLatestTreeRiskAssessment } from "../api/treeRiskAssessments";
import type { TreeDetailDTO, TreeFeature } from "../types/tree";
import type { TreeRiskAssessmentDTO } from "../types/treeRisk";
import { Icon } from "./Icons";
import { AgeClassBadge, ClassificationBadge } from "./ClassificationBadge";
import { EditTreeModal } from "./EditTreeModal";
import { RiskAssessmentModal } from "./RiskAssessmentModal";

export function TreeContextualPanel({
  treeFeature,
  onClose,
  onViewFullDetail,
  onTreeUpdated,
  onRiskAssessmentCreated,
  docked = true,
  summaryAssessment,
}: {
  /** Última evaluación según el resumen del proyecto (se actualiza cuando se evalúa desde la ficha). */
  summaryAssessment?: TreeRiskAssessmentDTO;
  treeFeature: TreeFeature;
  onClose: () => void;
  onViewFullDetail: (treeId: string) => void;
  /** Se notifica tras guardar una edición, para refrescar listado/mapa. */
  onTreeUpdated?: (updated: TreeDetailDTO) => void;
  /** Se notifica tras guardar una evaluación, para recolorear el mapa. */
  onRiskAssessmentCreated?: (treeId: string, dto: TreeRiskAssessmentDTO) => void;
  docked?: boolean;
}) {
  const treeId = treeFeature.properties.id;
  const navigate = useNavigate();
  const base = useProjectBase();
  const canWrite = useCanWrite();
  const [detail, setDetail] = useState<TreeDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [latestAssessment, setLatestAssessment] = useState<TreeRiskAssessmentDTO | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTreeDetail(treeId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error al cargar ficha de árbol");
        setLoading(false);
      });

    setLoadingRisk(true);
    getLatestTreeRiskAssessment(treeId)
      .then((res) => {
        if (cancelled) return;
        setLatestAssessment(res.data);
        setLoadingRisk(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLatestAssessment(null);
        setLoadingRisk(false);
      });

    return () => {
      cancelled = true;
    };
  }, [treeId]);

  // Si se registró una evaluación desde otra vista (p. ej. la ficha), el
  // resumen del proyecto trae la nueva; se refleja sin recargar el panel.
  useEffect(() => {
    if (summaryAssessment && summaryAssessment.tree_id === treeId) {
      setLatestAssessment(summaryAssessment);
      setLoadingRisk(false);
    }
  }, [summaryAssessment?.id, treeId]);

  const props = treeFeature.properties;
  const coords = treeFeature.geometry.coordinates;
  const prefix = docked ? "sivu-detail-dock" : "sivu-contextual-panel";

  return (
    <aside className={prefix} aria-label="Resumen contextual de árbol">
      <header className={`${prefix}__header`}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--sivu-primary-dark)" }}>
              {props.tree_code}
            </span>
            <span className="status-pill">{props.estado_ciclo_vida}</span>
            {!loadingRisk && latestAssessment?.resultado.clasificacion_riesgo && (
              <ClassificationBadge level={latestAssessment.resultado.clasificacion_riesgo} />
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            {props.nombre_comun || props.nombre_cientifico || "Especie no identificada"}
          </div>
          {props.nombre_cientifico && (
            <div style={{ fontSize: 11.5, fontStyle: "italic", color: "var(--text-secondary)" }}>
              {props.nombre_cientifico}
            </div>
          )}
        </div>
        <button
          className="btn btn-secondary"
          style={{ padding: "4px 8px", minHeight: "auto", border: "none" }}
          onClick={onClose}
          aria-label="Cerrar panel contextual"
        >
          ✕
        </button>
      </header>

      <div className={`${prefix}__body`}>
        {/* Ubicación territorial */}
        <div>
          <span className="sivu-tech-cell__label" style={{ display: "block", marginBottom: 6 }}>
            Territorio y Referencia
          </span>
          <div className="sivu-tech-grid">
            <div className="sivu-tech-cell">
              <span className="sivu-tech-cell__label">Coordenadas</span>
              <span className="sivu-tech-cell__value" style={{ fontSize: 11.5 }}>
                {coords[1].toFixed(5)}, {coords[0].toFixed(5)}
              </span>
            </div>
            <div className="sivu-tech-cell">
              <span className="sivu-tech-cell__label">Comuna</span>
              <span className="sivu-tech-cell__value">{props.comuna || "Valparaíso"}</span>
            </div>
            {(props.direccion || props.lugar_referencia) && (
              <div className="sivu-tech-cell sivu-tech-cell--full">
                <span className="sivu-tech-cell__label">Dirección / Referencia</span>
                <span className="sivu-tech-cell__value">
                  {props.direccion ? props.direccion : ""}
                  {props.direccion && props.lugar_referencia ? " — " : ""}
                  {props.lugar_referencia ? props.lugar_referencia : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Medición Dendrométrica Actual */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span className="sivu-tech-cell__label">Medición Dendrométrica Actual</span>
            {detail?.medicion_actual && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {detail.medicion_actual.fecha_medicion}
              </span>
            )}
          </div>

          {loading && <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cargando datos dendrométricos…</p>}

          {!loading && error && (
            <p style={{ fontSize: 12, color: "var(--red-500)" }}>{error}</p>
          )}

          {!loading && detail && !detail.medicion_actual && (
            <div className="card card--pad" style={{ padding: 10, background: "var(--surface-background)" }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Sin mediciones dendrométricas registradas.
              </p>
            </div>
          )}

          {!loading && detail?.medicion_actual && (
            <div className="sivu-tech-grid">
              <div className="sivu-tech-cell">
                <span className="sivu-tech-cell__label">Diámetro DAP</span>
                <span className="sivu-tech-cell__value">
                  {detail.medicion_actual.dap_cm !== null
                    ? `${detail.medicion_actual.dap_cm} cm`
                    : detail.medicion_actual.dap_fustes_cm
                    ? `Fustes: [${detail.medicion_actual.dap_fustes_cm.join(", ")}] cm`
                    : "—"}
                </span>
              </div>

              <div className="sivu-tech-cell">
                <span className="sivu-tech-cell__label">Altura Total</span>
                <span className="sivu-tech-cell__value">
                  {detail.medicion_actual.altura_total_m} m
                </span>
              </div>

              <div className="sivu-tech-cell">
                <span className="sivu-tech-cell__label">Diámetro Copa</span>
                <span className="sivu-tech-cell__value">
                  {detail.medicion_actual.diametro_copa_m} m
                </span>
              </div>

              <div className="sivu-tech-cell">
                <span className="sivu-tech-cell__label">Alt. 1ª Rama</span>
                <span className="sivu-tech-cell__value">
                  {detail.medicion_actual.altura_primera_rama_m} m
                </span>
              </div>

              <div className="sivu-tech-cell sivu-tech-cell--full">
                <span className="sivu-tech-cell__label">Clase de Edad</span>
                <div style={{ marginTop: 2 }}>
                  <AgeClassBadge claseEdad={detail.medicion_actual.clase_edad} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Última Evaluación de Riesgo */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span className="sivu-tech-cell__label">Última Evaluación</span>
            {latestAssessment && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {latestAssessment.fecha_evaluacion}
              </span>
            )}
          </div>

          {loadingRisk && <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cargando evaluación…</p>}

          {!loadingRisk && !latestAssessment && (
            <div className="card card--pad" style={{ padding: 10, background: "var(--surface-background)" }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                Sin evaluación de riesgo.
              </p>
            </div>
          )}

          {!loadingRisk && latestAssessment && (
            <div className="sivu-tech-grid">
              <div className="sivu-tech-cell sivu-tech-cell--full">
                <span className="sivu-tech-cell__label">Prob. de falla</span>
                <span className="sivu-tech-cell__value" style={{ fontSize: 11 }}>
                  RC: {latestAssessment.resultado.probabilidad_falla_raices_cuello ?? "—"} · TR:{" "}
                  {latestAssessment.resultado.probabilidad_falla_tronco ?? "—"} · CR:{" "}
                  {latestAssessment.resultado.probabilidad_falla_copa_ramas ?? "—"}
                </span>
              </div>
              <div className="sivu-tech-cell">
                <span className="sivu-tech-cell__label">Prob. de impacto</span>
                <span className="sivu-tech-cell__value">{latestAssessment.resultado.probabilidad_impacto}</span>
              </div>
              <div className="sivu-tech-cell">
                <span className="sivu-tech-cell__label">Consecuencias</span>
                <span className="sivu-tech-cell__value" style={{ fontSize: 11 }}>
                  RC: {latestAssessment.resultado.consecuencia_raices_cuello} · TR:{" "}
                  {latestAssessment.resultado.consecuencia_tronco} · CR:{" "}
                  {latestAssessment.resultado.consecuencia_copa_ramas}
                </span>
              </div>
              <div className="sivu-tech-cell sivu-tech-cell--full">
                <span className="sivu-tech-cell__label">Nivel de riesgo</span>
                <div style={{ marginTop: 2 }}>
                  {latestAssessment.resultado.clasificacion_riesgo ? (
                    <ClassificationBadge level={latestAssessment.resultado.clasificacion_riesgo} />
                  ) : (
                    <span className="status-pill">No determinado</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {canWrite && !loadingRisk && !latestAssessment && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", gap: 6, marginTop: 8, fontSize: 12 }}
              onClick={() => setIsEvaluating(true)}
            >
              <Icon name="plus" size={13} />
              Nueva evaluación
            </button>
          )}
        </div>
      </div>

      <footer className={`${prefix}__footer`} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          style={{ flex: "1 1 100%", justifyContent: "center", gap: 6 }}
          onClick={() => onViewFullDetail(treeId)}
        >
          <Icon name="eye" size={14} />
          Ver ficha completa
        </button>
        {canWrite && (
        <>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, justifyContent: "center", gap: 6, fontSize: 12 }}
          onClick={() => setIsEditing(true)}
          disabled={!detail}
        >
          <Icon name="edit" size={13} />
          Editar
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, justifyContent: "center", gap: 6, fontSize: 12 }}
          onClick={() => setIsEvaluating(true)}
        >
          <Icon name="plus" size={13} />
          Evaluar riesgo
        </button>
        {base && (
          <div style={{ flex: "1 1 100%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: "center", fontSize: 11, padding: "5px 4px" }}
              onClick={() => navigate(`${base}/infraestructura?arbol=${treeId}&nuevo=1`)}
            >
              Evaluar infraestructura
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: "center", fontSize: 11, padding: "5px 4px" }}
              onClick={() => navigate(`${base}/mantencion?arbol=${treeId}&nuevo=1`)}
            >
              Crear orden
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: "center", fontSize: 11, padding: "5px 4px" }}
              onClick={() => navigate(`${base}/incidencias?arbol=${treeId}&nuevo=1`)}
            >
              Registrar incidencia
            </button>
          </div>
        )}
        </>
        )}
      </footer>

      {isEditing && detail && (
        <EditTreeModal
          tree={detail}
          onClose={() => setIsEditing(false)}
          onSuccess={(updated) => {
            setDetail(updated);
            setIsEditing(false);
            onTreeUpdated?.(updated);
          }}
        />
      )}

      {isEvaluating && (
        <RiskAssessmentModal
          treeId={treeId}
          treeLabel={`${props.tree_code} — ${props.nombre_comun || props.nombre_cientifico || "Especie no identificada"}`}
          onClose={() => setIsEvaluating(false)}
          onSuccess={(dto) => {
            setLatestAssessment(dto);
            onRiskAssessmentCreated?.(treeId, dto);
          }}
        />
      )}
    </aside>
  );
}
