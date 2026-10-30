import { useEffect, useState } from "react";
import { cancelarOt, completarOt, listarAsignables, reasignarOt, type MiembroAsignable } from "../api/workOrders";
import { anularInspeccion, listarInspeccionesDeOt } from "../api/inspections";
import type { OtListada } from "../types/workOrder";
import type { InspeccionDeOt } from "../types/inspection";
import { Icon } from "./Icons";
import { fechaChile } from "../lib/dates";

/**
 * Gestión de una OT de Inspección en el panel de detalle (CC-050, CC-067):
 * las inspecciones de la OT (B17) para todos los roles y, para el Usuario
 * municipal, completar, cancelar, reasignar y anular una inspección
 * finalizada. Qué está permitido lo decide el backend: aquí solo se ofrece
 * cada acción en el estado en que tiene sentido y se muestra su respuesta.
 */
export function OtGestion({ ot, role, onChanged }: { ot: OtListada; role: string | null; onChanged: (mensaje: string) => void }) {
  const [inspecciones, setInspecciones] = useState<InspeccionDeOt[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [abierto, setAbierto] = useState<"completar" | "cancelar" | "reasignar" | null>(null);
  const [anulando, setAnulando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [asignables, setAsignables] = useState<MiembroAsignable[] | null>(null);
  const [nuevoResponsable, setNuevoResponsable] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const municipal = role === "usuario_municipal";
  const esInspeccion = ot.tipo_ot.codigo === "inspeccion";
  const abiertaOt = ["pendiente", "programada", "en_ejecucion"].includes(ot.estado.codigo);

  useEffect(() => {
    let cancelado = false;
    listarInspeccionesDeOt(ot.id)
      .then((r) => {
        if (cancelado) return;
        setInspecciones(r);
        setErrorLista(null);
      })
      .catch((e: unknown) => !cancelado && setErrorLista(e instanceof Error ? e.message : "No se pudieron cargar las inspecciones."));
    return () => {
      cancelado = true;
    };
  }, [ot.id, version]);

  useEffect(() => {
    if (abierto !== "reasignar" || asignables) return;
    listarAsignables(ot.proyecto.id, "inspector")
      .then(setAsignables)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudieron cargar los Inspectores del proyecto."));
  }, [abierto, asignables, ot.proyecto.id]);

  async function enviar(accion: () => Promise<unknown>, mensajeOk: string, recargarOt: boolean) {
    setEnviando(true);
    setError(null);
    setOk(null);
    try {
      await accion();
      // Si el tablero recarga la OT, el aviso lo muestra el tablero (un solo mensaje).
      if (!recargarOt) setOk(mensajeOk);
      setAbierto(null);
      setAnulando(null);
      setMotivo("");
      setVersion((v) => v + 1);
      if (recargarOt) onChanged(mensajeOk);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setEnviando(false);
    }
  }

  const otros = (asignables ?? []).filter((m) => m.id !== ot.responsable?.id);

  return (
    <div className="sivu-otg">
      <h3 className="sivu-otg__title">Inspecciones de la orden</h3>
      {errorLista && <p className="sivu-mant__muted">{errorLista}</p>}
      {!inspecciones && !errorLista && <p className="sivu-mant__muted">Cargando…</p>}
      {inspecciones && inspecciones.length === 0 && <p className="sivu-mant__muted">Todavía no hay inspecciones registradas.</p>}
      {inspecciones && inspecciones.length > 0 && (
        <ul className="sivu-otg__list">
          {inspecciones.map((i) => (
            <li key={i.inspection_id} className={`sivu-otg__insp is-${i.estado_registro}`}>
              <div className="sivu-otg__insp-row">
                <span className="sivu-mant__code">{i.codigo_inspeccion ?? "—"}</span>
                <span className="sivu-otg__estado">{estadoTexto(i.estado_registro)}</span>
              </div>
              <small>
                {i.finalizada_at ? `Finalizada el ${fechaChile(i.finalizada_at)}` : `Registrada el ${fechaChile(i.fecha_inspeccion)}`}
              </small>
              {i.estado_registro === "anulado" && i.motivo_anulacion && <small>Motivo de anulación: {i.motivo_anulacion}</small>}
              {municipal && i.estado_registro === "finalizado" && anulando !== i.inspection_id && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setAnulando(i.inspection_id), setMotivo(""))} disabled={enviando}>
                  Anular inspección
                </button>
              )}
              {anulando === i.inspection_id && (
                <div className="sivu-otg__form">
                  <label htmlFor={`anular-${i.inspection_id}`}>Motivo de la anulación</label>
                  <textarea id={`anular-${i.inspection_id}`} rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={enviando} />
                  <p className="sivu-otg__warn">
                    La inspección se conserva en el historial, pero deja de contar para la evaluación vigente del árbol.
                  </p>
                  <div className="sivu-mant__action-row">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAnulando(null)} disabled={enviando}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={enviando || !motivo.trim()}
                      onClick={() => enviar(() => anularInspeccion(i.inspection_id, motivo.trim()), "Inspección anulada.", true)}
                    >
                      {enviando ? "Anulando…" : "Anular"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {municipal && esInspeccion && abiertaOt && (
        <div className="sivu-otg__actions">
          {abierto === null && (
            <div className="sivu-mant__action-row">
              {ot.estado.codigo === "en_ejecucion" && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setAbierto("completar")} disabled={enviando}>
                  Completar la orden
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto("reasignar")} disabled={enviando}>
                Cambiar responsable
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setAbierto("cancelar"), setMotivo(""))} disabled={enviando}>
                Cancelar la orden
              </button>
            </div>
          )}

          {abierto === "completar" && (
            <div className="sivu-otg__form">
              <p>
                Al completar la orden, los datos de sus inspecciones finalizadas pasan a ser la evaluación vigente del árbol. Las
                inspecciones en borrador impiden completarla.
              </p>
              <div className="sivu-mant__action-row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(null)} disabled={enviando}>
                  Volver
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={enviando}
                  onClick={() => enviar(() => completarOt(ot.id), "Orden completada. El árbol ya tiene su evaluación vigente.", true)}
                >
                  {enviando ? "Completando…" : "Sí, completar"}
                </button>
              </div>
            </div>
          )}

          {abierto === "cancelar" && (
            <div className="sivu-otg__form">
              <label htmlFor="ot-motivo-cancelacion">Motivo de la cancelación</label>
              <textarea id="ot-motivo-cancelacion" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={enviando} />
              <p className="sivu-otg__warn">Una orden cancelada no se puede reabrir: si hace falta, se crea una nueva.</p>
              <div className="sivu-mant__action-row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(null)} disabled={enviando}>
                  Volver
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={enviando || !motivo.trim()}
                  onClick={() => enviar(() => cancelarOt(ot.id, motivo.trim()), "Orden cancelada.", true)}
                >
                  {enviando ? "Cancelando…" : "Cancelar la orden"}
                </button>
              </div>
            </div>
          )}

          {abierto === "reasignar" && (
            <div className="sivu-otg__form">
              <label htmlFor="ot-nuevo-responsable">Nuevo Inspector responsable</label>
              {!asignables && <p className="sivu-mant__muted">Cargando Inspectores…</p>}
              {asignables && otros.length === 0 && <p className="sivu-mant__muted">No hay otro Inspector en el proyecto.</p>}
              {asignables && otros.length > 0 && (
                <select id="ot-nuevo-responsable" value={nuevoResponsable} onChange={(e) => setNuevoResponsable(e.target.value)} disabled={enviando}>
                  <option value="">Elige un Inspector</option>
                  {otros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              )}
              <p className="sivu-otg__warn">Si hay un borrador, lo continúa el nuevo responsable; el anterior deja de tener acceso.</p>
              <div className="sivu-mant__action-row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(null)} disabled={enviando}>
                  Volver
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={enviando || !nuevoResponsable}
                  onClick={() => enviar(() => reasignarOt(ot.id, nuevoResponsable), "Responsable actualizado.", true)}
                >
                  {enviando ? "Guardando…" : "Cambiar responsable"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="sivu-newtree__error" role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      )}
      {ok && (
        <p className="sivu-state sivu-state--ok" role="status">
          {ok}
        </p>
      )}
    </div>
  );
}

/** Estado del registro (D-209) con mayúscula inicial; los códigos los define el backend. */
function estadoTexto(codigo: string): string {
  return codigo ? codigo.charAt(0).toUpperCase() + codigo.slice(1) : "—";
}
