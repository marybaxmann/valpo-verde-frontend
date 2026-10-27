import { api } from "./client";
import type {
  BorradorBody,
  BorradorResultado,
  CalculoRespuesta,
  EsquemaFormulario,
  FinalizacionRespuesta,
  FotoInspeccion,
  VistaFoto,
} from "../types/inspection";

/**
 * Inspección del Inspector (Evaluación inicial). Las reglas (quién puede,
 * qué falta, qué se calcula) las decide el backend; aquí solo se llama.
 */

/** B16 — campos del formulario, sus opciones y condiciones (solo Evaluación inicial). */
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

/** No escribe nada: devuelve resultados, faltantes y la `huella` para finalizar (CC-054). */
export function calcularInspeccion(inspectionId: string): Promise<CalculoRespuesta> {
  return api
    .post<{ data: CalculoRespuesta }>(`/api/sivu/inspections/${inspectionId}/calcular`, {})
    .then((res) => res.data);
}

/**
 * Finaliza con la `huella` del último cálculo. Sin ajustes ni fechas: el
 * backend usa las fechas sugeridas (los ajustes llegan en otro paso).
 */
export function finalizarInspeccion(inspectionId: string, huella: string): Promise<FinalizacionRespuesta> {
  return api
    .post<{ data: FinalizacionRespuesta }>(`/api/sivu/inspections/${inspectionId}/finalizar`, { huella })
    .then((res) => res.data);
}
