import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProject } from "../api/projects";
import { listProjectTrees } from "../api/trees";
import { getProjectRiskSummary } from "../api/treeRiskAssessments";
import { INCIDENT_FINAL, MAINTENANCE_FINAL, listProjectIncidents, listProjectInfrastructureAssessments, listProjectMaintenance } from "../api/moduleRecords";
import type { Project } from "../types/project";
import type { TreeInventory } from "../types/tree";
import type { TreeRiskAssessmentDTO } from "../types/treeRisk";
import { getArcgisApiKey } from "../lib/arcgis";
import { Icon, type IconName } from "../components/Icons";
import { MapPlaceholder } from "../components/MapPlaceholder";
import { StatCard, StatGrid } from "../components/StatCard";
import { BarRow } from "../components/BarRow";
import { RiskDistribution, countRisks } from "../components/RiskDistribution";

const InventoryMapView = lazy(() => import("../components/InventoryMapView"));

/**
 * Dashboard territorial del proyecto: entrada al sistema.
 *
 * Sintetiza Inventario (GET /api/projects/:id/trees) e Inspección y Riesgo
 * (GET /api/projects/:id/risk-assessments/latest) con datos reales. Los
 * módulos sin backend todavía (Infraestructura, Mantención, Incidencias)
 * aparecen solo como accesos, sin cifras.
 */
export default function ProjectDashboard() {
  const { projectId = "" } = useParams();
  const apiKey = getArcgisApiKey();

  const [project, setProject] = useState<Project | null>(null);
  const [inventory, setInventory] = useState<TreeInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskSummary, setRiskSummary] = useState<Record<string, TreeRiskAssessmentDTO>>({});
  // Conteos reales de los módulos (null = no disponible → sin número).
  const [moduleCounts, setModuleCounts] = useState<{
    infraEval: number | null;
    infraTrees: number | null;
    ordenes: number | null;
    ordenesActivas: number | null;
    incidencias: number | null;
    incidenciasAbiertas: number | null;
  }>({ infraEval: null, infraTrees: null, ordenes: null, ordenesActivas: null, incidencias: null, incidenciasAbiertas: null });

  useEffect(() => {
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
        setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
        setLoading(false);
      });

    getProjectRiskSummary(projectId)
      .then((res) => {
        if (cancelled) return;
        setRiskSummary(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setRiskSummary({});
      });

    listProjectInfrastructureAssessments(projectId)
      .then((r) => {
        if (!cancelled)
          setModuleCounts((p) => ({ ...p, infraEval: r.data.length, infraTrees: new Set(r.data.map((a) => a.tree_id)).size }));
      })
      .catch(() => undefined);
    listProjectMaintenance(projectId)
      .then(
        (r) =>
          !cancelled &&
          setModuleCounts((p) => ({
            ...p,
            ordenes: r.data.length,
            ordenesActivas: r.data.filter((o) => !MAINTENANCE_FINAL.includes(o.estado)).length,
          }))
      )
      .catch(() => undefined);
    listProjectIncidents(projectId)
      .then(
        (r) =>
          !cancelled &&
          setModuleCounts((p) => ({
            ...p,
            incidencias: r.data.length,
            incidenciasAbiertas: r.data.filter((i) => !INCIDENT_FINAL.includes(i.estado)).length,
          }))
      )
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

  const geocodedPct = useMemo(() => {
    if (!inventory || inventory.meta.total === 0) return 0;
    return Math.round((inventory.meta.con_ubicacion / inventory.meta.total) * 100);
  }, [inventory]);

  const riskByTreeId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const [treeId, dto] of Object.entries(riskSummary)) {
      map[treeId] = dto.resultado.clasificacion_riesgo;
    }
    return map;
  }, [riskSummary]);

  // Indicadores de riesgo: solo lo que ya persistió el backend, nunca
  // cifras inventadas para completar la fila de tarjetas.
  const riskStats = useMemo(() => {
    const evaluados = Object.keys(riskSummary).length;
    const counts = { Bajo: 0, Moderado: 0, Alto: 0, Extremo: 0 };
    for (const dto of Object.values(riskSummary)) {
      const r = dto.resultado.clasificacion_riesgo;
      if (r === "Bajo" || r === "Moderado" || r === "Alto" || r === "Extremo") counts[r]++;
    }
    const total = inventory?.data?.features.length ?? 0;
    return { evaluados, sinEvaluar: Math.max(0, total - evaluados), ...counts };
  }, [riskSummary, inventory]);

  if (loading) {
    return <p style={{ color: "var(--text-muted)" }}>Cargando dashboard…</p>;
  }

  if (error) {
    return (
      <div className="card card--pad">
        <p style={{ color: "var(--classification-critical)" }}>
          <Icon name="alert" size={14} /> {error}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard territorial</h1>
          <p className="page-header__sub">
            {project ? `${project.name} · ${project.institution_name}` : "Cargando proyecto…"}
          </p>
        </div>
        <Link to="../mapa" relative="path" className="btn btn-primary">
          <Icon name="leaf" size={15} />
          Ir al Inventario
        </Link>
      </div>

      <StatGrid>
        <StatCard label="Árboles registrados" value={inventory?.meta.total ?? 0} />
        <StatCard
          label="Georreferenciados"
          value={`${geocodedPct}%`}
          foot={inventory ? `${inventory.meta.con_ubicacion} de ${inventory.meta.total}` : undefined}
        />
        <StatCard label="Activos" value={activeCount} />
        <StatCard
          label="Sin georreferenciar"
          value={inventory?.meta.sin_ubicacion ?? 0}
        />
      </StatGrid>

      <StatGrid>
        <StatCard label="Árboles evaluados" value={riskStats.evaluados} />
        <StatCard label="Sin evaluación" value={riskStats.sinEvaluar} />
        <StatCard label="Riesgo bajo" value={riskStats.Bajo} />
        <StatCard label="Riesgo moderado" value={riskStats.Moderado} />
        <StatCard label="Riesgo alto" value={riskStats.Alto} />
        <StatCard label="Riesgo extremo" value={riskStats.Extremo} />
      </StatGrid>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          marginBottom: 16,
          alignItems: "start",
        }}
      >
        {/* Mapa territorial del proyecto — siempre muestra el territorio real
            (Valparaíso por defecto), incluso con 0 árboles; nunca se
            reemplaza por una cuadrícula genérica mientras haya API key. */}
        <div className="card" style={{ overflow: "hidden", height: 380, position: "relative" }}>
          {apiKey ? (
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
                features={inventory?.data.features ?? []}
                riskByTreeId={riskByTreeId}
                showLegend
              />
            </Suspense>
          ) : (
            <MapPlaceholder
              title="Visor SIG no disponible"
              note="Falta configurar VITE_ARCGIS_API_KEY en el archivo .env del frontend."
            />
          )}

          {apiKey && inventory && inventory.meta.total === 0 && (
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                zIndex: 10,
                background: "rgba(255,255,255,0.94)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Sin árboles registrados todavía
            </div>
          )}
        </div>

        {/* Composición del inventario */}
        <div className="card card--pad">
          <h3 style={{ fontSize: 13, marginBottom: 12 }}>Composición del inventario</h3>
          {inventory && inventory.meta.total > 0 ? (
            <>
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
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              Sin árboles registrados todavía.
            </p>
          )}

          <h3 style={{ fontSize: 13, margin: "18px 0 12px" }}>Distribución por riesgo</h3>
          {inventory && inventory.meta.total > 0 ? (
            <RiskDistribution counts={countRisks(riskByTreeId, inventory.meta.total)} total={inventory.meta.total} />
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Sin árboles registrados todavía.</p>
          )}
          <Link
            to="../inspeccion"
            relative="path"
            className="btn btn-secondary"
            style={{ width: "100%", justifyContent: "center", marginTop: 14, fontSize: 12 }}
          >
            Ir a Inspección y Riesgo
          </Link>
        </div>
      </div>

      {/* Accesos a los módulos de SIVU. Solo Inventario e Inspección tienen
          cifras reales; el resto se presenta como acceso, sin números. */}
      <h3 style={{ fontSize: 13, marginBottom: 10, color: "var(--text-secondary)" }}>
        Módulos de SIVU
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        <ModuleSummaryCard
          icon="leaf"
          title="Inventario"
          note={`${inventory?.meta.total ?? 0} árbol(es) registrados · ${inventory?.meta.con_ubicacion ?? 0} en mapa.`}
          to="../mapa"
        />
        <ModuleSummaryCard
          icon="check-square"
          title="Inspección y Riesgo"
          note={`${riskStats.evaluados} árbol(es) evaluados · ${riskStats.sinEvaluar} sin evaluación.`}
          to="../inspeccion"
        />
        <ModuleSummaryCard
          icon="building"
          title="Infraestructura"
          note={
            moduleCounts.infraEval !== null
              ? `${moduleCounts.infraEval} evaluación(es) registradas · ${moduleCounts.infraTrees} árbol(es) evaluados.`
              : "Interacción entre el arbolado y la infraestructura urbana."
          }
          to="../infraestructura"
        />
        <ModuleSummaryCard
          icon="wrench"
          title="Mantención"
          note={
            moduleCounts.ordenes !== null
              ? `${moduleCounts.ordenesActivas} orden(es) activa(s) · ${moduleCounts.ordenes} registrada(s).`
              : "Intervenciones y órdenes de trabajo sobre el arbolado."
          }
          to="../mantencion"
        />
        <ModuleSummaryCard
          icon="alert"
          title="Incidencias"
          note={
            moduleCounts.incidencias !== null
              ? `${moduleCounts.incidenciasAbiertas} incidencia(s) abierta(s) · ${moduleCounts.incidencias} registrada(s).`
              : "Reportes, revisión y seguimiento de casos."
          }
          to="../incidencias"
        />
        <ModuleSummaryCard
          icon="sort"
          title="Índices"
          note="Análisis del arbolado e indicadores territoriales."
          to="../indices"
        />
      </div>
    </div>
  );
}

function ModuleSummaryCard({
  icon,
  title,
  note,
  to,
}: {
  icon: IconName;
  title: string;
  note: string;
  to: string;
}) {
  return (
    <Link to={to} relative="path" className="card card--pad sivu-module-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="sivu-module-card__icon">
          <Icon name={icon} size={15} />
        </span>
        <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>{title}</strong>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: 0 }}>{note}</p>
      <span className="sivu-module-card__cta">Ver módulo →</span>
    </Link>
  );
}
