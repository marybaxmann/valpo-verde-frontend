import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProject } from "../api/projects";
import { listProjectTrees } from "../api/trees";
import type { Project } from "../types/project";
import type { TreeInventory } from "../types/tree";
import { getArcgisApiKey } from "../lib/arcgis";
import { Icon } from "../components/Icons";
import { MapPlaceholder } from "../components/MapPlaceholder";

/** El SDK de ArcGIS solo se descarga al montar el mapa. */
const InventoryMapView = lazy(() => import("../components/InventoryMapView"));

/**
 * SIG-1 — Mapa de inventario de árboles por proyecto (ADR-015, PR-015 v2.0).
 * Ruta compartida /admin|/usuario/projects/:projectId/mapa. El backend
 * decide el acceso: un 403/404 se muestra tal cual.
 *
 * Solo lectura: no hay edición, filtros ni capas temáticas en esta fase.
 */
export default function ProjectInventoryMap() {
  const { projectId = "" } = useParams();
  const apiKey = getArcgisApiKey();
  const [project, setProject] = useState<Project | null>(null);
  const [inventory, setInventory] = useState<TreeInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProject(null);
    setInventory(null);

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

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div>
      <Link to=".." relative="path" className="btn btn-secondary" style={{ marginBottom: 14 }}>
        ← Volver al proyecto
      </Link>

      {loading && <p style={{ color: "var(--text-muted)" }}>Cargando inventario…</p>}

      {!loading && error && (
        <div className="card card--pad">
          <p style={{ color: "var(--red-500)" }}>
            <Icon name="alert" size={12} /> {error}
          </p>
        </div>
      )}

      {!loading && !error && project && inventory && (
        <>
          <div className="page-header">
            <div>
              <h1>Mapa de inventario</h1>
              <p className="page-header__sub">{project.name}</p>
            </div>
          </div>

          <InventoryNotices meta={inventory.meta} />

          {apiKey ? (
            <Suspense fallback={<p style={{ color: "var(--text-muted)" }}>Cargando mapa…</p>}>
              <InventoryMapView apiKey={apiKey} features={inventory.data.features} />
            </Suspense>
          ) : (
            <MapPlaceholder
              title="Mapa no disponible"
              note="Falta configurar VITE_ARCGIS_API_KEY en el archivo .env del frontend (ver .env.example)."
            />
          )}
        </>
      )}
    </div>
  );
}

function InventoryNotices({ meta }: { meta: TreeInventory["meta"] }) {
  if (meta.total === 0) {
    return (
      <p className="inventory-notice">
        Este proyecto no tiene árboles registrados. El mapa muestra una vista general de Valparaíso.
      </p>
    );
  }
  return (
    <p className="inventory-notice">
      {meta.con_ubicacion} de {meta.total} árboles con ubicación.
      {meta.sin_ubicacion > 0 && (
        <strong> {meta.sin_ubicacion} sin ubicación: no aparecen en el mapa.</strong>
      )}
    </p>
  );
}
