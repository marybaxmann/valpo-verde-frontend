import { api } from "./client";
import { cachedGet } from "./cache";
import type { Catalogos } from "../types/catalogs";

/** Catálogos vigentes de la API (GET /api/sivu/catalogs); cambian poco, se guardan 5 minutos. */
export function obtenerCatalogos(): Promise<Catalogos> {
  return cachedGet(
    "sivu-catalogos",
    () => api.get<{ data: Catalogos }>("/api/sivu/catalogs").then((res) => res.data),
    5 * 60_000
  );
}
