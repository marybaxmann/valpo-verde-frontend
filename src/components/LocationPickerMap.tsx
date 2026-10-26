import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import BasemapStyle from "@arcgis/core/support/BasemapStyle";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as projectOperator from "@arcgis/core/geometry/operators/projectOperator";
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

/** UTM zona 19 sur, datum WGS84 (D-9 a D-12; ADR-010 v3.0). */
const UTM_19S = new SpatialReference({ wkid: 32719 });

export interface UtmPoint {
  este: number;
  norte: number;
}

/**
 * Mapa del formulario de alta (ADR-010 v3.0): al marcar un punto, la
 * plataforma convierte la posición de EPSG:4326 a EPSG:32719 y entrega
 * UTM Este/Norte para rellenar el formulario. Es solo una ayuda: lo que se
 * guarda son las coordenadas UTM del formulario, que siguen editables
 * (CC-032). Si el formulario tiene coordenadas válidas, el marcador se
 * ubica en ellas (conversión inversa, solo para mostrar).
 * ArcGIS solo representa: nunca se escribe en ArcGIS (ADR-015).
 */
export default function LocationPickerMap({
  apiKey,
  value,
  onPick,
}: {
  apiKey: string;
  value: UtmPoint | null;
  onPick: (utm: UtmPoint) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const mapRef = useRef<ArcGISMap | null>(null);
  const onPickRef = useRef(onPick);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [basemap, setBasemap] = useState<BasemapId>(getPreferredBasemap);
  // Capa con la que se crea el mapa; los cambios posteriores los aplica el efecto de abajo.
  const initialBasemap = useRef(basemap);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

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
      // La atribución del proveedor la muestra el SDK siempre (PR-016: cartografía).
      ui: { components: ["zoom"] },
    });
    viewRef.current = view;

    Promise.all([view.when(), projectOperator.isLoaded() ? Promise.resolve() : projectOperator.load()])
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    const handle = view.on("click", (event) => {
      const utm = projectOperator.execute(event.mapPoint, UTM_19S) as Point | null | undefined;
      if (!utm) return;
      // Centímetros: precisión de sobra para un punto marcado a mano.
      onPickRef.current({ este: Math.round(utm.x * 100) / 100, norte: Math.round(utm.y * 100) / 100 });
    });

    return () => {
      cancelled = true;
      handle.remove();
      view.destroy();
      viewRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey]);

  // Cambio de capa base: solo el fondo, sin recrear el mapa ni el marcador.
  useEffect(() => {
    if (!mapRef.current || status !== "ready") return;
    mapRef.current.basemap = makeBasemap(basemap);
  }, [basemap, status]);

  // Marcador en las coordenadas del formulario.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || status !== "ready") return;
    view.graphics.removeAll();
    if (!value) return;
    const geographic = projectOperator.execute(
      new Point({ x: value.este, y: value.norte, spatialReference: UTM_19S }),
      SpatialReference.WGS84
    ) as Point | null | undefined;
    if (!geographic) return;
    view.graphics.add(
      new Graphic({
        geometry: geographic,
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: 14,
          color: [72, 86, 53, 0.9],
          outline: { color: [255, 255, 255, 1], width: 2 },
        },
      })
    );
  }, [value, status]);

  return (
    <div className="sivu-picker">
      <div ref={containerRef} className="sivu-picker__map" />
      {status === "ready" && (
        <BasemapSwitcher
          value={basemap}
          onChange={(id) => {
            setBasemap(id);
            savePreferredBasemap(id);
          }}
        />
      )}
      {status === "loading" && <p className="sivu-picker__state">Cargando mapa…</p>}
      {status === "error" && (
        <p className="sivu-picker__state sivu-picker__state--error">
          No se pudo cargar el mapa. Ingresa las coordenadas UTM a mano.
        </p>
      )}
    </div>
  );
}
