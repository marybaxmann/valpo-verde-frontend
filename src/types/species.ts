/**
 * Catálogo de especies incorporado por el Inspector (CC-053; CATALOGO_ESPECIES,
 * D-257 a D-262). El catálogo es global: el proyecto de la ruta solo sirve
 * para que el backend verifique el acceso y el rol.
 */

/** Fila completa (`EspecieRow`, GET /api/sivu/projects/:id/species). */
export interface EspecieCatalogo {
  id: string;
  especie_cientifica: string;
  genero: string | null;
  familia: string | null;
  /** Código del dominio del Excel; su etiqueta aún no la entrega la API (B20). */
  origen_biogeografico: string | null;
  persistencia_follaje: string | null;
  tipo_hoja: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Body de PATCH .../species/:speciesId (completar). Un campo ausente no se
 * toca; `null` lo deja sin dato. Solo género y familia: los otros tres son
 * códigos de un dominio que el frontend no escribe (PR-021, B20).
 */
export interface CompletarEspecieInput {
  genero?: string | null;
  familia?: string | null;
}

/** Respuesta de PATCH .../species/:speciesId/nombre (corregir). */
export interface EspecieRenombrada {
  id: string;
  especie_cientifica: string;
  nombre_anterior: string;
}
