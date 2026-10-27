import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import BasemapStyle from "@arcgis/core/support/BasemapStyle";
import MapView from "@arcgis/core/views/MapView";
import "@arcgis/core/assets/esri/themes/light/main.css";
import {
  DEFAULT_MAP_VIEW,
  basemapStyle,
  getPreferredBasemap,
  savePreferredBasemap,
  type BasemapId,
} from "../lib/arcgis";
import { BasemapSwitcher } from "./BasemapSwitcher";

function makeBasemap(id: BasemapId): Basemap {
  return new Basemap({ style: new BasemapStyle({ id: basemapStyle(id) }) });
}

/**
 * Mapa a pantalla completa de los módulos territoriales (Fase 7; CC-057,
 * maqueta: mapa protagonista). Por ahora solo el fondo con su selector de
 * capas: los árboles (B1) y el contorno del sector (B13) se agregarán
 * cuando la API los entregue. Encuadre visual por defecto de Valparaíso
 * (no es una coordenada del proyecto). ArcGIS solo representa (ADR-015).
 */
export default function ProjectMapView({ apiKey }: { apiKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ArcGISMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [basemap, setBasemap] = useState<BasemapId>(getPreferredBasemap);
  const initialBasemap = useRef(basemap);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    esriConfig.apiKey = apiKey;
    const map = new ArcGISMap({ basemap: makeBasemap(initialBasemap.current) });
    mapRef.current = map;
    const view = new MapView({
      container: containerRef.current,
      map,
      center: DEFAULT_MAP_VIEW.center,
      zoom: 15,
      ui: { components: ["zoom"] },
    });
    // Arriba a la izquierda van el encabezado y la tarjeta flotantes: el zoom baja.
    view.ui.move("zoom", "bottom-left");
    view.when(
      () => {
        if (!cancelled) setStatus("ready");
      },
      () => {
        if (!cancelled) setStatus("error");
      }
    );
    return () => {
      cancelled = true;
      view.destroy();
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || status !== "ready") return;
    mapRef.current.basemap = makeBasemap(basemap);
  }, [basemap, status]);

  return (
    <div className="sivu-terr__map">
      <div ref={containerRef} className="sivu-terr__map-canvas" />
      {status === "ready" && (
        <BasemapSwitcher
          value={basemap}
          onChange={(id) => {
            setBasemap(id);
            savePreferredBasemap(id);
          }}
        />
      )}
      {status === "error" && <p className="sivu-terr__map-error">No se pudo cargar el mapa base.</p>}
    </div>
  );
}
