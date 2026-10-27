/** Un valor de catálogo (PR-021): se guarda el `codigo`, se muestra la `etiqueta`. */
export interface CatalogoItem {
  codigo: string;
  etiqueta: string;
  orden: number;
  /** Código del valor del que depende (p. ej. el subtipo depende de la acción). */
  padre: string | null;
}

/** GET /api/sivu/catalogs: catálogos por nombre. */
export type Catalogos = Record<string, CatalogoItem[]>;
