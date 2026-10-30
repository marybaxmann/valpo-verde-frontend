import { api } from "./client";
import type {
  AjustesBody,
  BorradorBody,
  BorradorResultado,
  CalculoRespuesta,
  EsquemaFormulario,
  FinalizacionRespuesta,
  FinalizarBody,
  FotoInspeccion,
  InspeccionDeOt,
  VistaFoto,
} from "../types/inspection";

/**
 * Inspección del Inspector (Evaluación inicial y Reevaluación: misma
 * evaluación completa, CC-040). Las reglas (quién puede, qué falta, qué se
 * calcula) las decide el backend; aquí solo se llama.
 */

/** B16 — campos del formulario de la evaluación completa, sus opciones, secciones y condiciones. */
export function obtenerEsquemaFormulario(projectId: string): Promise<EsquemaFormulario> {
  return api
    .get<{ data: EsquemaFormulario }>(`/api/sivu/projects/${projectId}/inspection-form-schema?tipo=evaluacion_inicial`)
    .then((res) => res.data);
}

/** Primer guardado: crea el borrador (Preguardado). El árbol lo resuelve el backend desde la OT. */
export function crearBorrador(workOrderId: string, body: BorradorBody): Promise<BorradorResultado> {
  return api
    .post<{ data: BorradorResultado }>(`/api/sivu/work-orders/${workOrderId}/inspections`, body)
    .then((res) => res.data);
}

/** Guardados siguientes: el body trae el estado COMPLETO del borrador. */
export function guardarBorrador(inspectionId: string, body: BorradorBody): Promise<BorradorResultado> {
  return api.patch<{ data: BorradorResultado }>(`/api/sivu/inspections/${inspectionId}`, body).then((res) => res.data);
}

export function listarFotos(inspectionId: string): Promise<FotoInspeccion[]> {
  return api.get<{ data: FotoInspeccion[] }>(`/api/sivu/inspections/${inspectionId}/photos`).then((res) => res.data);
}

/** Una foto por llamada (JPG o PNG, hasta 10 MB; lo verifica el backend). */
export function subirFoto(inspectionId: string, vista: VistaFoto, archivo: File): Promise<unknown> {
  const form = new FormData();
  form.append("vista", vista);
  form.append("foto", archivo);
  return api.post(`/api/sivu/inspections/${inspectionId}/photos`, form);
}

/** No escribe nada: devuelve resultados, faltantes y la `huella` para finalizar (CC-054). Con ajustes, muestra su efecto. */
export function calcularInspeccion(inspectionId: string, ajustes?: AjustesBody): Promise<CalculoRespuesta> {
  return api
    .post<{ data: CalculoRespuesta }>(`/api/sivu/inspections/${inspectionId}/calcular`, ajustes ? { ajustes } : {})
    .then((res) => res.data);
}

/**
 * Finaliza con la `huella` del último cálculo. Los ajustes se envían de
 * nuevo (no forman parte de la huella). Sin fechas, el backend usa las
 * sugeridas; una fecha distinta exige su justificación (D-204).
 */
export function finalizarInspeccion(inspectionId: string, body: FinalizarBody): Promise<FinalizacionRespuesta> {
  return api
    .post<{ data: FinalizacionRespuesta }>(`/api/sivu/inspections/${inspectionId}/finalizar`, body)
    .then((res) => res.data);
}

/** B17 — inspecciones de una OT, con lo registrado en cada una, para retomar el borrador desde cualquier equipo. */
export function listarInspeccionesDeOt(workOrderId: string): Promise<InspeccionDeOt[]> {
  return api.get<{ data: InspeccionDeOt[] }>(`/api/sivu/work-orders/${workOrderId}/inspections`).then((res) => res.data);
}

/** Anula una inspección finalizada con su motivo (solo Usuario municipal; CC-067, D-210). */
export function anularInspeccion(inspectionId: string, motivo_anulacion: string): Promise<unknown> {
  return api.post<{ data: unknown }>(`/api/sivu/inspections/${inspectionId}/anular`, { motivo_anulacion }).then((res) => res.data);
}
