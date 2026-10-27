import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import BasemapStyle from "@arcgis/core/support/BasemapStyle";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
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

/** Punto a dibujar (WGS84, como lo entrega la API). */
export interface MapPoint {
  id: string;
  lng: number;
  lat: number;
  /** Texto del punto (por ejemplo, el código del árbol o de la OT). */
  title: string;
}

/**
 * Mapa ArcGIS de los módulos (Fase 7; CC-057): fondo con selector de capas
 * y, si se entregan, puntos que vienen de la API (por ejemplo, los árboles
 * de las OT de B3). Con puntos, el mapa se centra en ellos; sin puntos usa
 * el encuadre visual por defecto de Valparaíso (no es una coordenada del
 * proyecto). ArcGIS solo representa: nunca se escribe en ArcGIS (ADR-015).
 */
export default function ProjectMapView({
  apiKey,
  points,
  selectedId = null,
  onSelect,
  className = "sivu-terr__map",
}: {
  apiKey: string;
  points?: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ArcGISMap | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const layerRef = useRef<GraphicsLayer | null>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [basemap, setBasemap] = useState<BasemapId>(getPreferredBasemap);
  const initialBasemap = useRef(basemap);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    esriConfig.apiKey = apiKey;
    const layer = new GraphicsLayer();
    const map = new ArcGISMap({ basemap: makeBasemap(initialBasemap.current), layers: [layer] });
    mapRef.current = map;
    layerRef.current = layer;
    const view = new MapView({
      container: containerRef.current,
      map,
      center: DEFAULT_MAP_VIEW.center,
      zoom: 15,
      ui: { components: ["zoom"] },
    });
    viewRef.current = view;
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
    const handle = view.on("click", (event) => {
      view.hitTest(event, { include: [layer] }).then((res) => {
        const hit = res.results.find((r) => r.type === "graphic");
        const id = hit && hit.type === "graphic" ? (hit.graphic.attributes?.id as string | undefined) : undefined;
        if (id) onSelectRef.current?.(id);
      });
    });
    return () => {
      cancelled = true;
      handle.remove();
      view.destroy();
      mapRef.current = null;
      viewRef.current = null;
      layerRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || status !== "ready") return;
    mapRef.current.basemap = makeBasemap(basemap);
  }, [basemap, status]);

  // Puntos de la API: se redibujan al cambiar los datos o la selección.
  const pointsKey = (points ?? []).map((p) => `${p.id}:${p.lng}:${p.lat}`).join("|");
  useEffect(() => {
    const layer = layerRef.current;
    const view = viewRef.current;
    if (!layer || !view || status !== "ready") return;
    layer.removeAll();
    const list = points ?? [];
    for (const p of list) {
      const selected = p.id === selectedId;
      layer.add(
        new Graphic({
          geometry: new Point({ longitude: p.lng, latitude: p.lat }),
          attributes: { id: p.id },
          symbol: {
            type: "simple-marker",
            style: "circle",
            size: selected ? 16 : 11,
            color: selected ? [244, 248, 243, 1] : [168, 230, 195, 0.95],
            outline: { color: selected ? [72, 86, 53, 1] : [20, 30, 15, 0.9], width: selected ? 3 : 1.5 },
          },
        })
      );
    }
    // Solo se reencuadra cuando cambian los puntos, no al seleccionar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, selectedId, status]);

  useEffect(() => {
    const view = viewRef.current;
    const layer = layerRef.current;
    if (!view || !layer || status !== "ready" || !(points ?? []).length) return;
    view.goTo(layer.graphics.toArray(), { animate: false }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, status]);

  return (
    <div className={className}>
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
