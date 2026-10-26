/**
 * Configuración del mapa SIG (SIG-1, ADR-015). Este módulo NO importa
 * @arcgis/core: así la página puede validar la clave sin cargar el SDK.
 *
 * VITE_ARCGIS_API_KEY es una API key de aplicación pública de ArcGIS
 * Location Platform (solo privilegio Basemap Styles, restringida por
 * origen). Vite la incorpora al bundle del navegador, lo cual es esperado;
 * aun así nunca se escribe en el código ni se versiona: vive solo en .env.
 */
export function getArcgisApiKey(): string | null {
  const key = import.meta.env.VITE_ARCGIS_API_KEY?.trim();
  return key ? key : null;
}

/** Estilo del servicio Basemap Styles (v2). */
export const INVENTORY_BASEMAP = "arcgis/topographic";

/**
 * Capas base que el usuario puede elegir en los mapas (pedido de la
 * autora, 2026-10-26). Todas vienen del servicio Basemap Styles de ArcGIS
 * con la misma API key y su atribución: no son imágenes descargadas ni se
 * versionan (PR-016 v7.0, cartografía; CC-057 excluye la imagen aérea fija
 * de la maqueta, no la de ArcGIS).
 */
export const BASEMAPS = [
  { id: "mapa", label: "Mapa", hint: "Calles y direcciones", style: "arcgis/streets" },
  { id: "satelite", label: "Satélite", hint: "Terreno real", style: "arcgis/imagery/standard" },
  { id: "hibrido", label: "Híbrido", hint: "Satélite con nombres de calles", style: "arcgis/imagery" },
  { id: "limpio", label: "Limpio", hint: "Gris claro, para datos encima", style: "arcgis/light-gray" },
] as const;

export type BasemapId = (typeof BASEMAPS)[number]["id"];

const BASEMAP_KEY = "sivu-basemap";

/** Capa base elegida por este navegador (preferencia local; «Mapa» si no hay). */
export function getPreferredBasemap(): BasemapId {
  try {
    const saved = localStorage.getItem(BASEMAP_KEY);
    if (BASEMAPS.some((b) => b.id === saved)) return saved as BasemapId;
  } catch {
    // Sin almacenamiento (modo privado): se usa la capa por defecto.
  }
  return "mapa";
}

export function savePreferredBasemap(id: BasemapId): void {
  try {
    localStorage.setItem(BASEMAP_KEY, id);
  } catch {
    // Sin almacenamiento: la elección dura solo esta visita.
  }
}

export function basemapStyle(id: BasemapId): string {
  return BASEMAPS.find((b) => b.id === id)?.style ?? BASEMAPS[0].style;
}

/**
 * Encuadre visual por defecto del mapa. No es una coordenada técnica,
 * de levantamiento ni del proyecto. Solo se usa cuando el proyecto no
 * tiene ningún árbol con ubicación (vista general de Valparaíso).
 */
export const DEFAULT_MAP_VIEW = {
  center: [-71.62, -33.045] as [number, number],
  zoom: 13,
};
