import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import BasemapStyle from "@arcgis/core/support/BasemapStyle";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Polygon from "@arcgis/core/geometry/Polygon";
import type { SectorGeoJson } from "../types/project";
import Point from "@arcgis/core/geometry/Point";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
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
  /** Nombre que acompaña al código en la etiqueta del seleccionado (p. ej. el nombre común). */
  label?: string;
  /** Dato del módulo en la etiqueta del seleccionado (p. ej. el nivel de riesgo). */
  detail?: string;
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
  sector = null,
  padding,
}: {
  apiKey: string;
  points?: MapPoint[];
  /** Contorno del sector del proyecto (B13): se dibuja debajo de los puntos y encuadra el mapa. */
  sector?: SectorGeoJson | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  /** Espacio que tapan las tarjetas flotantes (px): el encuadre deja los árboles a la vista. */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ArcGISMap | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const layerRef = useRef<GraphicsLayer | null>(null);
  const sectorLayerRef = useRef<GraphicsLayer | null>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [basemap, setBasemap] = useState<BasemapId>(getPreferredBasemap);
  // Posición en pantalla del punto seleccionado, para el halo y la etiqueta (maqueta: .halo, .callout).
  const [marca, setMarca] = useState<{ x: number; y: number } | null>(null);
  const initialBasemap = useRef(basemap);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    esriConfig.apiKey = apiKey;
    const layer = new GraphicsLayer();
    const sectorLayer = new GraphicsLayer();
    const map = new ArcGISMap({ basemap: makeBasemap(initialBasemap.current), layers: [sectorLayer, layer] });
    mapRef.current = map;
    layerRef.current = layer;
    sectorLayerRef.current = sectorLayer;
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
      sectorLayerRef.current = null;
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

  // Contorno del sector (B13): solo se representa; nunca se edita en el mapa (ADR-015).
  const sectorKey = sector ? JSON.stringify(sector.coordinates).length + ":" + sector.type : "";
  useEffect(() => {
    const sectorLayer = sectorLayerRef.current;
    if (!sectorLayer || status !== "ready") return;
    sectorLayer.removeAll();
    if (!sector) return;
    const poligonos = sector.type === "Polygon" ? [sector.coordinates as number[][][]] : (sector.coordinates as number[][][][]);
    const rings = poligonos.flat();
    if (!rings.length) return;
    sectorLayer.add(
      new Graphic({
        geometry: new Polygon({ rings, spatialReference: { wkid: 4326 } }),
        symbol: {
          type: "simple-fill",
          color: [63, 176, 126, 0.08],
          outline: { color: [31, 122, 85, 0.95], width: 2, style: "dash" },
        },
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectorKey, status]);

  const paddingKey = JSON.stringify(padding ?? {});
  useEffect(() => {
    const view = viewRef.current;
    if (!view || status !== "ready") return;
    view.padding = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddingKey, status]);

  // Encuadre: el sector y los puntos juntos; sin ninguno, el encuadre por defecto.
  useEffect(() => {
    const view = viewRef.current;
    const layer = layerRef.current;
    const sectorLayer = sectorLayerRef.current;
    if (!view || !layer || !sectorLayer || status !== "ready") return;
    view.padding = { top: 0, right: 0, bottom: 0, left: 0, ...padding };
    const objetivo = [...sectorLayer.graphics.toArray(), ...layer.graphics.toArray()];
    if (!objetivo.length) return;
    view.goTo(objetivo, { animate: false }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, sectorKey, status]);

  const seleccionado = (points ?? []).find((p) => p.id === selectedId) ?? null;
  useEffect(() => {
    const view = viewRef.current;
    if (!view || status !== "ready" || !seleccionado) {
      setMarca(null);
      return;
    }
    const punto = new Point({ longitude: seleccionado.lng, latitude: seleccionado.lat });
    const ubicar = () => {
      const sp = view.toScreen(punto);
      setMarca(sp ? { x: sp.x, y: sp.y } : null);
    };
    ubicar();
    // Si el árbol elegido queda cerca de un borde, su etiqueta se cortaría: se centra.
    const sp = view.toScreen(punto);
    const margen = 140;
    if (sp && (sp.x < margen || sp.x > view.width - margen || sp.y < margen || sp.y > view.height - 40)) {
      view.goTo({ center: punto }, { duration: 400 }).catch(() => undefined);
    }
    const h = reactiveUtils.watch(() => [view.extent, view.width, view.height], ubicar);
    return () => h.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado?.id, seleccionado?.lng, seleccionado?.lat, status]);
  const colorSel = seleccionado?.tone ? colorDeTono(seleccionado.tone) : "#3fb07e";

  return (
    <div className={className}>
      <div ref={containerRef} className="sivu-terr__map-canvas" />
      {seleccionado && marca && (
        <>
          <div className="sivu-halo" style={{ left: marca.x, top: marca.y, ["--c" as string]: colorSel }} aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="sivu-callout" style={{ left: marca.x, top: marca.y }}>
            <span className="sivu-callout__code">{seleccionado.title}</span>
            {seleccionado.label && <strong>{seleccionado.label}</strong>}
            {seleccionado.detail && (
              <span className="sivu-callout__lvl">
                <i style={{ background: colorSel }} />
                {seleccionado.detail}
              </span>
            )}
          </div>
        </>
      )}
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
