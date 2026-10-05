import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import { isAbortError } from "@arcgis/core/core/promiseUtils";
import "@arcgis/core/assets/esri/themes/light/main.css";
import type { TreeFeature } from "../types/tree";
import { DEFAULT_MAP_VIEW, INVENTORY_BASEMAP } from "../lib/arcgis";

/**
 * Mapa de inventario (SIG-1, ADR-015): FeatureLayer client-side construida
 * con los árboles que entrega el backend. ArcGIS solo visualiza: no
 * almacena, no edita y no calcula ninguna clasificación metodológica.
 *
 * Se carga de forma diferida (React.lazy) para que el SDK solo se descargue
 * al abrir el mapa y solo si existe VITE_ARCGIS_API_KEY.
 */

const WGS84 = { wkid: 4326 };

/**
 * OBJECTID entero (1..n) generado aquí, solo porque FeatureLayer lo exige.
 * La identidad real del árbol es `id` (uuid); el OBJECTID nunca sale del
 * frontend.
 */
function toGraphics(features: TreeFeature[]): Graphic[] {
  return features.map(
    (feature, index) =>
      new Graphic({
        geometry: new Point({
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
          spatialReference: WGS84,
        }),
        attributes: {
          OBJECTID: index + 1,
          id: feature.properties.id,
          tree_code: feature.properties.tree_code,
          nombre_cientifico: feature.properties.nombre_cientifico,
          nombre_comun: feature.properties.nombre_comun,
          estado_ciclo_vida: feature.properties.estado_ciclo_vida,
          direccion: feature.properties.direccion,
          comuna: feature.properties.comuna,
          lugar_referencia: feature.properties.lugar_referencia,
        },
      })
  );
}

function createInventoryLayer(graphics: Graphic[]): FeatureLayer {
  return new FeatureLayer({
    title: "Inventario de árboles",
    source: graphics,
    objectIdField: "OBJECTID",
    geometryType: "point",
    spatialReference: WGS84,
    fields: [
      { name: "OBJECTID", type: "oid" },
      { name: "id", type: "string" },
      { name: "tree_code", type: "string", alias: "Código" },
      { name: "nombre_cientifico", type: "string", alias: "Nombre científico" },
      { name: "nombre_comun", type: "string", alias: "Nombre común" },
      { name: "estado_ciclo_vida", type: "string", alias: "Estado de ciclo de vida" },
      { name: "direccion", type: "string", alias: "Dirección" },
      { name: "comuna", type: "string", alias: "Comuna" },
      { name: "lugar_referencia", type: "string", alias: "Lugar de referencia" },
    ],
    // Renderer neutro: un solo símbolo, sin clasificar por ningún atributo.
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-marker",
        style: "circle",
        size: 8,
        color: [46, 125, 50, 0.9],
        outline: { color: [255, 255, 255, 1], width: 1 },
      },
    },
    popupTemplate: {
      title: "{tree_code}",
      outFields: ["*"],
      content: (event: { graphic: Graphic }) => popupContent(event.graphic.attributes),
    },
  });
}

/** Siempre se muestran; "—" si el valor es nulo. */
const POPUP_REQUIRED_FIELDS: [string, string][] = [
  ["nombre_cientifico", "Nombre científico"],
  ["nombre_comun", "Nombre común"],
  ["estado_ciclo_vida", "Estado de ciclo de vida"],
];

/** Solo se muestran cuando existen. */
const POPUP_OPTIONAL_FIELDS: [string, string][] = [
  ["direccion", "Dirección"],
  ["comuna", "Comuna"],
  ["lugar_referencia", "Lugar de referencia"],
];

/** Popup mínimo construido con nodos DOM (textContent: sin inyección de HTML). */
function popupContent(attributes: Record<string, unknown>): HTMLElement {
  const list = document.createElement("dl");
  list.className = "inventory-popup";
  const addRow = (label: string, value: string) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    list.append(dt, dd);
  };
  for (const [field, label] of POPUP_REQUIRED_FIELDS) {
    const value = attributes[field];
    addRow(label, typeof value === "string" && value !== "" ? value : "—");
  }
  for (const [field, label] of POPUP_OPTIONAL_FIELDS) {
    const value = attributes[field];
    if (typeof value === "string" && value.trim() !== "") addRow(label, value);
  }
  return list;
}

export default function InventoryMapView({
  apiKey,
  features,
}: {
  apiKey: string;
  features: TreeFeature[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setMapError(null);

    let destroyed = false;
    let view: MapView | null = null;

    // La creación se difiere un tick: en desarrollo, React StrictMode monta,
    // desmonta y vuelve a montar el efecto de forma síncrona. Así el primer
    // montaje se cancela antes de crear el MapView y ArcGIS no inicia una
    // carga de basemap que luego se aborte. El comportamiento del mapa no cambia.
    const timer = window.setTimeout(() => {
      if (destroyed) return;

      // Debe fijarse antes de la primera petición al servicio de basemaps.
      esriConfig.apiKey = apiKey;

      const layer = createInventoryLayer(toGraphics(features));
      const mapView = new MapView({
        container,
        map: new ArcGISMap({ basemap: INVENTORY_BASEMAP, layers: [layer] }),
        center: DEFAULT_MAP_VIEW.center,
        zoom: DEFAULT_MAP_VIEW.zoom,
      });
      view = mapView;

      mapView
        .when(async () => {
          if (features.length === 0) return;
          const { extent } = await layer.queryExtent();
          if (destroyed || !extent) return;
          // Un solo punto da una extensión de tamaño cero: se centra con zoom fijo.
          if (features.length === 1) {
            await mapView.goTo({ target: extent.center, zoom: 17 });
          } else {
            await mapView.goTo(extent.expand(1.2));
          }
        })
        .catch((err: unknown) => {
          if (destroyed) {
            // Componente desmontado: la cancelación es esperada; cualquier
            // otro error se sigue registrando.
            if (!isAbortError(err)) console.error("Error de ArcGIS tras desmontar el mapa", err);
            return;
          }
          console.error("No se pudo cargar el mapa de ArcGIS", err);
          setMapError(
            "No se pudo cargar el mapa base de ArcGIS. Revisa que VITE_ARCGIS_API_KEY sea válida y esté autorizada para este origen."
          );
        });
    }, 0);

    return () => {
      destroyed = true;
      window.clearTimeout(timer);
      view?.destroy();
    };
  }, [apiKey, features]);

  return (
    <div className="inventory-map">
      <div ref={containerRef} className="inventory-map__view" />
      {mapError && (
        <div className="inventory-map__overlay" role="alert">
          {mapError}
        </div>
      )}
    </div>
  );
}
