import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import { getArcgisApiKey } from "../lib/arcgis";
import { Icon } from "./Icons";
import type { MapPoint } from "./ProjectMapView";

const ProjectMapView = lazy(() => import("./ProjectMapView"));

/**
 * Estructura común de los módulos con mapa protagonista (Fase 7;
 * maqueta SIVU Lab, pantallas Riesgo Arbóreo e Infraestructura, CC-057):
 * mapa a pantalla completa bajo la barra, encabezado flotante con el
 * módulo y el lugar, y una tarjeta flotante con el resumen del módulo
 * (`card`). Solo consulta: las acciones de registro no viven aquí
 * (CC-059, punto 6; CC-061).
 */
export function TerritorialModule({
  moduleLabel,
  card,
  points,
  selectedId,
  onSelect,
}: {
  moduleLabel: string;
  card: ReactNode;
  /** Puntos del mapa (árboles de la API), si el módulo los tiene. */
  points?: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { projectId = "" } = useParams();
  const apiKey = getArcgisApiKey();
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectWithSector(projectId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el proyecto.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="sivu-terr">
      {apiKey ? (
        <Suspense fallback={<div className="sivu-terr__map sivu-terr__map--loading">Cargando mapa…</div>}>
          <ProjectMapView
            apiKey={apiKey}
            points={points}
            selectedId={selectedId}
            onSelect={onSelect}
            sector={detail?.sector?.geometria_sector ?? null}
          />
        </Suspense>
      ) : (
        <div className="sivu-terr__map sivu-terr__map--loading">
          El mapa no está configurado en este entorno (falta la clave de ArcGIS).
        </div>
      )}

      <div className="sivu-terr__overlay">
        <header className="sivu-terr__place">
          <span className="sivu-terr__chip">Territorio · {moduleLabel}</span>
          <h1 className="sivu-terr__title">{detail?.sector?.nombre_sector ?? detail?.proyecto.nombre_proyecto ?? "…"}</h1>
          <p className="sivu-terr__meta">
            {error ? (
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {error}
              </span>
            ) : (
              detail?.proyecto.nombre_proyecto ?? "Cargando proyecto…"
            )}
          </p>
        </header>
        {!error && <section className="sivu-terr__card">{card}</section>}
      </div>
    </div>
  );
}
