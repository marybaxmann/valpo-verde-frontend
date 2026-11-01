import { publicApi } from "./client";
import type { FichaPublica } from "../types/fichaPublica";

/**
 * Valpo Verde Conecta, sin sesión (CC-062). Las rutas son las que propone
 * `valpo-verde-backend/docs/plan/conecta-62-backend.md`; mientras el
 * backend no las publique, responden 404 y la página lo dice.
 */

/** Ficha pública del árbol a partir del `qr_token` de su placa. */
export function obtenerFichaPublica(qrToken: string): Promise<FichaPublica> {
  return publicApi.get<{ data: FichaPublica }>(`/api/public/conecta/arboles/${encodeURIComponent(qrToken)}`).then((r) => r.data);
}

/** Reporte ciudadano (PR-022): devuelve el código de seguimiento, que se muestra una sola vez. */
export function enviarReporteCiudadano(qrToken: string, form: FormData): Promise<{ codigo_seguimiento: string }> {
  return publicApi
    .post<{ data: { codigo_seguimiento: string } }>(`/api/public/conecta/arboles/${encodeURIComponent(qrToken)}/reportes`, form)
    .then((r) => r.data);
}
