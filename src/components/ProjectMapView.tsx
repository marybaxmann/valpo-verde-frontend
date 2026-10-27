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
  /**
   * Tono de la clasificación que entregó el backend (paleta oficial de
   * PR-016, tokens `--classification-*`); `neutral` = sin evaluación.
   */
  tone?: "critical" | "high" | "medium" | "low" | "neutral";
}

/** `#rrggbb` con transparencia, para el halo del pin. */
function conAlfa(hex: string, alfa: number): number[] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [167, 176, 171, alfa];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), alfa];
}

/** Color del token de la paleta, leído del CSS para respetar el tema. */
function colorDeTono(tone: NonNullable<MapPoint["tone"]>): string {
  if (tone === "neutral") return "#A7B0AB";
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--classification-${tone}`).trim();
  return v || "#A7B0AB";
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
  const pointsKey = (points ?? []).map((p) => `${p.id}:${p.lng}:${p.lat}:${p.tone ?? ""}`).join("|");
  useEffect(() => {
    const layer = layerRef.current;
    const view = viewRef.current;
    if (!layer || !view || status !== "ready") return;
    layer.removeAll();
    const list = points ?? [];
    for (const p of list) {
      const selected = p.id === selectedId;
      const geometry = new Point({ longitude: p.lng, latitude: p.lat });
      const attributes = { id: p.id };
      // «Sin evaluación»: punto blanco pequeño, discreto; los árboles con
      // clasificación destacan con su color, borde blanco y halo (pedido de la
      // autora, 2026-10-27).
      if (p.tone === "neutral") {
        layer.add(
          new Graphic({
            geometry,
            attributes,
            symbol: {
              type: "simple-marker",
              style: "circle",
              size: selected ? 14 : 9,
              color: [255, 255, 255, 0.95],
              outline: { color: selected ? [31, 122, 85, 1] : [40, 52, 32, 0.85], width: selected ? 3 : 1.5 },
            },
          })
        );
        continue;
      }
      const color = p.tone ? colorDeTono(p.tone) : "#3fb07e";
      const base = p.tone ? 16 : 11;
      layer.add(
        new Graphic({
          geometry,
          attributes,
          symbol: {
            type: "simple-marker",
            style: "circle",
            size: base + (selected ? 18 : 12),
            color: conAlfa(color, selected ? 0.45 : 0.32),
            outline: { color: [0, 0, 0, 0], width: 0 },
          },
        })
      );
      layer.add(
        new Graphic({
          geometry,
          attributes,
          symbol: {
            type: "simple-marker",
            style: "circle",
            size: base + (selected ? 4 : 0),
            color,
            outline: { color: selected ? [31, 122, 85, 1] : [255, 255, 255, 1], width: selected ? 3 : 2.5 },
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
