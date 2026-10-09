import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getProject } from "../api/projects";
import { listProjectTrees } from "../api/trees";
import { getProjectRiskSummary } from "../api/treeRiskAssessments";
import type { Project } from "../types/project";
import type { TreeDetailDTO, TreeFeature, TreeInventory } from "../types/tree";
import type { RiesgoFiltro, TreeRiskAssessmentDTO } from "../types/treeRisk";
import { getArcgisApiKey } from "../lib/arcgis";
import { Icon } from "../components/Icons";
import { MapPlaceholder } from "../components/MapPlaceholder";
import { BarRow } from "../components/BarRow";
import { TreeContextualPanel } from "../components/TreeContextualPanel";
import { TreeDetailModal } from "../components/TreeDetailModal";
import { CreateTreeModal } from "../components/CreateTreeModal";
import { ClassificationBadge } from "../components/ClassificationBadge";
import { RiskDistribution, countRisks } from "../components/RiskDistribution";
import { useCanWrite } from "../hooks/useCanWrite";

/** SDK de ArcGIS cargado de forma diferida */
const InventoryMapView = lazy(() => import("../components/InventoryMapView"));

/**
 * INV-1C — Workspace Territorial de Inventario de Arbolado Urbano (SIVU).
 *
 * Plataforma territorial-analítica (referencia visual: City Dashboard):
 *   [Registros + resumen] ↔ [Mapa integrado] ↔ [Contexto: ficha seleccionada o resumen analítico]
 */
export default function ProjectInventoryMap() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const apiKey = getArcgisApiKey();
  const canWrite = useCanWrite();

  const projectsBasePath = location.pathname.startsWith("/admin")
    ? "/admin/projects"
    : "/usuario/projects";

  const [project, setProject] = useState<Project | null>(null);
  const [inventory, setInventory] = useState<TreeInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Interacción Territorial
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [inspectingTreeId, setInspectingTreeId] = useState<string | null>(null);

  // Estados de Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<RiesgoFiltro | "all">("all");

  // Última evaluación vigente por árbol (para colorear el mapa y filtrar).
  // Nunca se recalcula aquí: es exactamente lo que persistió el backend.
  const [riskSummary, setRiskSummary] = useState<Record<string, TreeRiskAssessmentDTO>>({});

  // Estados de Creación de Árbol (+ Nuevo Árbol)
  const [isCreatingTree, setIsCreatingTree] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{ lon: number; lat: number } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  function loadData() {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getProject(projectId), listProjectTrees(projectId)])
      .then(([projectData, inventoryData]) => {
        if (cancelled) return;
        setProject(projectData);
        setInventory(inventoryData);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el inventario.");
        setLoading(false);
      });

    // Resumen de riesgo: no bloquea la carga del inventario ni del mapa —
    // si falla, el mapa simplemente queda sin colorear (todo "Sin evaluación").
    getProjectRiskSummary(projectId)
      .then((res) => {
        if (cancelled) return;
        setRiskSummary(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setRiskSummary({});
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    return loadData();
  }, [projectId]);

  // Conteos por estado de ciclo de vida para chips
  const { activeCount, deadCount, removedCount } = useMemo(() => {
    if (!inventory?.data?.features) return { activeCount: 0, deadCount: 0, removedCount: 0 };
    let act = 0;
    let dead = 0;
    let rem = 0;
    for (const f of inventory.data.features) {
      const st = f.properties.estado_ciclo_vida?.toLowerCase();
      if (st === "activo") act++;
      else if (st === "retirado") dead++;
      else if (st === "tocon") rem++;
    }
    return { activeCount: act, deadCount: dead, removedCount: rem };
  }, [inventory]);

  // tree_id -> clasificacion_riesgo de su última evaluación (solo lectura
  // de lo ya calculado por el backend; null = evaluado pero "No determinado").
  const riskByTreeId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const [treeId, dto] of Object.entries(riskSummary)) {
      map[treeId] = dto.resultado.clasificacion_riesgo;
    }
    return map;
  }, [riskSummary]);

  // Conteos por nivel de riesgo (lectura analítica sobre resultados reales
  // ya persistidos, no un cálculo metodológico nuevo).
  const riskCounts = useMemo(() => {
    const counts = { Bajo: 0, Moderado: 0, Alto: 0, Extremo: 0, sin_evaluacion: 0 };
    const total = inventory?.data?.features.length ?? 0;
    const evaluados = Object.keys(riskSummary).length;
    for (const dto of Object.values(riskSummary)) {
      const r = dto.resultado.clasificacion_riesgo;
      if (r === "Bajo" || r === "Moderado" || r === "Alto" || r === "Extremo") counts[r]++;
    }
    counts.sin_evaluacion = Math.max(0, total - evaluados);
    return counts;
  }, [riskSummary, inventory]);

  // Filtrado reactivo de features
  const filteredFeatures = useMemo(() => {
    if (!inventory?.data?.features) return [];
    return inventory.data.features.filter((f) => {
      const matchSearch =
        !searchTerm.trim() ||
        f.properties.tree_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.properties.nombre_comun &&
          f.properties.nombre_comun.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.properties.nombre_cientifico &&
          f.properties.nombre_cientifico.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.properties.direccion &&
          f.properties.direccion.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        f.properties.estado_ciclo_vida.toLowerCase() === statusFilter.toLowerCase();

      const treeRisk = riskByTreeId[f.properties.id];
      const matchRisk =
        riskFilter === "all" ||
        (riskFilter === "sin_evaluacion" ? treeRisk === undefined : treeRisk === riskFilter);

      return matchSearch && matchStatus && matchRisk;
    });
  }, [inventory, searchTerm, statusFilter, riskFilter, riskByTreeId]);

  // Árbol seleccionado actualmente
  const selectedFeature: TreeFeature | undefined = useMemo(() => {
    if (!selectedTreeId || !inventory?.data?.features) return undefined;
    return inventory.data.features.find((f) => f.properties.id === selectedTreeId);
  }, [selectedTreeId, inventory]);

  // Porcentaje georreferenciado para la barra KPI
  const geocodedPct = useMemo(() => {
    if (!inventory || inventory.meta.total === 0) return 0;
    return Math.round((inventory.meta.con_ubicacion / inventory.meta.total) * 100);
  }, [inventory]);

  // Especies con más registros (agregación de visualización sobre datos reales,
  // no es una clasificación ni un cálculo metodológico)
  const speciesBreakdown = useMemo(() => {
    if (!inventory?.data?.features) return [];
    const counts = new Map<string, number>();
    for (const f of inventory.data.features) {
      const key =
        f.properties.nombre_comun || f.properties.nombre_cientifico || "Especie no identificada";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [inventory]);

  function handleStartPickingLocation() {
    setIsPickingLocation(true);
  }

  function handleLocationPicked(coords: { lon: number; lat: number }) {
    setPickedLocation(coords);
    setIsPickingLocation(false);
    setIsCreatingTree(true); // Reabre el modal con las coordenadas capturadas
  }

  function handleCreateSuccess(createdTree: TreeDetailDTO) {
    setIsCreatingTree(false);
    setIsPickingLocation(false);
    setPickedLocation(null);
    // El árbol recién registrado no tiene evaluación: se limpian los
    // filtros para que no quede oculto del listado ni del mapa.
    setSearchTerm("");
    setStatusFilter("all");
    setRiskFilter("all");
    setFeedbackMessage(`Árbol ${createdTree.tree_code} registrado con éxito.`);
    setTimeout(() => setFeedbackMessage(null), 5000);

    // Recargar inventario real desde backend (nunca se agrega el árbol al
    // estado local a mano: la fuente de verdad es siempre la relectura).
    listProjectTrees(projectId)
      .then((inv) => {
        setInventory(inv);
        setSelectedTreeId(createdTree.id);
      })
      .catch((err: unknown) => {
        // El árbol sí se guardó (onSuccess ya se disparó); si falla esta
        // relectura, se informa en vez de dejar el inventario visualmente
        // desactualizado sin explicación.
        setError(
          err instanceof Error
            ? `Árbol guardado, pero no se pudo recargar el inventario: ${err.message}`
            : "Árbol guardado, pero no se pudo recargar el inventario."
        );
      });
  }

  function handleRiskAssessmentCreated(treeId: string, dto: TreeRiskAssessmentDTO) {
    // Actualiza en memoria con el resultado real ya calculado por el
    // backend — sin recalcular nada en el cliente y sin esperar un refetch
    // completo del proyecto para que el mapa se recoloree de inmediato.
    setRiskSummary((prev) => ({ ...prev, [treeId]: dto }));
  }

  function handleTreeUpdated(updatedTree: TreeDetailDTO) {
    setFeedbackMessage(`Árbol ${updatedTree.tree_code} actualizado.`);
    setTimeout(() => setFeedbackMessage(null), 4000);

    // Recarga el inventario real para que listado y mapa reflejen la
    // edición (p. ej. especie/dirección cambiadas) sin recargar la página.
    listProjectTrees(projectId)
      .then((inv) => setInventory(inv))
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? `Árbol actualizado, pero no se pudo recargar el inventario: ${err.message}`
            : "Árbol actualizado, pero no se pudo recargar el inventario."
        );
      });
  }

  return (
    <div className="sivu-territorial-layout">
      {/* 1. Barra Superior de Proyecto (nivel proyecto: identidad + contexto, sin duplicar el rail) */}
      <header className="sivu-territorial-topbar">
        <div className="sivu-territorial-topbar__left">
          <span className="sivu-territorial-topbar__title">Inventario territorial</span>
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
          {feedbackMessage && (
            <span style={{ fontSize: 12, color: "var(--sivu-primary)", fontWeight: 600 }}>
              ✓ {feedbackMessage}
            </span>
          )}
          <Link
            to=".."
            relative="path"
            className="btn btn-secondary"
            style={{ padding: "4px 10px", fontSize: 12, gap: 5 }}
            title="Ficha y configuración administrativa del proyecto"
          >
            <Icon name="building" size={13} />
            Ficha del Proyecto
          </Link>
          <Link
            to={projectsBasePath}
            className="btn btn-secondary"
            style={{ padding: "4px 10px", fontSize: 12, gap: 5 }}
            title="Volver a Mis proyectos"
          >
            ⇄ Cambiar proyecto
          </Link>
        </div>
      </header>

      {/* 2. Cuerpo del Workspace Territorial (Columnas Acopladas) */}
      <div className="sivu-territorial-body">
        {/* Columna 1: Resumen del inventario + Registros + Filtros + Acción */}
        <aside className="sivu-inv-panel" aria-label="Resumen y registros de inventario">
          <div className="sivu-inv-panel__header">
            <div className="sivu-inv-panel__title-box">
              <span className="sivu-inv-panel__title">Registros</span>
              <span className="sivu-inv-panel__badge">
                {filteredFeatures.length} / {inventory?.meta.total ?? 0}
              </span>
            </div>
          </div>

          {/* Tarjeta de métricas territoriales (Inspirada en City Dashboard) */}
          {inventory && (
            <div className="sivu-inv-kpi-card">
              <div className="sivu-inv-kpi-card__row">
                <span className="sivu-inv-kpi-card__label">Arbolado georreferenciado</span>
                <span className="sivu-inv-kpi-card__num">{geocodedPct}%</span>
              </div>
              <div className="sivu-inv-kpi-bar" title={`${inventory.meta.con_ubicacion} de ${inventory.meta.total} árboles en mapa`}>
                <div
                  className="sivu-inv-kpi-bar__fill"
                  style={{ width: `${geocodedPct}%` }}
                />
              </div>
              <div className="sivu-inv-kpi-chips">
                <span>
                  En mapa: <strong className="sivu-inv-kpi-chip-val">{inventory.meta.con_ubicacion}</strong>
                </span>
                {inventory.meta.sin_ubicacion > 0 ? (
                  <span style={{ color: "var(--classification-high)" }}>
                    Sin georref: <strong>{inventory.meta.sin_ubicacion}</strong>
                  </span>
                ) : (
                  <span>Sin georref: <strong>0</strong></span>
                )}
                <span>
                  Total: <strong className="sivu-inv-kpi-chip-val">{inventory.meta.total}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Composición por ciclo de vida (lectura analítica, no decorativa) */}
          {inventory && inventory.meta.total > 0 && (
            <div className="sivu-inv-composition">
              <span className="sivu-inv-composition__title">Composición del inventario</span>
              <BarRow label="Activos" value={activeCount} total={inventory.meta.total} />
              {deadCount > 0 && (
                <BarRow
                  label="Retirados"
                  value={deadCount}
                  total={inventory.meta.total}
                  tone="var(--classification-high)"
                />
              )}
              {removedCount > 0 && (
                <BarRow
                  label="Tocones"
                  value={removedCount}
                  total={inventory.meta.total}
                  tone="var(--text-faint)"
                />
              )}
            </div>
          )}

          {/* Acción principal: Alta de Árbol (solo Usuario municipal, CC-022) */}
          {canWrite && (
          <div className="sivu-inv-panel__action">
            <button
              className="sivu-inv-panel__btn-add"
              onClick={() => {
                setIsCreatingTree(true);
                setIsPickingLocation(false);
              }}
            >
              <Icon name="plus" size={14} />
              Nuevo árbol
            </button>
          </div>
          )}

          {/* Búsqueda y Filtros Rápidos */}
          <div className="sivu-inv-panel__filters">
            <div className="sivu-inv-search-wrap">
              <span className="sivu-inv-search-icon">
                <Icon name="search" size={13} />
              </span>
              <input
                type="text"
                className="sivu-inv-search-input"
                placeholder="Buscar por código, especie, calle…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="sivu-inv-search-clear"
                  onClick={() => setSearchTerm("")}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Chips de filtro rápido por ciclo de vida */}
            <div className="sivu-inv-filter-chips">
              <button
                className={`sivu-inv-chip ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                Todos ({inventory?.meta.total ?? 0})
              </button>
              <button
                className={`sivu-inv-chip ${statusFilter === "activo" ? "active" : ""}`}
                onClick={() => setStatusFilter("activo")}
              >
                Activos ({activeCount})
              </button>
              {deadCount > 0 && (
                <button
                  className={`sivu-inv-chip ${statusFilter === "retirado" ? "active" : ""}`}
                  onClick={() => setStatusFilter("retirado")}
                >
                  Retirados ({deadCount})
                </button>
              )}
              {removedCount > 0 && (
                <button
                  className={`sivu-inv-chip ${statusFilter === "tocon" ? "active" : ""}`}
                  onClick={() => setStatusFilter("tocon")}
                >
                  Tocones ({removedCount})
                </button>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                }}
              >
                Riesgo
              </label>
              <select
                className="sivu-sig-controls-select"
                style={{ width: "100%" }}
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as RiesgoFiltro | "all")}
              >
                <option value="all">Todos</option>
                <option value="sin_evaluacion">Sin evaluación ({riskCounts.sin_evaluacion})</option>
                <option value="Bajo">Bajo ({riskCounts.Bajo})</option>
                <option value="Moderado">Moderado ({riskCounts.Moderado})</option>
                <option value="Alto">Alto ({riskCounts.Alto})</option>
                <option value="Extremo">Extremo ({riskCounts.Extremo})</option>
              </select>
            </div>
          </div>

          {/* Lista Territorial de Árboles (Figma Registros del Inventario) */}
          <div className="sivu-inv-list" role="list">
            {filteredFeatures.map((f) => {
              const isSelected = f.properties.id === selectedTreeId;
              return (
                <div
                  key={f.properties.id}
                  className={`sivu-inv-tree-row ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedTreeId(f.properties.id)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedTreeId(f.properties.id);
                    }
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="sivu-inv-tree-row__code">{f.properties.tree_code}</div>
                    <div className="sivu-inv-tree-row__sp">
                      {f.properties.nombre_comun ||
                        f.properties.nombre_cientifico ||
                        "Especie no ident."}
                    </div>
                    {(f.properties.lugar_referencia || f.properties.direccion) && (
                      <div className="sivu-inv-tree-row__ref">
                        {f.properties.lugar_referencia || f.properties.direccion}
                      </div>
                    )}
                  </div>
                  {(() => {
                    const riesgo = riskByTreeId[f.properties.id];
                    if (riesgo) return <ClassificationBadge level={riesgo} className="risk-list-badge" />;
                    if (riesgo === null)
                      return (
                        <span className="status-pill" style={{ fontSize: 10, padding: "1px 6px" }}>
                          No determinado
                        </span>
                      );
                    return (
                      <span className="status-pill" style={{ fontSize: 10, padding: "1px 6px" }}>
                        Sin evaluación
                      </span>
                    );
                  })()}
                </div>
              );
            })}

            {filteredFeatures.length === 0 && !loading && (
              <div
                style={{
                  padding: "24px 14px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  textAlign: "center",
                }}
              >
                No se encontraron árboles con los filtros aplicados.
              </div>
            )}
          </div>
        </aside>

        {/* Columna 2: Mapa integrado — panel propio, no un visor GIS a sangre */}
        <main className="sivu-map-pane">
          <div className="sivu-map-pane__header">
            <span className="sivu-map-pane__header-label">
              <span className="sivu-map-pane__header-dot" />
              Arbolado urbano · WGS84
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {filteredFeatures.length} visibles
            </span>
          </div>

          <div className="sivu-map-pane__canvas">
            {/* Banner flotante de captura interactiva de coordenadas */}
            {isPickingLocation && (
              <div className="sivu-sig-pick-banner" role="alert">
                <span>📍 Haz clic en cualquier punto del mapa para fijar la ubicación del árbol (WGS84)</span>
                <button
                  className="btn btn-secondary"
                  style={{
                    background: "#ffffff",
                    color: "var(--sivu-primary-dark)",
                    padding: "3px 8px",
                    fontSize: 11.5,
                  }}
                  onClick={() => {
                    setIsPickingLocation(false);
                    setIsCreatingTree(true);
                  }}
                >
                  Cancelar captura
                </button>
              </div>
            )}

            {loading && (
              <div style={{ padding: 24, color: "var(--text-secondary)" }}>
                Cargando mapa territorial…
              </div>
            )}

            {!loading && error && (
              <div className="card card--pad" style={{ margin: 20 }}>
                <p style={{ color: "var(--classification-critical)" }}>
                  <Icon name="alert" size={14} /> {error}
                </p>
              </div>
            )}

            {!loading && !error && (
              apiKey ? (
                <Suspense
                  fallback={
                    <div style={{ padding: 24, color: "var(--text-secondary)" }}>
                      Cargando visor ArcGIS…
                    </div>
                  }
                >
                  <InventoryMapView
                    key={projectId}
                    apiKey={apiKey}
                    features={filteredFeatures}
                    selectedTreeId={selectedTreeId}
                    onSelectTree={(id) => setSelectedTreeId(id)}
                    isPickingLocation={isPickingLocation}
                    pickedLocation={pickedLocation}
                    onPickLocation={handleLocationPicked}
                    riskByTreeId={riskByTreeId}
                    showLegend
                  />
                </Suspense>
              ) : (
                <MapPlaceholder
                  title="Visor SIG no disponible"
                  note="Falta configurar VITE_ARCGIS_API_KEY en el archivo .env del frontend."
                />
              )
            )}
          </div>
        </main>

        {/* Columna 3: Contexto — ficha del árbol seleccionado, o resumen analítico del territorio */}
        {selectedFeature ? (
          <TreeContextualPanel
            treeFeature={selectedFeature}
            onClose={() => setSelectedTreeId(null)}
            onViewFullDetail={(treeId) => setInspectingTreeId(treeId)}
            onTreeUpdated={handleTreeUpdated}
            onRiskAssessmentCreated={handleRiskAssessmentCreated}
            summaryAssessment={riskSummary[selectedFeature.properties.id]}
            docked={true}
          />
        ) : (
          <aside className="sivu-detail-dock" aria-label="Resumen analítico del territorio">
            <header className="sivu-detail-dock__header">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sivu-primary-dark)" }}>
                  Resumen analítico
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                  Selecciona un árbol en el mapa o en los registros para ver su ficha
                </div>
              </div>
            </header>

            <div className="sivu-detail-dock__body">
              {loading && (
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cargando territorio…</p>
              )}

              {!loading && inventory && inventory.meta.total === 0 && (
                <div className="empty-state" style={{ padding: "36px 12px" }}>
                  <div className="empty-state__icon">
                    <Icon name="leaf" size={22} />
                  </div>
                  <h3>Sin árboles registrados</h3>
                  <p>
                    Este proyecto todavía no tiene árboles en el inventario. Usa “Nuevo árbol” para
                    comenzar el levantamiento territorial.
                  </p>
                </div>
              )}

              {!loading && inventory && inventory.meta.total > 0 && (
                <div>
                  <span className="sivu-idle-section__title">Distribución por riesgo</span>
                  <RiskDistribution
                    counts={countRisks(riskByTreeId, inventory.meta.total)}
                    total={inventory.meta.total}
                  />
                </div>
              )}

              {!loading && speciesBreakdown.length > 0 && (
                <div>
                  <span className="sivu-idle-section__title">Especies más registradas</span>
                  {speciesBreakdown.map(([name, count]) => (
                    <BarRow
                      key={name}
                      label={name}
                      value={count}
                      total={inventory?.meta.total ?? count}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Modales Técnicos */}
      {/* Modal Ficha Completa */}
      {inspectingTreeId && (
        <TreeDetailModal
          treeId={inspectingTreeId}
          onClose={() => setInspectingTreeId(null)}
          onTreeUpdated={handleTreeUpdated}
          onRiskAssessmentCreated={handleRiskAssessmentCreated}
        />
      )}

      {/* Modal Alta Unificada (+ Nuevo Árbol). Se mantiene MONTADO mientras se
          captura la ubicación en el mapa (solo se oculta) para no perder los
          demás campos ya completados por el usuario — antes se desmontaba y
          el formulario volvía en blanco al reabrirse. */}
      {(isCreatingTree || isPickingLocation) && (
        <CreateTreeModal
          projectId={projectId}
          pickedLocation={pickedLocation}
          hidden={isPickingLocation}
          onStartPickingLocation={handleStartPickingLocation}
          onClose={() => {
            setIsCreatingTree(false);
            setIsPickingLocation(false);
          }}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
