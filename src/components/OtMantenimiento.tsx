import { useEffect, useState } from "react";
import { cancelarOt, listarAsignables, type MiembroAsignable } from "../api/workOrders";
import { cambiarRevisor, listarEjecuciones, revisarEjecucion } from "../api/mantenimiento";
import type { OtListada } from "../types/workOrder";
import type { EjecucionMantenimiento } from "../types/mantenimiento";
import { Icon } from "./Icons";
import { RegistrarEjecucionModal } from "./RegistrarEjecucionModal";
import { fechaChile, hoyChile } from "../lib/dates";

/**
 * Una OT de Mantenimiento en el panel de detalle (#61; PR-020 v1.1;
 * contrato §5 bis): el historial de ejecuciones con sus fotos, para todos;
 * registrar la ejecución, para el Encargado responsable (cuando el backend
 * habilita `registrar_ejecucion`); aprobar o rechazar, para el Inspector
 * revisor asignado; cancelar y cambiar el revisor, para el Usuario
 * municipal. Qué está permitido lo decide el backend: aquí solo se ofrece
 * cada acción donde tiene sentido y se muestra su respuesta.
 */
export function OtMantenimiento({
  ot,
  role,
  userId,
  onChanged,
}: {
  ot: OtListada;
  role: string | null;
  userId: string | null;
  onChanged: (mensaje: string) => void;
}) {
  const [ejecuciones, setEjecuciones] = useState<EjecucionMantenimiento[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [registrando, setRegistrando] = useState(false);
  const [abierto, setAbierto] = useState<"cancelar" | "revisor" | "revisar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [inspectores, setInspectores] = useState<MiembroAsignable[] | null>(null);
  const [nuevoRevisor, setNuevoRevisor] = useState("");
  const [decision, setDecision] = useState<"aprobado" | "rechazado" | "">("");
  const [obsRevision, setObsRevision] = useState("");
  const [correccion, setCorreccion] = useState(false);
  const [fechaLimite, setFechaLimite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const municipal = role === "usuario_municipal";
  const abiertaOt = ["pendiente", "programada", "en_ejecucion"].includes(ot.estado.codigo);
  const pendiente = ejecuciones?.find((e) => e.estado_revision?.codigo === "pendiente_revision") ?? null;
  const soyRevisor = role === "inspector" && !!userId && ot.inspector_revisor?.id === userId;

  useEffect(() => {
    let cancelado = false;
    listarEjecuciones(ot.id)
      .then((r) => {
        if (cancelado) return;
        setEjecuciones(r);
        setErrorLista(null);
      })
      .catch((e: unknown) => !cancelado && setErrorLista(e instanceof Error ? e.message : "No se pudieron cargar las ejecuciones."));
    return () => {
      cancelado = true;
    };
  }, [ot.id, version]);

  useEffect(() => {
    if (abierto !== "revisor" || inspectores) return;
    listarAsignables(ot.proyecto.id, "inspector")
      .then(setInspectores)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudieron cargar los Inspectores del proyecto."));
  }, [abierto, inspectores, ot.proyecto.id]);

  async function enviar(accion: () => Promise<unknown>, mensajeOk: string) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      setAbierto(null);
      setMotivo("");
      setVersion((v) => v + 1);
      onChanged(mensajeOk);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setEnviando(false);
    }
  }

  const otrosInspectores = (inspectores ?? []).filter((m) => m.id !== ot.inspector_revisor?.id);
  const puedeRevisar =
    !!decision && !(decision === "rechazado" && !obsRevision.trim()) && !(correccion && !fechaLimite) && !enviando;

  return (
    <div className="sivu-otg">
      {ot.requiere_revision_inspector && (
        <p className="sivu-otm__revisor">
          <Icon name="eye" size={13} /> Inspector revisor:{" "}
          <strong>{ot.inspector_revisor?.nombre ?? "sin asignar"}</strong>
        </p>
      )}

      {ot.acciones.includes("registrar_ejecucion") && (
        <div className="sivu-mant__action">
          {pendiente ? (
            <p className="sivu-mant__muted">
              Tu registro {pendiente.codigo_mantenimiento ?? ""} espera la revisión del Inspector. Podrás registrar una corrección si
              la rechaza.
            </p>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setRegistrando(true)}>
              <Icon name="camera" size={14} /> Registrar la ejecución
            </button>
          )}
        </div>
      )}

      <h3 className="sivu-otg__title">Ejecuciones</h3>
      {errorLista && <p className="sivu-mant__muted">{errorLista}</p>}
      {!ejecuciones && !errorLista && <p className="sivu-mant__muted">Cargando…</p>}
      {ejecuciones && ejecuciones.length === 0 && <p className="sivu-mant__muted">Todavía no hay ejecuciones registradas.</p>}
      {ejecuciones && ejecuciones.length > 0 && (
        <ul className="sivu-otg__list">
          {ejecuciones.map((e) => (
            <li key={e.id} className={`sivu-otg__insp sivu-otm__ej is-${e.estado_revision?.codigo ?? "sin"}`}>
              <div className="sivu-otg__insp-row">
                <span className="sivu-mant__code">{e.codigo_mantenimiento ?? "—"}</span>
                {e.estado_revision && <span className="sivu-otm__badge">{e.estado_revision.etiqueta}</span>}
              </div>
              <small>
                {fechaChile(e.fecha_ejecucion)} · {e.resultado?.etiqueta ?? "—"}
                {e.subtipo_ejecutado ? ` · ${e.subtipo_ejecutado.etiqueta}` : ""}
              </small>
              {e.observaciones && <small>{e.observaciones}</small>}
              {e.requiere_seguimiento && e.fecha_seguimiento && <small>Seguimiento: {fechaChile(e.fecha_seguimiento)}</small>}
              {e.fotos.length > 0 && (
                <div className="sivu-otm__fotos">
                  {e.fotos.map((f, i) => (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer" aria-label={`Foto ${i + 1}`}>
                      <img src={f.url} alt={`Foto ${i + 1} de ${e.codigo_mantenimiento ?? "la ejecución"}`} loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {e.observaciones_revision && (
                <small className="sivu-otm__rev">
                  Revisión{e.fecha_revision ? ` del ${fechaChile(e.fecha_revision)}` : ""}: {e.observaciones_revision}
                </small>
              )}
              {e.requiere_correccion && e.fecha_limite_correccion && (
                <small className="sivu-otm__rev">Corrección hasta el {fechaChile(e.fecha_limite_correccion)}</small>
              )}
            </li>
          ))}
        </ul>
      )}

      {soyRevisor && pendiente && (
        <div className="sivu-otg__actions">
          {abierto !== "revisar" ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setAbierto("revisar")}>
              Revisar {pendiente.codigo_mantenimiento ?? "la ejecución"}
            </button>
          ) : (
            <div className="sivu-otg__form">
              <span className="sivu-otm__label">Tu revisión</span>
              <div className="sivu-otm__choice" role="radiogroup" aria-label="Resultado de la revisión">
                <label>
                  <input type="radio" name="decision" checked={decision === "aprobado"} onChange={() => setDecision("aprobado")} />
                  Aprobar
                </label>
                <label>
                  <input type="radio" name="decision" checked={decision === "rechazado"} onChange={() => setDecision("rechazado")} />
                  Rechazar
                </label>
              </div>
              <label htmlFor="rev-obs">
                Observaciones {decision === "rechazado" ? "(obligatorias al rechazar)" : "(opcional)"}
              </label>
              <textarea id="rev-obs" rows={2} value={obsRevision} onChange={(e) => setObsRevision(e.target.value)} disabled={enviando} />
              <label className="sivu-newot__check">
                <input type="checkbox" checked={correccion} onChange={(e) => setCorreccion(e.target.checked)} disabled={enviando} />
                Requiere corrección
              </label>
              {correccion && (
                <>
                  <label htmlFor="rev-limite">Fecha límite de la corrección</label>
                  <input
                    id="rev-limite"
                    type="date"
                    min={hoyChile()}
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    disabled={enviando}
                  />
                </>
              )}
              {decision === "aprobado" && (
                <p className="sivu-otg__warn">Al aprobar, la orden se completa. Solo se aprueba un resultado «Ejecutado completamente».</p>
              )}
              <div className="sivu-mant__action-row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(null)} disabled={enviando}>
                  Volver
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!puedeRevisar}
                  onClick={() =>
                    enviar(
                      () =>
                        revisarEjecucion(ot.id, pendiente.id, {
                          estado_revision: decision as "aprobado" | "rechazado",
                          observaciones_revision: obsRevision.trim() || null,
                          requiere_correccion: correccion,
                          fecha_limite_correccion: correccion ? fechaLimite : null,
                        }),
                      decision === "aprobado" ? "Ejecución aprobada." : "Ejecución rechazada."
                    )
                  }
                >
                  {enviando ? "Guardando…" : "Guardar revisión"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {municipal && abiertaOt && (
        <div className="sivu-otg__actions">
          {abierto === null && (
            <div className="sivu-mant__action-row">
              {ot.requiere_revision_inspector && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto("revisor")} disabled={enviando}>
                  Cambiar revisor
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setAbierto("cancelar"), setMotivo(""))} disabled={enviando}>
                Cancelar la orden
              </button>
            </div>
          )}

          {abierto === "cancelar" && (
            <div className="sivu-otg__form">
              <label htmlFor="otm-motivo-cancelacion">Motivo de la cancelación</label>
              <textarea id="otm-motivo-cancelacion" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={enviando} />
              <p className="sivu-otg__warn">Una orden cancelada no se puede reabrir: si hace falta, se crea una nueva.</p>
              <div className="sivu-mant__action-row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(null)} disabled={enviando}>
                  Volver
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={enviando || !motivo.trim()}
                  onClick={() => enviar(() => cancelarOt(ot.id, motivo.trim()), "Orden cancelada.")}
                >
                  {enviando ? "Cancelando…" : "Cancelar la orden"}
                </button>
              </div>
            </div>
          )}

          {abierto === "revisor" && (
            <div className="sivu-otg__form">
              <label htmlFor="otm-revisor-nuevo">Nuevo Inspector revisor</label>
              {!inspectores && <p className="sivu-mant__muted">Cargando Inspectores…</p>}
              {inspectores && otrosInspectores.length === 0 && <p className="sivu-mant__muted">No hay otro Inspector en el proyecto.</p>}
              {inspectores && otrosInspectores.length > 0 && (
                <select id="otm-revisor-nuevo" value={nuevoRevisor} onChange={(e) => setNuevoRevisor(e.target.value)} disabled={enviando}>
                  <option value="">Elige un Inspector</option>
                  {otrosInspectores.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              )}
              <div className="sivu-mant__action-row">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(null)} disabled={enviando}>
                  Volver
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={enviando || !nuevoRevisor}
                  onClick={() => enviar(() => cambiarRevisor(ot.id, nuevoRevisor), "Revisor actualizado.")}
                >
                  {enviando ? "Guardando…" : "Cambiar revisor"}
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

      {registrando && (
        <RegistrarEjecucionModal
          ot={ot}
          onClose={() => setRegistrando(false)}
          onRegistrada={(mensaje) => {
            setRegistrando(false);
            setVersion((v) => v + 1);
            onChanged(mensaje);
          }}
        />
      )}
    </div>
  );
}
