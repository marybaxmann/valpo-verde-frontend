import { publicApi } from "./client";
import type { CodigoEtiquetaPublico, FichaPublica } from "../types/fichaPublica";

/**
 * Valpo Verde Conecta, sin sesión (CC-062). Rutas publicadas por el backend
 * (`docs/api/contrato-frontend.md` §8), con límites por IP.
 */
const BASE = "/api/sivu/conecta";

/** Ficha pública del árbol a partir del `qr_token` de su placa. 404 si el QR no existe. */
export function obtenerFichaPublica(qrToken: string): Promise<FichaPublica> {
  return publicApi.get<{ data: FichaPublica }>(`${BASE}/arboles/${encodeURIComponent(qrToken)}`).then((r) => r.data);
}

/** Catálogo `tipo_incidencia` (D-180) para el selector del formulario ciudadano. */
export function obtenerTiposIncidenciaPublicos(): Promise<(CodigoEtiquetaPublico & { orden: number })[]> {
  return publicApi
    .get<{ data: { tipo_incidencia: (CodigoEtiquetaPublico & { orden: number })[] } }>(`${BASE}/catalogos`)
    .then((r) => [...r.data.tipo_incidencia].sort((a, b) => a.orden - b.orden));
}

/** Reporte ciudadano (PR-022): devuelve el código de seguimiento, que se muestra una sola vez. */
export function enviarReporteCiudadano(qrToken: string, form: FormData): Promise<{ codigo_seguimiento: string; fecha_reporte: string }> {
  return publicApi
    .post<{ data: { codigo_seguimiento: string; fecha_reporte: string } }>(`${BASE}/arboles/${encodeURIComponent(qrToken)}/incidencias`, form)
    .then((r) => r.data);
}

/** Estado de un reporte por su código; el código va en el cuerpo, nunca en la URL. */
export function consultarSeguimiento(codigo: string): Promise<{ estado_incidencia: CodigoEtiquetaPublico }> {
  return publicApi
    .post<{ data: { estado_incidencia: CodigoEtiquetaPublico } }>(`${BASE}/seguimiento`, { codigo })
    .then((r) => r.data);
}
