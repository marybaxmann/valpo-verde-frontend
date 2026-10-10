import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Extent from "@arcgis/core/geometry/Extent";
import { isAbortError } from "@arcgis/core/core/promiseUtils";
import "@arcgis/core/assets/esri/themes/light/main.css";
import type { TreeFeature } from "../types/tree";
import { DEFAULT_MAP_VIEW, INVENTORY_BASEMAP } from "../lib/arcgis";

/**
 * Mapa de inventario interactivo (INV-1C / SIG-1, ADR-015):
 * FeatureLayer client-side construida con los árboles del backend.
 * Permite selección contextual, captura de coordenadas y visualización técnica.
 */

const WGS84 = { wkid: 4326 };

/**
 * Caja geográfica de Chile continental (WGS84), usada SOLO para decidir a
 * qué extensión centrar la vista inicial — nunca para ocultar, descartar
 * ni excluir un punto del inventario o de sus conteos. Un árbol con una
 * coordenada válida pero fuera de este rango (p. ej. un error de signo en
 * la latitud) se sigue representando en el mapa real: simplemente no
 * fuerza un zoom continental para todos los demás árboles.
 */
const CHILE_BOUNDS = { minLon: -76, maxLon: -66, minLat: -56, maxLat: -17 };

function isWithinChileBounds([lon, lat]: [number, number]): boolean {
  return (
    lon >= CHILE_BOUNDS.minLon &&
    lon <= CHILE_BOUNDS.maxLon &&
    lat >= CHILE_BOUNDS.minLat &&
    lat <= CHILE_BOUNDS.maxLat
  );
}

/**
 * Colores oficiales de nivel de riesgo (R04/M03 — ver services/rules/treeRisk.ts
 * en el backend). El mapa NUNCA calcula el riesgo: solo pinta el resultado
 * de la última evaluación vigente que llega ya calculada del servidor.
 */
const RIESGO_COLORS: Record<string, [number, number, number]> = {
  Bajo: [220, 232, 169], // #DCE8A9
  Moderado: [249, 181, 43], // #F9B52B
  Alto: [240, 74, 50], // #F04A32
  Extremo: [199, 37, 43], // #C7252B
};
const SIN_EVALUACION_COLOR: [number, number, number] = [154, 166, 158]; // neutro
const SIN_CLASIFICACION = "Sin clasificación";

/** Tamaño (px) del pin de cada árbol en el mapa; la punta marca la ubicación. */
const PIN_WIDTH = 26;
const PIN_HEIGHT = 34;
const PIN_SCALE_SELECTED = 1.3;

/**
 * Pin en gota con el color del nivel de riesgo y la silueta de un árbol en
 * el centro. `selected` cambia el borde blanco por uno oscuro.
 */
function treePinSymbol(rgb: [number, number, number], selected = false, hollow = false) {
  // hollow: evaluado pero sin clasificación (N13, CC-024) — gota blanca con
  // borde neutro, distinta de "sin evaluación" (gota neutra rellena).
  const fill = hollow ? "#FFFFFF" : `rgb(${rgb.join(",")})`;
  const ring = selected ? "#17241D" : hollow ? `rgb(${rgb.join(",")})` : "#FFFFFF";
  const drop = "M20 2C10.6 2 3 9.6 3 19c0 12.2 17 31 17 31s17-18.8 17-31C37 9.6 29.4 2 20 2Z";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">` +
    `<path d="${drop}" fill="none" stroke="rgba(23,36,29,0.45)" stroke-width="5.5"/>` +
    `<path d="${drop}" fill="${fill}" stroke="${ring}" stroke-width="3"/>` +
    `<circle cx="20" cy="19" r="10" fill="#FFFFFF"/>` +
    `<circle cx="20" cy="16.4" r="5.4" fill="#176B4D"/>` +
    `<rect x="18.7" y="19" width="2.6" height="7.4" rx="1.1" fill="#23523F"/>` +
    `</svg>`;
  const scale = selected ? PIN_SCALE_SELECTED : 1;
  return {
    type: "picture-marker" as const,
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    width: `${PIN_WIDTH * scale}px`,
    height: `${PIN_HEIGHT * scale}px`,
    // Sube el pin media altura para que la punta quede sobre el árbol.
    yoffset: `${(PIN_HEIGHT * scale) / 2}px`,
  };
}

/**
 * Cancelaciones normales de ArcGIS: un goTo interrumpido por otro
 * movimiento ("view:goto-interrupted") o una petición abortada al desmontar.
 */
function isInterruption(err: unknown): boolean {
  if (isAbortError(err)) return true;
  const name = (err as { name?: string } | null)?.name ?? "";
  return name.includes("goto-interrupted") || name === "AbortError";
}

function toGraphics(features: TreeFeature[], riskByTreeId: Record<string, string | null | undefined>): Graphic[] {
  return features.map((feature, index) => {
    const riesgo = riskByTreeId[feature.properties.id];
    return new Graphic({
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
        // undefined = nunca evaluado; null = evaluado, pero un componente
        // quedó "No determinado" y el árbol no tiene clasificación (N13).
        riesgo: riesgo === undefined ? "Sin evaluación" : riesgo ?? SIN_CLASIFICACION,
      },
    });
  });
}

/**
 * Id del árbol de un gráfico de la capa. ArcGIS puede devolver en el
 * hitTest solo los campos que usa para dibujar; si falta `id`, se consulta
 * a la capa por su objectId.
 */
async function resolveTreeId(layer: FeatureLayer, graphic: Graphic): Promise<string | null> {
  const direct = graphic.attributes?.id;
  if (typeof direct === "string" && direct) return direct;
  const objectId = graphic.attributes?.[layer.objectIdField];
  if (objectId === undefined || objectId === null) return null;
  const result = await layer.queryFeatures({ objectIds: [Number(objectId)], outFields: ["id"] });
  const id = result.features[0]?.attributes?.id;
  return typeof id === "string" && id ? id : null;
}

function createInventoryLayer(graphics: Graphic[]): FeatureLayer {
  return new FeatureLayer({
    title: "Inventario de árboles",
    source: graphics,
    objectIdField: "OBJECTID",
    outFields: ["*"],
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
      { name: "riesgo", type: "string", alias: "Nivel de riesgo" },
    ],
    // Color por nivel de riesgo de la última evaluación (R04). "Sin
    // evaluación" (o cualquier valor no reconocido) usa el color neutro.
    renderer: {
      type: "unique-value",
      field: "riesgo",
      defaultSymbol: treePinSymbol(SIN_EVALUACION_COLOR),
      uniqueValueInfos: [
        ...Object.entries(RIESGO_COLORS).map(([value, rgb]) => ({
          value,
          symbol: treePinSymbol(rgb),
        })),
        { value: SIN_CLASIFICACION, symbol: treePinSymbol(SIN_EVALUACION_COLOR, false, true) },
      ],
    },
    popupEnabled: false, // Desactivamos el popup flotante por defecto en favor del panel contextual lateral
  });
}

export default function InventoryMapView({
  apiKey,
  features,
  selectedTreeId,
  onSelectTree,
  isPickingLocation = false,
  pickedLocation,
  onPickLocation,
  riskByTreeId,
  showLegend = false,
}: {
  apiKey: string;
  features: TreeFeature[];
  selectedTreeId?: string | null;
  onSelectTree?: (treeId: string | null) => void;
  isPickingLocation?: boolean;
  pickedLocation?: { lon: number; lat: number } | null;
  onPickLocation?: (coords: { lon: number; lat: number }) => void;
  /** tree id -> clasificacion_riesgo de su última evaluación (null/undefined = sin evaluación). */
  riskByTreeId?: Record<string, string | null | undefined>;
  showLegend?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const interactionLayerRef = useRef<GraphicsLayer | null>(null);
  const treeLayerRef = useRef<FeatureLayer | null>(null);
  const hasZoomedRef = useRef(false);

  // Mantenemos referencias a callbacks y a los features vigentes para no
  // tener que reconstruir el MapView (y recargar el basemap) en cada
  // cambio: solo la capa de árboles se sincroniza de forma incremental.
  const callbacksRef = useRef({ onSelectTree, onPickLocation, isPickingLocation });
  useEffect(() => {
    callbacksRef.current = { onSelectTree, onPickLocation, isPickingLocation };
  }, [onSelectTree, onPickLocation, isPickingLocation]);

  const featuresRef = useRef(features);
  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  const riskByTreeIdRef = useRef(riskByTreeId ?? {});
  useEffect(() => {
    riskByTreeIdRef.current = riskByTreeId ?? {};
  }, [riskByTreeId]);

  /**
   * Reemplaza el contenido de la capa de árboles por los features vigentes
   * (`applyEdits` sobre una FeatureLayer en memoria) y, solo la primera vez
   * que llegan árboles con ubicación, centra la vista en su extensión.
   * Nunca recrea el MapView ni el basemap: así el inventario recién creado
   * aparece de inmediato sin perder el encuadre/zoom actual del usuario.
   */
  async function syncTreeLayer() {
    const treeLayer = treeLayerRef.current;
    if (!treeLayer) return;

    const currentFeatures = featuresRef.current;
    const existingIds = await treeLayer.queryObjectIds();
    await treeLayer.applyEdits({
      deleteFeatures: existingIds.map((objectId) => ({ objectId: Number(objectId) })),
      addFeatures: toGraphics(currentFeatures, riskByTreeIdRef.current),
    });

    if (!hasZoomedRef.current && viewRef.current) {
      hasZoomedRef.current = true;
      await fitViewToFeatures(viewRef.current, currentFeatures);
    }
  }

  /**
   * Encuadra la vista inicial. Nunca abre en escala continental: si no hay
   * árboles, o si ninguno cae dentro de Chile continental, se queda en la
   * vista municipal por defecto (Valparaíso). Un punto fuera de rango sigue
   * renderizándose en el mapa — solo se excluye del cálculo del encuadre.
   */
  async function fitViewToFeatures(view: MapView, features: TreeFeature[]) {
    const fitCandidates = features.filter((f) => isWithinChileBounds(f.geometry.coordinates));

    if (fitCandidates.length === 0) {
      await view.goTo({ center: DEFAULT_MAP_VIEW.center, zoom: DEFAULT_MAP_VIEW.zoom });
      return;
    }

    if (fitCandidates.length === 1) {
      const [lon, lat] = fitCandidates[0].geometry.coordinates;
      await view.goTo({ target: new Point({ longitude: lon, latitude: lat, spatialReference: WGS84 }), zoom: 17 });
      return;
    }

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const f of fitCandidates) {
      const [lon, lat] = f.geometry.coordinates;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    if (minLon === maxLon && minLat === maxLat) {
      await view.goTo({ target: new Point({ longitude: minLon, latitude: minLat, spatialReference: WGS84 }), zoom: 17 });
      return;
    }

    const extent = new Extent({ xmin: minLon, ymin: minLat, xmax: maxLon, ymax: maxLat, spatialReference: WGS84 });
    await view.goTo(extent.expand(1.2));
  }

  // Efecto 1: crea el MapView una sola vez por API key (nunca por cambio de datos).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setMapError(null);
    hasZoomedRef.current = false;

    let destroyed = false;
    let view: MapView | null = null;

    const timer = window.setTimeout(() => {
      if (destroyed) return;

      esriConfig.apiKey = apiKey;

      const treeLayer = createInventoryLayer([]);
      treeLayerRef.current = treeLayer;
      const interactionLayer = new GraphicsLayer({ title: "Interacciones", listMode: "hide" });
      interactionLayerRef.current = interactionLayer;

      const mapView = new MapView({
        container,
        map: new ArcGISMap({
          basemap: INVENTORY_BASEMAP,
          layers: [treeLayer, interactionLayer],
        }),
        center: DEFAULT_MAP_VIEW.center,
        zoom: DEFAULT_MAP_VIEW.zoom,
      });
      view = mapView;
      viewRef.current = mapView;

      // Cursor de mano al pasar sobre un árbol (en modo captura de
      // ubicación se mantiene la cruz). Un solo hitTest a la vez para no
      // encolar consultas mientras el mouse se mueve.
      let hoverPending = false;
      mapView.on("pointer-move", (event) => {
        if (hoverPending || callbacksRef.current.isPickingLocation) return;
        hoverPending = true;
        mapView
          .hitTest(event, { include: [treeLayer] })
          .then((response) => {
            if (destroyed || callbacksRef.current.isPickingLocation) return;
            const overTree = response.results.some((r) => "graphic" in r && r.graphic.layer === treeLayer);
            container.style.cursor = overTree ? "pointer" : "default";
          })
          .catch(() => undefined)
          .finally(() => {
            hoverPending = false;
          });
      });
      mapView.on("pointer-leave", () => {
        if (!callbacksRef.current.isPickingLocation) container.style.cursor = "default";
      });

      // Evento de clic en el mapa
      mapView.on("click", async (event) => {
        const { isPickingLocation, onPickLocation, onSelectTree } = callbacksRef.current;

        if (
          isPickingLocation &&
          onPickLocation &&
          event.mapPoint &&
          typeof event.mapPoint.longitude === "number" &&
          typeof event.mapPoint.latitude === "number"
        ) {
          onPickLocation({
            lon: Number(event.mapPoint.longitude.toFixed(6)),
            lat: Number(event.mapPoint.latitude.toFixed(6)),
          });
          return;
        }

        const response = await mapView.hitTest(event, { include: [treeLayer] });
        const hit = response.results.find(
          (r) => "graphic" in r && r.graphic.layer === treeLayer
        );
        const treeId = hit && "graphic" in hit ? await resolveTreeId(treeLayer, hit.graphic) : null;

        if (treeId) {
          onSelectTree?.(treeId);
        } else if (!isPickingLocation) {
          onSelectTree?.(null);
        }
      });

      // Solo un fallo de carga del MapView/basemap se informa como problema
      // de la API key. Dibujar los árboles y encuadrar la vista tienen su
      // propio manejo: un goTo interrumpido por otro movimiento (p. ej. la
      // selección de un árbol) es normal y no es un error del mapa base.
      mapView.when(
        () => {
          if (destroyed) return;
          syncTreeLayer().catch((err: unknown) => {
            if (destroyed || isInterruption(err)) return;
            console.error("No se pudo dibujar la capa de árboles", err);
            setMapError("No se pudieron dibujar los árboles en el mapa. Recarga la página.");
          });
        },
        (err: unknown) => {
          if (destroyed) {
            if (!isInterruption(err)) console.error("Error de ArcGIS tras desmontar el mapa", err);
            return;
          }
          console.error("No se pudo cargar el mapa de ArcGIS", err);
          // Se incluye el detalle técnico del SDK para poder diagnosticar la
          // causa real (red, WebGL, clave, recursos del SDK) sin abrir la consola.
          const e = err as { name?: string; message?: string; details?: { error?: { message?: string } } } | null;
          const detalle = [e?.name, e?.message, e?.details?.error?.message].filter(Boolean).join(" · ");
          setMapError(
            `No se pudo cargar el mapa base de ArcGIS.${detalle ? ` Detalle técnico: ${detalle}` : ""}`
          );
        }
      );
    }, 0);

    return () => {
      destroyed = true;
      window.clearTimeout(timer);
      view?.destroy();
      viewRef.current = null;
      interactionLayerRef.current = null;
      treeLayerRef.current = null;
    };
  }, [apiKey]);

  // Efecto 2: sincroniza la capa cuando cambian los árboles reales del backend
  // (alta nueva, filtros, recarga) — sin tocar el MapView ni el basemap.
  useEffect(() => {
    if (!treeLayerRef.current) return; // El mapa aún no terminó de crearse (efecto 1 lo hará con estos datos).
    syncTreeLayer().catch((err: unknown) => {
      console.error("No se pudo sincronizar la capa de árboles del inventario", err);
    });
  }, [features]);

  // Efecto 2b: recolorea cuando llega/cambia el resumen de riesgo del
  // proyecto (p. ej. tras guardar una evaluación), sin recrear el mapa.
  useEffect(() => {
    if (!treeLayerRef.current) return;
    syncTreeLayer().catch((err: unknown) => {
      console.error("No se pudo recolorear la capa de árboles por riesgo", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskByTreeId]);

  // Actualizar gráficos de selección y punto capturado
  useEffect(() => {
    const interactionLayer = interactionLayerRef.current;
    if (!interactionLayer) return;

    interactionLayer.removeAll();

    // 1. Gráfico de árbol seleccionado
    if (selectedTreeId) {
      const selectedFeature = features.find((f) => f.properties.id === selectedTreeId);
      if (selectedFeature) {
        const highlightGraphic = new Graphic({
          geometry: new Point({
            longitude: selectedFeature.geometry.coordinates[0],
            latitude: selectedFeature.geometry.coordinates[1],
            spatialReference: WGS84,
          }),
          // Mismo pin, más grande y con borde oscuro, sobre el original.
          symbol: treePinSymbol(
            RIESGO_COLORS[riskByTreeIdRef.current[selectedTreeId] ?? ""] ?? SIN_EVALUACION_COLOR,
            true,
            riskByTreeIdRef.current[selectedTreeId] === null
          ),
        });
        interactionLayer.add(highlightGraphic);
      }
    }

    // 2. Gráfico de ubicación seleccionada / capturada en formulario
    if (pickedLocation) {
      const pinGraphic = new Graphic({
        geometry: new Point({
          longitude: pickedLocation.lon,
          latitude: pickedLocation.lat,
          spatialReference: WGS84,
        }),
        symbol: {
          type: "simple-marker",
          style: "diamond",
          size: 16,
          color: [240, 74, 50, 0.9], // Pin de captura
          outline: { color: [255, 255, 255, 1], width: 2 },
        },
      });
      interactionLayer.add(pinGraphic);
    }
  }, [selectedTreeId, pickedLocation, features, riskByTreeId]);

  // Centra y acerca la vista al árbol seleccionado (mapa, listado o búsqueda
  // producen la misma selección — ver ProjectInventoryMap). No depende de
  // `features` para no recentrar cada vez que cambia el inventario mientras
  // la selección sigue siendo la misma.
  useEffect(() => {
    if (!selectedTreeId) return;
    const view = viewRef.current;
    if (!view) return;
    const feature = featuresRef.current.find((f) => f.properties.id === selectedTreeId);
    if (!feature) return;

    const [lon, lat] = feature.geometry.coordinates;
    view
      .goTo({
        target: new Point({ longitude: lon, latitude: lat, spatialReference: WGS84 }),
        zoom: Math.max(view.zoom, 18),
      })
      .catch((err: unknown) => {
        if (!isInterruption(err)) console.error("No se pudo centrar el mapa en el árbol seleccionado", err);
      });
  }, [selectedTreeId]);

  // Ajustar cursor en modo captura
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = isPickingLocation ? "crosshair" : "default";
    }
  }, [isPickingLocation]);

  return (
    <div className="inventory-map">
      <div ref={containerRef} className="inventory-map__view" />
      {mapError && (
        <div className="inventory-map__overlay" role="alert">
          {mapError}
        </div>
      )}
      {showLegend && (
        <div className="sivu-map-legend" aria-label="Leyenda de nivel de riesgo">
          <span className="sivu-map-legend__title">Riesgo</span>
          <span className="sivu-map-legend__item">
            <span className="sivu-map-legend__dot" style={{ background: "#DCE8A9" }} /> Bajo
          </span>
          <span className="sivu-map-legend__item">
            <span className="sivu-map-legend__dot" style={{ background: "#F9B52B" }} /> Moderado
          </span>
          <span className="sivu-map-legend__item">
            <span className="sivu-map-legend__dot" style={{ background: "#F04A32" }} /> Alto
          </span>
          <span className="sivu-map-legend__item">
            <span className="sivu-map-legend__dot" style={{ background: "#C7252B" }} /> Extremo
          </span>
          <span className="sivu-map-legend__item">
            <span className="sivu-map-legend__dot" style={{ background: "#9AA69E" }} /> Sin evaluación
          </span>
          <span className="sivu-map-legend__item">
            <span
              className="sivu-map-legend__dot"
              style={{ background: "#FFFFFF", border: "1.5px solid #9AA69E" }}
            />{" "}
            Sin clasificación
          </span>
        </div>
      )}
    </div>
  );
}
