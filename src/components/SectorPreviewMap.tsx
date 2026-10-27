import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import BasemapStyle from "@arcgis/core/support/BasemapStyle";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
import Point from "@arcgis/core/geometry/Point";
import type Geometry from "@arcgis/core/geometry/Geometry";
import "@arcgis/core/assets/esri/themes/light/main.css";
import {
  DEFAULT_MAP_VIEW,
  basemapStyle,
  getPreferredBasemap,
  savePreferredBasemap,
  type BasemapId,
} from "../lib/arcgis";
import { BasemapSwitcher } from "./BasemapSwitcher";
import type { SuperficieVistaPrevia } from "../types/project";

function makeBasemap(id: BasemapId): Basemap {
  return new Basemap({ style: new BasemapStyle({ id: basemapStyle(id) }) });
}

type Coord = number[];

/** GeoJSON (WGS84) del backend a geometría de ArcGIS, sin la altitud. */
function aGeometria(g: SuperficieVistaPrevia["geometria"]): Geometry | null {
  if (!g) return null;
  const xy = (c: Coord) => [c[0], c[1]];
  const sr = { wkid: 4326 };
  switch (g.type) {
    case "Polygon":
      return new Polygon({ rings: (g.coordinates as Coord[][]).map((r) => r.map(xy)), spatialReference: sr });
    case "MultiPolygon":
      return new Polygon({
        rings: (g.coordinates as Coord[][][]).flatMap((p) => p.map((r) => r.map(xy))),
        spatialReference: sr,
      });
    case "LineString":
      return new Polyline({ paths: [(g.coordinates as Coord[]).map(xy)], spatialReference: sr });
    case "MultiLineString":
      return new Polyline({ paths: (g.coordinates as Coord[][]).map((p) => p.map(xy)), spatialReference: sr });
    case "Point": {
      const [x, y] = g.coordinates as Coord;
      return new Point({ x, y, spatialReference: sr });
    }
    default:
      return null;
  }
}

const VERDE: [number, number, number] = [140, 210, 90];
const ROJO: [number, number, number] = [200, 60, 50];
const GRIS: [number, number, number] = [120, 120, 120];

function simbolo(s: SuperficieVistaPrevia, elegida: boolean, geometria: Geometry) {
  if (geometria.type === "point") {
    return { type: "simple-marker" as const, style: "circle" as const, size: 7, color: [...GRIS, 0.9], outline: { color: [255, 255, 255, 1], width: 1 } };
  }
  if (geometria.type === "polyline") {
    return { type: "simple-line" as const, color: [...GRIS, 0.9], width: 2, style: "dash" as const };
  }
  if (s.estado === "invalida") {
    return { type: "simple-fill" as const, color: [...ROJO, 0.1], outline: { color: [...ROJO, 1], width: 2, style: "dash" as const } };
  }
  // Elegida: relleno claro con borde blanco, legible sobre satélite y sobre mapa.
  return elegida
    ? { type: "simple-fill" as const, color: [...VERDE, 0.5], outline: { color: [255, 255, 255, 1], width: 2.5 } }
    : { type: "simple-fill" as const, color: [...VERDE, 0.08], outline: { color: [...VERDE, 1], width: 1.5 } };
}

/**
 * Vista previa del sector (D-255; CC-047): dibuja cada elemento del archivo
 * tal como lo leyó el backend. Las superficies válidas elegidas van
 * rellenas; las no elegidas, solo con borde; las inválidas, en rojo
 * punteado; puntos y líneas, en gris (no integran el sector). Solo
 * representa: nunca se escribe en ArcGIS (ADR-015).
 */
export default function SectorPreviewMap({
  apiKey,
  superficies,
  seleccion,
}: {
  apiKey: string;
  superficies: SuperficieVistaPrevia[];
  seleccion: Set<number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const mapRef = useRef<ArcGISMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [basemap, setBasemap] = useState<BasemapId>(getPreferredBasemap);
  const initialBasemap = useRef(basemap);
  const encuadrado = useRef<SuperficieVistaPrevia[] | null>(null);

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
      zoom: 14,
      ui: { components: ["zoom"] },
    });
    viewRef.current = view;
    view
      .when()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      view.destroy();
      viewRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || status !== "ready") return;
    mapRef.current.basemap = makeBasemap(basemap);
  }, [basemap, status]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || status !== "ready") return;
    view.graphics.removeAll();
    const graficos: Graphic[] = [];
    for (const s of superficies) {
      const geometria = aGeometria(s.geometria);
      if (!geometria) continue;
      graficos.push(new Graphic({ geometry: geometria, symbol: simbolo(s, seleccion.has(s.indice), geometria) }));
    }
    view.graphics.addMany(graficos);
    // Encuadre solo cuando cambia el archivo, no al marcar o desmarcar.
    if (graficos.length > 0 && encuadrado.current !== superficies) {
      encuadrado.current = superficies;
      view.goTo(graficos, { animate: false }).catch(() => {});
    }
  }, [superficies, seleccion, status]);

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
        <p className="sivu-picker__state sivu-picker__state--error">No se pudo cargar el mapa. La lista de superficies sigue disponible.</p>
      )}
    </div>
  );
}
