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
        riesgo: riesgo ?? "Sin evaluación",
      },
    });
  });
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
      { name: "riesgo", type: "string", alias: "Nivel de riesgo" },
    ],
    // Color por nivel de riesgo de la última evaluación (R04). "Sin
    // evaluación" (o cualquier valor no reconocido) usa el color neutro.
    renderer: {
      type: "unique-value",
      field: "riesgo",
      defaultSymbol: {
        type: "simple-marker",
        style: "circle",
        size: 9,
        color: [...SIN_EVALUACION_COLOR, 0.9],
        outline: { color: [255, 255, 255, 1], width: 1.5 },
      },
      uniqueValueInfos: Object.entries(RIESGO_COLORS).map(([value, rgb]) => ({
        value,
        symbol: {
          type: "simple-marker",
          style: "circle",
          size: 9,
          color: [...rgb, 0.92],
          outline: { color: [255, 255, 255, 1], width: 1.5 },
        },
      })),
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

        const response = await mapView.hitTest(event);
        const hit = response.results.find(
          (r) => "graphic" in r && r.graphic.layer === treeLayer
        );

        if (hit && "graphic" in hit && hit.graphic.attributes?.id) {
          onSelectTree?.(hit.graphic.attributes.id as string);
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
          symbol: {
            type: "simple-marker",
            style: "circle",
            size: 18,
            color: [63, 147, 111, 0.35], // --sivu-primary-medium con transparencia
            outline: {
              color: [35, 82, 63, 1], // --sivu-primary-dark
              width: 2.5,
            },
          },
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
  }, [selectedTreeId, pickedLocation, features]);

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
        </div>
      )}
    </div>
  );
}
