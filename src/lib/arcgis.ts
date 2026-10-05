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
 * Encuadre visual por defecto del mapa. No es una coordenada técnica,
 * de levantamiento ni del proyecto. Solo se usa cuando el proyecto no
 * tiene ningún árbol con ubicación (vista general de Valparaíso).
 */
export const DEFAULT_MAP_VIEW = {
  center: [-71.62, -33.045] as [number, number],
  zoom: 13,
};
