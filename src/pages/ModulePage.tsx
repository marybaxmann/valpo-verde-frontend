import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getProject } from "../api/projects";
import { listProjectTrees } from "../api/trees";
import { getProjectRiskSummary, listTreeRiskAssessments } from "../api/treeRiskAssessments";
import type { Project } from "../types/project";
import type { TreeFeature, TreeInventory } from "../types/tree";
import type { TreeRiskAssessmentDTO } from "../types/treeRisk";
import { getArcgisApiKey } from "../lib/arcgis";
import { Icon, type IconName } from "../components/Icons";
import { MapPlaceholder } from "../components/MapPlaceholder";
import { TreeDetailModal } from "../components/TreeDetailModal";
import { RiskAssessmentModal } from "../components/RiskAssessmentModal";
import { ClassificationBadge } from "../components/ClassificationBadge";
import { listProjectInfrastructureAssessments, type InfrastructureAssessmentDTO } from "../api/moduleRecords";
import {
  InfrastructureAssessmentDetailModal,
  InfrastructureAssessmentModal,
  InfrastructureAssessmentSummary,
  componentesRegistrados,
} from "../components/InfrastructureAssessmentModal";
import { SivuTable } from "../components/SivuTable";
import { useCanWrite } from "../hooks/useCanWrite";

const InventoryMapView = lazy(() => import("../components/InventoryMapView"));

export type ModuleKey = "inspeccion" | "infraestructura";

type InspectionFilter = "todos" | "evaluados" | "sin_evaluar";

interface ModuleConfig {
  title: string;
  icon: IconName;
  description: string;
  /** Texto del panel contextual cuando el árbol seleccionado no tiene registros del módulo. */
  emptyPanelText: string;
  /** Texto cuando no hay ningún registro del módulo en el proyecto. */
  emptyListText: string;
  actionLabel: string;
  listLabel: string;
}

const MODULE_CONFIG: Record<ModuleKey, ModuleConfig> = {
  inspeccion: {
    title: "Inspección y Riesgo",
    icon: "check-square",
    description:
      "Evaluación técnica y seguimiento del riesgo del arbolado urbano.",
    emptyPanelText: "Este árbol aún no posee una evaluación de riesgo.",
    emptyListText: "Este proyecto todavía no tiene evaluaciones de riesgo registradas.",
    actionLabel: "+ Nueva evaluación",
    listLabel: "Evaluaciones",
  },
  infraestructura: {
    title: "Infraestructura",
    icon: "building",
    description: "Interacción entre el arbolado urbano y la infraestructura: veredas, calzadas, redes y mobiliario.",
    emptyPanelText: "Aún no existen evaluaciones de infraestructura registradas para este árbol.",
    emptyListText: "Aún no existen evaluaciones de infraestructura para este proyecto.",
    actionLabel: "+ Registrar evaluación de infraestructura",
    listLabel: "Evaluaciones de infraestructura",
  },
};

/**
 * Módulos territoriales con mapa: Inspección y Riesgo (flujo real de
 * evaluación R01–R04/M01–M03 contra el backend) e Infraestructura
 * (territorio e inventario reales; sin entidad de evaluación de
 * infraestructura en el backend todavía, así que no se muestran
 * resultados ni cifras de ese módulo — solo el estado vacío real).
 *
 * Mantención e Incidencias NO usan este shell: son flujos de gestión/
 * listado sin componente territorial principal — ver MaintenancePage.tsx
 * e IncidentsPage.tsx.
 */
export default function ModulePage({ module }: { module: ModuleKey }) {
  const { projectId = "" } = useParams();
  const apiKey = getArcgisApiKey();
  const config = MODULE_CONFIG[module];
  const isInspection = module === "inspeccion";
  const canWrite = useCanWrite();

  const [project, setProject] = useState<Project | null>(null);
  const [inventory, setInventory] = useState<TreeInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [inspectingTreeId, setInspectingTreeId] = useState<string | null>(null);
  const [selectTreeHint, setSelectTreeHint] = useState(false);
  const [inspectionFilter, setInspectionFilter] = useState<InspectionFilter>("todos");

  const [evaluatingTree, setEvaluatingTree] = useState<TreeFeature | null>(null);
  const [treeAssessments, setTreeAssessments] = useState<TreeRiskAssessmentDTO[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState<string | null>(null);
  const [assessmentFeedback, setAssessmentFeedback] = useState<string | null>(null);
  const [riskSummary, setRiskSummary] = useState<Record<string, TreeRiskAssessmentDTO>>({});
  // Infraestructura: evaluaciones (datos crudos) del proyecto, más recientes primero.
  const [infraAll, setInfraAll] = useState<InfrastructureAssessmentDTO[]>([]);
  const [infraError, setInfraError] = useState<string | null>(null);
  const [infraEvaluatingTree, setInfraEvaluatingTree] = useState<TreeFeature | null>(null);
  const [infraDetail, setInfraDetail] = useState<InfrastructureAssessmentDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedTreeId(null);

    Promise.all([getProject(projectId), listProjectTrees(projectId)])
      .then(([projectData, inventoryData]) => {
        if (cancelled) return;
        setProject(projectData);
        setInventory(inventoryData);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el módulo.");
        setLoading(false);
      });

    // Resumen de riesgo real: Inspección lo usa para colorear y listar;
    // Infraestructura solo para mostrar el riesgo actual del árbol elegido.
    getProjectRiskSummary(projectId)
      .then((res) => {
        if (cancelled) return;
        setRiskSummary(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setRiskSummary({});
      });

    if (module === "infraestructura") {
      setInfraError(null);
      listProjectInfrastructureAssessments(projectId)
        .then((res) => {
          if (!cancelled) setInfraAll(res.data);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setInfraAll([]);
          setInfraError(err instanceof Error ? err.message : "No se pudieron cargar las evaluaciones de infraestructura.");
        });
    }

    return () => {
      cancelled = true;
    };
  }, [projectId, module]);

  // Referencia estable: evita que el mapa resincronice capas en cada render.
  const features = useMemo(() => inventory?.data.features ?? [], [inventory]);
  const selectedFeature: TreeFeature | undefined = features.find(
    (f) => f.properties.id === selectedTreeId
  );

  const riskByTreeId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const [treeId, dto] of Object.entries(riskSummary)) {
      map[treeId] = dto.resultado.clasificacion_riesgo;
    }
    return map;
  }, [riskSummary]);

  // Indicadores reales de Inspección: solo cuentan lo que ya existe
  // persistido — nunca cifras inventadas para rellenar la pantalla.
  const inspectionStats = useMemo(() => {
    const evaluados = Object.keys(riskSummary).length;
    const counts = { Bajo: 0, Moderado: 0, Alto: 0, Extremo: 0 };
    for (const dto of Object.values(riskSummary)) {
      const r = dto.resultado.clasificacion_riesgo;
      if (r === "Bajo" || r === "Moderado" || r === "Alto" || r === "Extremo") counts[r]++;
    }
    return {
      arbolesEvaluados: evaluados,
      arbolesSinEvaluar: Math.max(0, features.length - evaluados),
      ...counts,
    };
  }, [riskSummary, features.length]);

  // Listado y mapa de Inspección filtrados por estado de evaluación.
  const visibleFeatures = useMemo(() => {
    if (!isInspection || inspectionFilter === "todos") return features;
    return features.filter((f) => {
      const evaluado = f.properties.id in riskSummary;
      return inspectionFilter === "evaluados" ? evaluado : !evaluado;
    });
  }, [features, isInspection, inspectionFilter, riskSummary]);

  const evaluationRows = useMemo(() => {
    return Object.values(riskSummary)
      .slice()
      .sort((a, b) => b.fecha_evaluacion.localeCompare(a.fecha_evaluacion) || b.created_at.localeCompare(a.created_at))
      .map((dto) => ({
        dto,
        tree: features.find((f) => f.properties.id === dto.tree_id),
      }));
  }, [riskSummary, features]);

  function handleRiskAssessmentSaved(treeId: string, dto: TreeRiskAssessmentDTO) {
    setRiskSummary((prev) => ({ ...prev, [treeId]: dto }));
    if (treeId === selectedTreeId) setTreeAssessments((prev) => [dto, ...prev.filter((a) => a.id !== dto.id)]);
  }

  // Historial completo del árbol seleccionado (Inspección).
  useEffect(() => {
    if (!isInspection || !selectedTreeId) {
      setTreeAssessments([]);
      setAssessmentsError(null);
      return;
    }
    let cancelled = false;
    setLoadingAssessments(true);
    setAssessmentsError(null);
    listTreeRiskAssessments(selectedTreeId)
      .then((res) => {
        if (!cancelled) setTreeAssessments(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTreeAssessments([]);
        setAssessmentsError(err instanceof Error ? err.message : "No se pudo cargar el historial de evaluaciones.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAssessments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isInspection, selectedTreeId]);

  function handleActionClick() {
    if (selectedFeature) {
      setEvaluatingTree(selectedFeature);
    } else {
      setSelectTreeHint(true);
      setTimeout(() => setSelectTreeHint(false), 4000);
    }
  }

  function treeLabel(f: TreeFeature): string {
    const especie = f.properties.nombre_comun || f.properties.nombre_cientifico || "Especie no identificada";
    return `${f.properties.tree_code} — ${especie}`;
  }

  const latest = treeAssessments[0] ?? null;

  // Acceso contextual desde la ficha/panel: ?arbol=<id>[&nuevo=1]
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const arbol = searchParams.get("arbol");
    if (!arbol || features.length === 0) return;
    const f = features.find((x) => x.properties.id === arbol);
    if (!f) return;
    setSelectedTreeId(arbol);
    setInspectingTreeId(null);
    if (searchParams.get("nuevo") === "1" && canWrite) {
      if (isInspection) setEvaluatingTree(f);
      else setInfraEvaluatingTree(f);
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, features, isInspection, setSearchParams, canWrite]);

  const infraTreeIds = useMemo(() => new Set(infraAll.map((a) => a.tree_id)), [infraAll]);
  const infraForSelected = useMemo(
    () => (selectedTreeId ? infraAll.filter((a) => a.tree_id === selectedTreeId) : []),
    [infraAll, selectedTreeId]
  );

  function handleInfraSaved(dto: InfrastructureAssessmentDTO, code: string) {
    setInfraAll((prev) => [dto, ...prev]);
    setAssessmentFeedback(`Evaluación de infraestructura de ${code} registrada.`);
    setTimeout(() => setAssessmentFeedback(null), 5000);
  }

  return (
    <div className="sivu-territorial-layout">
      <header className="sivu-territorial-topbar">
        <div className="sivu-territorial-topbar__left">
          <span className="sivu-territorial-topbar__title">
            <Icon name={config.icon} size={14} /> {config.title}
          </span>
          <span className="sivu-territorial-topbar__project">
            <Icon name="leaf" size={13} />
            {project ? project.name : "Cargando proyecto..."}
          </span>
          {project && (
            <span className="status-pill" style={{ fontSize: 11 }}>
              {project.institution_name}
            </span>
          )}
        </div>
        <div className="sivu-territorial-topbar__right">
          {assessmentFeedback && (
            <span style={{ fontSize: 12, color: "var(--sivu-primary)", fontWeight: 600 }}>
              ✓ {assessmentFeedback}
            </span>
          )}
        </div>
      </header>

      <div className="sivu-territorial-body">
        {/* Columna 1: contexto del módulo + listado real de árboles */}
        <aside className="sivu-inv-panel" aria-label={`Contexto de ${config.title}`}>
          <div className="sivu-inv-panel__header">
            <div className="sivu-inv-panel__title-box">
              <span className="sivu-inv-panel__title">{isInspection ? config.listLabel : "Árboles registrados"}</span>
              <span className="sivu-inv-panel__badge">
                {isInspection ? inspectionStats.arbolesEvaluados : features.length}
              </span>
            </div>
          </div>

          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-default)" }}>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              {config.description}
            </p>
          </div>

          {canWrite && (
          <div className="sivu-inv-panel__action" style={{ position: "relative" }}>
            {isInspection ? (
              <>
                <button className="sivu-inv-panel__btn-add" onClick={handleActionClick}>
                  {selectedFeature ? `+ Evaluar ${selectedFeature.properties.tree_code}` : config.actionLabel}
                </button>
                {selectTreeHint && (
                  <p style={{ fontSize: 11, color: "var(--classification-high)", marginTop: 8, marginBottom: 0 }}>
                    Selecciona un árbol en el mapa o en el listado para evaluarlo.
                  </p>
                )}
              </>
            ) : (
              <>
                <button
                  className="sivu-inv-panel__btn-add"
                  onClick={() => {
                    if (selectedFeature) setInfraEvaluatingTree(selectedFeature);
                    else {
                      setSelectTreeHint(true);
                      setTimeout(() => setSelectTreeHint(false), 4000);
                    }
                  }}
                >
                  {selectedFeature ? `+ Evaluar ${selectedFeature.properties.tree_code}` : config.actionLabel}
                </button>
                {selectTreeHint && (
                  <p style={{ fontSize: 11, color: "var(--classification-high)", marginTop: 8, marginBottom: 0 }}>
                    Selecciona un árbol en el mapa o en el listado para evaluarlo.
                  </p>
                )}
              </>
            )}
          </div>
          )}

          {isInspection ? (
            <>
              <div
                style={{
                  padding: "10px 14px 12px",
                  borderBottom: "1px solid var(--border-default)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px 10px",
                }}
              >
                <IndicadorChip label="Evaluados" value={inspectionStats.arbolesEvaluados} />
                <IndicadorChip label="Sin evaluar" value={inspectionStats.arbolesSinEvaluar} />
                <IndicadorChip label="Bajo" value={inspectionStats.Bajo} color="#4d6a2e" />
                <IndicadorChip label="Moderado" value={inspectionStats.Moderado} color="#946200" />
                <IndicadorChip label="Alto" value={inspectionStats.Alto} color="#F04A32" />
                <IndicadorChip label="Extremo" value={inspectionStats.Extremo} color="#C7252B" />
              </div>
              <div className="sivu-seg" role="tablist" aria-label="Filtrar por estado de evaluación">
                <button className={inspectionFilter === "todos" ? "active" : ""} onClick={() => setInspectionFilter("todos")}>
                  Todos ({features.length})
                </button>
                <button
                  className={inspectionFilter === "evaluados" ? "active" : ""}
                  onClick={() => setInspectionFilter("evaluados")}
                >
                  Evaluados ({inspectionStats.arbolesEvaluados})
                </button>
                <button
                  className={inspectionFilter === "sin_evaluar" ? "active" : ""}
                  onClick={() => setInspectionFilter("sin_evaluar")}
                >
                  Sin evaluar ({inspectionStats.arbolesSinEvaluar})
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                padding: "10px 14px 12px",
                borderBottom: "1px solid var(--border-default)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px 10px",
              }}
            >
              <IndicadorChip label="Árboles registrados" value={features.length} />
              <IndicadorChip label="Evaluaciones" value={infraAll.length} />
              <IndicadorChip label="Con evaluación" value={infraTreeIds.size} />
              <IndicadorChip label="Sin evaluación" value={Math.max(0, features.length - infraTreeIds.size)} />
              {infraError && (
                <p style={{ gridColumn: "1 / -1", fontSize: 11.5, color: "var(--classification-critical)", margin: "4px 0 0" }}>
                  {infraError}
                </p>
              )}
            </div>
          )}

          <div
            style={{
              padding: "8px 14px",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--text-secondary)",
            }}
          >
            Árboles del proyecto
          </div>
          <div className="sivu-inv-list" role="list">
            {visibleFeatures.map((f) => {
              const isSelected = f.properties.id === selectedTreeId;
              const evaluado = f.properties.id in riskByTreeId;
              const riesgo = riskByTreeId[f.properties.id];
              return (
                <div
                  key={f.properties.id}
                  className={`sivu-inv-tree-row ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedTreeId(f.properties.id)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedTreeId(f.properties.id);
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="sivu-inv-tree-row__code">{f.properties.tree_code}</div>
                    <div className="sivu-inv-tree-row__sp">
                      {f.properties.nombre_comun || f.properties.nombre_cientifico || "Especie no ident."}
                    </div>
                  </div>
                  {!isInspection && (
                    <span className="status-pill" style={{ fontSize: 10, padding: "1px 6px" }}>
                      {infraTreeIds.has(f.properties.id) ? "Evaluado" : "Sin evaluar"}
                    </span>
                  )}
                  {isInspection &&
                    (riesgo ? (
                      <ClassificationBadge level={riesgo} className="risk-list-badge" />
                    ) : (
                      <span className="status-pill" style={{ fontSize: 10, padding: "1px 6px" }}>
                        {evaluado ? "No determinado" : "Sin evaluar"}
                      </span>
                    ))}
                </div>
              );
            })}
            {!loading && visibleFeatures.length === 0 && (
              <div style={{ padding: "24px 14px", fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
                {features.length === 0
                  ? "Sin árboles registrados en el inventario de este proyecto."
                  : "No hay árboles en esta categoría."}
              </div>
            )}
          </div>
        </aside>

        {/* Columna 2: mapa territorial real, compartido con Inventario */}
        <main className="sivu-map-pane">
          <div className="sivu-map-pane__header">
            <span className="sivu-map-pane__header-label">
              <span className="sivu-map-pane__header-dot" />
              Arbolado urbano · WGS84
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{visibleFeatures.length} visibles</span>
          </div>
          <div className="sivu-map-pane__canvas">
            {loading && (
              <div style={{ padding: 24, color: "var(--text-secondary)" }}>Cargando mapa territorial…</div>
            )}
            {!loading && error && (
              <div className="card card--pad" style={{ margin: 20 }}>
                <p style={{ color: "var(--classification-critical)" }}>
                  <Icon name="alert" size={14} /> {error}
                </p>
              </div>
            )}
            {!loading &&
              !error &&
              (apiKey ? (
                <Suspense
                  fallback={
                    <div style={{ padding: 24, color: "var(--text-secondary)" }}>Cargando visor ArcGIS…</div>
                  }
                >
                  <InventoryMapView
                    key={projectId}
                    apiKey={apiKey}
                    features={visibleFeatures}
                    selectedTreeId={selectedTreeId}
                    onSelectTree={(id) => setSelectedTreeId(id)}
                    riskByTreeId={isInspection ? riskByTreeId : undefined}
                    showLegend={isInspection}
                  />
                </Suspense>
              ) : (
                <MapPlaceholder
                  title="Visor SIG no disponible"
                  note="Falta configurar VITE_ARCGIS_API_KEY en el archivo .env del frontend."
                />
              ))}
          </div>
        </main>

        {/* Columna 3: contexto — árbol seleccionado o resumen del módulo */}
        <aside className="sivu-detail-dock" aria-label={`Contexto de ${config.title}`}>
          {selectedFeature ? (
            <>
              <header className="sivu-detail-dock__header">
                <div style={{ minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTreeId(null)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      marginBottom: 4,
                      fontSize: 11.5,
                      color: "var(--sivu-primary)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    ← {isInspection ? "Volver al listado de evaluaciones" : "Volver al resumen"}
                  </button>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--sivu-primary-dark)" }}>
                    {selectedFeature.properties.tree_code}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-primary)" }}>
                    {selectedFeature.properties.nombre_comun ||
                      selectedFeature.properties.nombre_cientifico ||
                      "Especie no identificada"}
                  </div>
                  {(selectedFeature.properties.lugar_referencia || selectedFeature.properties.direccion) && (
                    <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                      {[selectedFeature.properties.direccion, selectedFeature.properties.lugar_referencia]
                        .filter(Boolean)
                        .join(" — ")}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "4px 8px", minHeight: "auto", border: "none" }}
                  onClick={() => setSelectedTreeId(null)}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </header>
              <div className="sivu-detail-dock__body">
                {isInspection ? (
                  loadingAssessments ? (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cargando evaluaciones…</p>
                  ) : assessmentsError ? (
                    <p style={{ fontSize: 12, color: "var(--classification-critical)" }}>{assessmentsError}</p>
                  ) : latest ? (
                    <>
                      <div className="card card--pad" style={{ background: "var(--surface-background)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span className="sivu-tech-cell__label">Última evaluación</span>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{latest.fecha_evaluacion}</span>
                        </div>
                        <div style={{ textAlign: "center", marginBottom: 10 }}>
                          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: 6 }}>
                            Nivel de riesgo
                          </div>
                          {latest.resultado.clasificacion_riesgo ? (
                            <ClassificationBadge level={latest.resultado.clasificacion_riesgo} className="risk-result-badge" />
                          ) : (
                            <span className="status-pill">No determinado</span>
                          )}
                        </div>
                        <div className="sivu-tech-grid">
                          <div className="sivu-tech-cell">
                            <span className="sivu-tech-cell__label">Prob. de impacto</span>
                            <span className="sivu-tech-cell__value">{latest.resultado.probabilidad_impacto}</span>
                          </div>
                          <div className="sivu-tech-cell">
                            <span className="sivu-tech-cell__label">Inspector</span>
                            <span className="sivu-tech-cell__value">{latest.inspector_nombre || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="sivu-tech-cell__label" style={{ display: "block", marginBottom: 6 }}>
                          Historial ({treeAssessments.length})
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {treeAssessments.map((a) => (
                            <div
                              key={a.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: 12,
                                padding: "6px 8px",
                                border: "1px solid var(--border-default)",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--surface-primary)",
                              }}
                            >
                              <span>{a.fecha_evaluacion}</span>
                              {a.resultado.clasificacion_riesgo ? (
                                <ClassificationBadge level={a.resultado.clasificacion_riesgo} className="risk-list-badge" />
                              ) : (
                                <span className="status-pill" style={{ fontSize: 10 }}>No determinado</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="card card--pad" style={{ background: "var(--surface-background)" }}>
                      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>{config.emptyPanelText}</p>
                    </div>
                  )
                ) : (
                  <>
                    <div className="sivu-tech-grid">
                      <div className="sivu-tech-cell">
                        <span className="sivu-tech-cell__label">Comuna</span>
                        <span className="sivu-tech-cell__value">{selectedFeature.properties.comuna || "—"}</span>
                      </div>
                      <div className="sivu-tech-cell">
                        <span className="sivu-tech-cell__label">Riesgo actual</span>
                        <div style={{ marginTop: 2 }}>
                          {riskByTreeId[selectedFeature.properties.id] ? (
                            <ClassificationBadge level={riskByTreeId[selectedFeature.properties.id] as string} />
                          ) : selectedFeature.properties.id in riskByTreeId ? (
                            <span className="status-pill">No determinado</span>
                          ) : (
                            <span className="status-pill">Sin evaluación</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="card card--pad" style={{ background: "var(--surface-background)", padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span className="sivu-tech-cell__label">Evaluación de infraestructura</span>
                        {infraForSelected[0] && (
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{infraForSelected[0].fecha_evaluacion}</span>
                        )}
                      </div>
                      {infraForSelected[0] ? (
                        <>
                          <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 8 }}>
                            Inspector: {infraForSelected[0].inspector_nombre || "—"}
                          </div>
                          <InfrastructureAssessmentSummary dto={infraForSelected[0]} />
                        </>
                      ) : (
                        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>{config.emptyPanelText}</p>
                      )}
                    </div>
                    {infraForSelected.length > 0 && (
                      <div>
                        <span className="sivu-tech-cell__label" style={{ display: "block", marginBottom: 6 }}>
                          Historial ({infraForSelected.length})
                        </span>
                        <SivuTable
                          columns={[
                            { label: "Fecha", width: "34%" },
                            { label: "Comp.", width: "18%" },
                            { label: "Global", width: "26%" },
                            { label: "", width: "22%", align: "right" },
                          ]}
                        >
                          {infraForSelected.map((a) => (
                            <tr key={a.id}>
                              <td className="sivu-table__num" style={{ padding: "8px 10px" }}>{a.fecha_evaluacion}</td>
                              <td style={{ padding: "8px 10px" }} title="Componentes con presencia o interferencia registrada">
                                {componentesRegistrados(a.variables)}
                              </td>
                              <td style={{ padding: "8px 10px", fontSize: 11 }}>Pendiente</td>
                              <td className="sivu-table__actions" style={{ padding: "8px 10px" }}>
                                <button className="btn btn-ghost btn-sm" style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => setInfraDetail(a)}>
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))}
                        </SivuTable>
                      </div>
                    )}
                  </>
                )}
              </div>
              <footer className="sivu-detail-dock__footer" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {canWrite && (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center", gap: 6 }}
                    onClick={() => (isInspection ? setEvaluatingTree(selectedFeature) : setInfraEvaluatingTree(selectedFeature))}
                  >
                    <Icon name="plus" size={14} />
                    {isInspection ? "Nueva evaluación" : "Nueva evaluación de infraestructura"}
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", gap: 6 }}
                  onClick={() => setInspectingTreeId(selectedFeature.properties.id)}
                >
                  <Icon name="eye" size={14} />
                  Ver ficha completa
                </button>
              </footer>
            </>
          ) : isInspection ? (
            <>
              <header className="sivu-detail-dock__header">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sivu-primary-dark)" }}>
                    Evaluaciones recientes
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    Última evaluación de cada árbol · selecciona una para ver el árbol
                  </div>
                </div>
              </header>
              <div className="sivu-detail-dock__body" style={{ padding: 0, gap: 0 }}>
                {evaluationRows.length === 0 ? (
                  <div className="empty-state" style={{ padding: "36px 12px" }}>
                    <div className="empty-state__icon">
                      <Icon name={config.icon} size={22} />
                    </div>
                    <h3>Sin evaluaciones registradas</h3>
                    <p>{config.emptyListText} Selecciona un árbol y usa “+ Nueva evaluación”.</p>
                  </div>
                ) : (
                  <div className="sivu-inv-list" role="list">
                    {evaluationRows.map(({ dto, tree }) => (
                      <div
                        key={dto.id}
                        className="sivu-inv-tree-row"
                        role="listitem"
                        tabIndex={0}
                        title="Ver árbol"
                        onClick={() => tree && setSelectedTreeId(tree.properties.id)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && tree) setSelectedTreeId(tree.properties.id);
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div className="sivu-inv-tree-row__code">
                            {tree?.properties.tree_code ?? dto.tree_id.slice(0, 8)}
                          </div>
                          <div className="sivu-inv-tree-row__sp">
                            {tree?.properties.nombre_comun || tree?.properties.nombre_cientifico || "—"} ·{" "}
                            {dto.fecha_evaluacion}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {dto.resultado.clasificacion_riesgo ? (
                            <ClassificationBadge level={dto.resultado.clasificacion_riesgo} className="risk-list-badge" />
                          ) : (
                            <span className="status-pill" style={{ fontSize: 10 }}>No determinado</span>
                          )}
                          <span style={{ fontSize: 11, color: "var(--sivu-primary)", fontWeight: 600 }}>Ver árbol →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <header className="sivu-detail-dock__header">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sivu-primary-dark)" }}>
                    {config.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    Evaluaciones registradas · selecciona una para ver el árbol
                  </div>
                </div>
              </header>
              <div className="sivu-detail-dock__body" style={{ padding: 0, gap: 0 }}>
                {infraAll.length === 0 ? (
                  <div className="empty-state" style={{ padding: "36px 12px" }}>
                    <div className="empty-state__icon">
                      <Icon name={config.icon} size={22} />
                    </div>
                    <h3>Sin evaluaciones de infraestructura registradas</h3>
                    <p>{config.emptyListText} Selecciona un árbol y usa “Registrar evaluación”.</p>
                  </div>
                ) : (
                  <div className="sivu-inv-list" role="list">
                    {infraAll.map((a) => {
                      const tree = features.find((f) => f.properties.id === a.tree_id);
                      return (
                        <div
                          key={a.id}
                          className="sivu-inv-tree-row"
                          role="listitem"
                          tabIndex={0}
                          onClick={() => setSelectedTreeId(a.tree_id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setSelectedTreeId(a.tree_id);
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className="sivu-inv-tree-row__code">{tree?.properties.tree_code ?? a.tree_id.slice(0, 8)}</div>
                            <div className="sivu-inv-tree-row__sp">
                              {tree?.properties.nombre_comun || tree?.properties.nombre_cientifico || "—"} · {a.fecha_evaluacion}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--sivu-primary)", fontWeight: 600 }}>Ver árbol →</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {inspectingTreeId && (
        <TreeDetailModal
          treeId={inspectingTreeId}
          onClose={() => setInspectingTreeId(null)}
          onRiskAssessmentCreated={handleRiskAssessmentSaved}
        />
      )}

      {infraDetail && (
        <InfrastructureAssessmentDetailModal
          dto={infraDetail}
          treeLabel={(() => {
            const f = features.find((x) => x.properties.id === infraDetail.tree_id);
            return f ? treeLabel(f) : "";
          })()}
          onClose={() => setInfraDetail(null)}
          onNew={!canWrite ? undefined : () => {
            const f = features.find((x) => x.properties.id === infraDetail.tree_id);
            setInfraDetail(null);
            if (f) setInfraEvaluatingTree(f);
          }}
        />
      )}

      {infraEvaluatingTree && (
        <InfrastructureAssessmentModal
          treeId={infraEvaluatingTree.properties.id}
          treeLabel={treeLabel(infraEvaluatingTree)}
          onClose={() => setInfraEvaluatingTree(null)}
          onSuccess={(dto) => handleInfraSaved(dto, infraEvaluatingTree.properties.tree_code)}
        />
      )}

      {evaluatingTree && (
        <RiskAssessmentModal
          treeId={evaluatingTree.properties.id}
          treeLabel={treeLabel(evaluatingTree)}
          onClose={() => setEvaluatingTree(null)}
          onSuccess={(dto) => {
            handleRiskAssessmentSaved(evaluatingTree.properties.id, dto);
            setAssessmentFeedback(`Evaluación de ${evaluatingTree.properties.tree_code} registrada.`);
            setTimeout(() => setAssessmentFeedback(null), 5000);
          }}
        />
      )}
    </div>
  );
}

/** Indicador compacto real (nunca una cifra inventada para rellenar la pantalla). */
function IndicadorChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      style={{
        background: "var(--surface-background)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        padding: "6px 8px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: color ?? "var(--sivu-primary-dark)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9.5, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </div>
    </div>
  );
}
