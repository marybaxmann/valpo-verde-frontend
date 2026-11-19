import { api } from "./client";
import type { FichaArbolEditable, RespuestaFichaArbol } from "../types/fichaPublica";

/**
 * Ficha pública editable de un árbol (CC-078; contrato-frontend §8 ter).
 * Ver: todos los miembros. Editar: Usuario municipal miembro y
 * Administrador; publica al guardar. La autorización la decide el backend.
 */
const ruta = (projectId: string, treeId: string) => `/api/sivu/projects/${projectId}/trees/${treeId}/ficha-publica`;

export function verFichaPublicaArbol(projectId: string, treeId: string): Promise<RespuestaFichaArbol> {
  return api.get<{ data: RespuestaFichaArbol }>(ruta(projectId, treeId)).then((r) => r.data);
}

/** Cuerpo del PUT: reemplazo completo, sin la foto (va por su propia ruta). */
export type GuardarFichaArbol = Omit<FichaArbolEditable, "foto" | "updated_by" | "updated_at">;

export function guardarFichaPublicaArbol(projectId: string, treeId: string, body: GuardarFichaArbol): Promise<RespuestaFichaArbol> {
  return api.put<{ data: RespuestaFichaArbol }>(ruta(projectId, treeId), body).then((r) => r.data);
}

export function subirFotoFichaPublica(projectId: string, treeId: string, archivo: File): Promise<RespuestaFichaArbol> {
  const form = new FormData();
  form.append("foto", archivo);
  return api.put<{ data: RespuestaFichaArbol }>(`${ruta(projectId, treeId)}/foto`, form).then((r) => r.data);
}

export function quitarFotoFichaPublica(projectId: string, treeId: string): Promise<void> {
  return api.delete(`${ruta(projectId, treeId)}/foto`);
}
