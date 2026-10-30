import type { BorradorBody, CampoFormulario, CondicionActivacion, ValorCampo } from "../types/inspection";

/**
 * Formulario de inspección guiado por el esquema de B16. Aquí solo se
 * presenta: mostrar u ocultar según `condicion_activacion` (dato del
 * backend, no una regla escrita aquí), ordenar por la fila del Excel y
 * convertir lo escrito al body. Si la inspección está completa, qué falta y
 * todo resultado lo decide el backend en `/calcular` (CC-054).
 */

/**
 * Tipos de inspección con evaluación completa (REGLAS_GENERALES fila 28,
 * CC-040): usan el mismo esquema de B16. El Levantamiento con árbol nuevo
 * (CC-052) y el Monitoreo por subtipo esperan su contrato en el backend.
 */
export const TIPOS_CON_FORMULARIO: readonly string[] = ["evaluacion_inicial", "reevaluacion"];

/** Lo que guarda cada control: texto para números y listas, booleano o códigos. */
export type ValorCrudo = string | boolean | string[] | null;
export type ValoresCrudos = Record<string, ValorCrudo>;

/** Valor ya convertido al tipo del campo; `undefined` = sin registrar (no se envía). */
export function convertir(campo: CampoFormulario, crudo: ValorCrudo | undefined): ValorCampo | undefined {
  if (crudo === undefined || crudo === null) return undefined;
  switch (campo.tipo_entrada) {
    case "booleano":
      return typeof crudo === "boolean" ? crudo : undefined;
    case "decimal":
    case "entero": {
      if (typeof crudo !== "string" || !crudo.trim()) return undefined;
      const n = Number(crudo.replace(",", "."));
      return Number.isFinite(n) ? n : undefined;
    }
    case "lista_decimal": {
      if (typeof crudo !== "string" || !crudo.trim()) return undefined;
      const partes = crudo.split(/[;\s]+/).filter(Boolean).map((p) => Number(p.replace(",", ".")));
      return partes.every(Number.isFinite) ? partes : undefined;
    }
    case "seleccion_multiple":
      return Array.isArray(crudo) && crudo.length > 0 ? crudo : undefined;
    default:
      return typeof crudo === "string" && crudo.trim() ? crudo.trim() : undefined;
  }
}

/** Evalúa una condición de activación sobre los valores convertidos de todo el formulario. */
export function cumple(cond: CondicionActivacion | null, valores: Record<string, ValorCampo | undefined>): boolean {
  if (!cond) return true;
  switch (cond.op) {
    case "siempre":
      return true;
    case "igual": {
      const v = valores[cond.campo];
      return Array.isArray(v) ? (v as unknown[]).includes(cond.valor) : v === cond.valor;
    }
    case "no_verdadero":
      return valores[cond.campo] !== true;
    case "mayor_que": {
      const v = valores[cond.campo];
      return typeof v === "number" && v > cond.valor;
    }
    case "menor_que": {
      const v = valores[cond.campo];
      return typeof v === "number" && v < cond.valor;
    }
    case "mas_de_un_valor": {
      const v = valores[cond.campo];
      return Array.isArray(v) && v.length > 1;
    }
    case "y":
      return cond.condiciones.every((c) => cumple(c, valores));
    case "o":
      return cond.condiciones.some((c) => cumple(c, valores));
    default:
      // Una condición que el frontend no conoce no oculta el campo.
      return true;
  }
}

function camposDe(cond: CondicionActivacion | null): string[] {
  if (!cond) return [];
  if (cond.op === "y" || cond.op === "o") return cond.condiciones.flatMap(camposDe);
  return "campo" in cond ? [cond.campo] : [];
}

/**
 * Orden de presentación: la fila del Excel (`orden`). Los campos sin fila
 * (banderas «no presenta») van junto al campo que los nombra como `marca`,
 * o justo antes del primero cuya condición depende de ellos.
 */
export function ordenar(campos: CampoFormulario[]): CampoFormulario[] {
  const conFila = campos.filter((c) => c.orden !== null).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const resultado = [...conFila];
  for (const suelto of campos.filter((c) => c.orden === null)) {
    const dueño = resultado.findIndex((c) => c.marca === suelto.identificador);
    if (dueño >= 0) {
      resultado.splice(dueño + 1, 0, suelto);
      continue;
    }
    const depende = resultado.findIndex((c) => camposDe(c.condicion_activacion).includes(suelto.identificador));
    if (depende >= 0) resultado.splice(depende, 0, suelto);
    else resultado.push(suelto);
  }
  return resultado;
}

/** Valores convertidos de todos los campos (para evaluar condiciones entre bloques). */
export function valoresConvertidos(campos: CampoFormulario[], crudos: ValoresCrudos): Record<string, ValorCampo | undefined> {
  const out: Record<string, ValorCampo | undefined> = {};
  for (const c of campos) out[c.identificador] = convertir(c, crudos[c.identificador]);
  return out;
}

/**
 * Body del borrador con el estado completo: solo los campos visibles y con
 * valor. Un campo vacío u oculto no se envía («no registrado todavía»).
 */
export function armarBody(
  variables: CampoFormulario[],
  camposArbol: CampoFormulario[],
  crudos: ValoresCrudos,
  tipo: string,
  subtipo: string | null
): BorradorBody {
  const todos = valoresConvertidos([...variables, ...camposArbol], crudos);
  const bloque = (campos: CampoFormulario[]) => {
    const out: Record<string, ValorCampo> = {};
    for (const c of campos) {
      const v = todos[c.identificador];
      if (v !== undefined && cumple(c.condicion_activacion, todos)) out[c.identificador] = v;
    }
    return out;
  };
  return {
    tipo_inspeccion_realizada: tipo,
    subtipo_inspeccion: subtipo,
    variables: bloque(variables),
    campos_arbol: bloque(camposArbol),
  };
}

/** Texto escrito que no se pudo convertir (número mal escrito). */
export function valorInvalido(campo: CampoFormulario, crudo: ValorCrudo | undefined): boolean {
  if (typeof crudo !== "string" || !crudo.trim()) return false;
  return (
    ["decimal", "entero", "lista_decimal"].includes(campo.tipo_entrada ?? "") && convertir(campo, crudo) === undefined
  );
}

/** Nombre técnico sin etiqueta en el esquema → texto legible («fotografias_arbol» → «Fotografias arbol»). */
export function nombreLegible(id: string): string {
  const t = id.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
