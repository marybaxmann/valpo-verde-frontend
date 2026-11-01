import { useEffect, useMemo, useState } from "react";
import { obtenerCatalogos } from "../api/catalogs";
import { listarAsignables, type MiembroAsignable } from "../api/workOrders";
import { crearOtMantenimiento } from "../api/mantenimiento";
import { listarInventarioCompleto } from "../api/inventory";
import { ApiError } from "../api/client";
import type { Catalogos } from "../types/catalogs";
import type { ArbolInventario } from "../types/inventory";
import { Modal } from "./Modal";
import { Icon } from "./Icons";

/** Códigos que acepta el body de la OT para la prioridad (sin «No determinado»). */
const PRIORIDADES_OT = ["baja", "media", "alta", "critica"];

/**
 * Crear una OT de Mantenimiento (#61; PR-020 v1.1; D-233 a D-246). Solo el
 * Usuario municipal. Árbol desde B1, Encargado e Inspector revisor desde
 * B14, acción, subtipo y prioridad desde los catálogos (B15). Las reglas
 * (subtipo según la acción, revisión siempre en Tala y Retiro de tocón,
 * observaciones con «Otra intervención») las valida el backend y su mensaje
 * se muestra tal cual.
 */
export function NewMaintenanceOrderModal({
  projectId,
  arbolInicial,
  onClose,
  onCreated,
}: {
  projectId: string;
  /** Árbol ya elegido (por ejemplo, desde su ficha). */
  arbolInicial?: string;
  onClose: () => void;
  onCreated: (codigo: string | null) => void;
}) {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [encargados, setEncargados] = useState<MiembroAsignable[] | null>(null);
  const [inspectores, setInspectores] = useState<MiembroAsignable[] | null>(null);
  const [arboles, setArboles] = useState<ArbolInventario[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [accion, setAccion] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [buscar, setBuscar] = useState("");
  const [arbolId, setArbolId] = useState(arbolInicial ?? "");
  const [encargadoId, setEncargadoId] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [conRevision, setConRevision] = useState(false);
  const [revisorId, setRevisorId] = useState("");

  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      obtenerCatalogos(),
      listarAsignables(projectId, "encargado_mantencion"),
      listarAsignables(projectId, "inspector"),
      listarInventarioCompleto(projectId, {}),
    ])
      .then(([c, e, i, a]) => {
        if (cancelled) return;
        setCatalogos(c);
        setEncargados(e);
        setInspectores(i);
        setArboles(a);
        if (e.length === 1) setEncargadoId(e[0].id);
      })
      .catch((err: unknown) => {
        if (!cancelled) setErrorCarga(mensaje(err, "No se pudo cargar lo necesario para crear la orden."));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const acciones = catalogos?.accion_mantenimiento ?? [];
  const subtipos = (catalogos?.subtipo_mantenimiento ?? []).filter((s) => s.padre === accion);
  const prioridades = (catalogos?.clasificacion_prioridad ?? []).filter((p) => PRIORIDADES_OT.includes(p.codigo));

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const lista = arboles ?? [];
    if (!q) return lista.slice(0, 50);
    return lista
      .filter((a) =>
        [a.tree_code, a.especie_cientifica, a.nombre_comun, a.ubicacion_descriptiva].some((v) => v?.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [arboles, buscar]);

  const arbolElegido = arboles?.find((a) => a.id === arbolId) ?? null;
  const faltan: string[] = [];
  if (!accion) faltan.push("la acción");
  if (subtipos.length > 0 && !subtipo) faltan.push("el subtipo");
  if (!arbolId) faltan.push("el árbol");
  if (!prioridad) faltan.push("la prioridad");
  if (!encargadoId) faltan.push("el Encargado responsable");
  if (conRevision && !revisorId) faltan.push("el Inspector revisor");
  const puedeCrear = !!catalogos && faltan.length === 0 && !creando;

  async function crear() {
    if (!puedeCrear) return;
    setCreando(true);
    setErrorCrear(null);
    try {
      const ot = await crearOtMantenimiento(projectId, {
        tree_id: arbolId,
        accion_solicitada: accion,
        subtipo_accion: subtipos.length > 0 ? subtipo : null,
        prioridad,
        motivo: motivo.trim() || null,
        observaciones: observaciones.trim() || null,
        responsable_accion_id: encargadoId,
        requiere_revision_inspector: conRevision,
        inspector_revisor_id: conRevision ? revisorId : null,
      });
      onCreated(ot.codigo_ot);
    } catch (err) {
      setErrorCrear(mensaje(err, "No se pudo crear la orden."));
      setCreando(false);
    }
  }

  const listo = catalogos && encargados && inspectores && arboles;

  return (
    <Modal
      title="Nueva orden de mantenimiento"
      onClose={creando ? () => {} : onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={creando}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={crear} disabled={!puedeCrear}>
            {creando ? "Creando…" : "Crear orden"}
          </button>
        </>
      }
    >
      {errorCarga && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {errorCarga}
        </p>
      )}
      {!listo && !errorCarga && <p className="sivu-state">Cargando árboles, responsables y catálogos…</p>}

      {listo && (
        <div className="sivu-newot">
          <div className="field">
            <label htmlFor="otm-accion">Acción</label>
            <select
              id="otm-accion"
              value={accion}
              onChange={(e) => {
                setAccion(e.target.value);
                setSubtipo("");
              }}
              disabled={creando}
            >
              <option value="">Elige una acción</option>
              {acciones.map((a) => (
                <option key={a.codigo} value={a.codigo}>
                  {a.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {subtipos.length > 0 && (
            <div className="field">
              <label htmlFor="otm-subtipo">Subtipo</label>
              <select id="otm-subtipo" value={subtipo} onChange={(e) => setSubtipo(e.target.value)} disabled={creando}>
                <option value="">Elige un subtipo</option>
                {subtipos.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="otm-buscar">Árbol</label>
            {arboles.length === 0 ? (
              <p className="sivu-state">El proyecto no tiene árboles registrados.</p>
            ) : (
              <>
                <input
                  id="otm-buscar"
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Código, especie o ubicación"
                  disabled={creando}
                />
                <ul className="sivu-newot__trees" aria-label="Árboles">
                  {filtrados.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        aria-pressed={arbolId === a.id}
                        className={arbolId === a.id ? "is-on" : ""}
                        onClick={() => setArbolId(a.id)}
                        disabled={creando}
                      >
                        <strong>{a.tree_code}</strong> · {a.especie_cientifica ?? "sin especie"}
                        {a.nombre_comun ? ` (${a.nombre_comun})` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
                {filtrados.length === 0 && <span className="hint">Ningún árbol coincide.</span>}
                {arbolElegido?.ubicacion_descriptiva && <span className="hint">{arbolElegido.ubicacion_descriptiva}</span>}
              </>
            )}
          </div>

          <div className="field">
            <label htmlFor="otm-encargado">Encargado de mantención</label>
            {encargados.length === 0 ? (
              <p className="sivu-state">
                El proyecto no tiene Encargados de mantención. El Administrador debe agregar uno como miembro.
              </p>
            ) : (
              <select id="otm-encargado" value={encargadoId} onChange={(e) => setEncargadoId(e.target.value)} disabled={creando}>
                <option value="">Elige un Encargado</option>
                {encargados.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label htmlFor="otm-prioridad">Prioridad</label>
            <select id="otm-prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} disabled={creando}>
              <option value="">Elige la prioridad</option>
              {prioridades.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="sivu-newot__check">
              <input
                type="checkbox"
                checked={conRevision}
                onChange={(e) => {
                  setConRevision(e.target.checked);
                  if (!e.target.checked) setRevisorId("");
                }}
                disabled={creando}
              />
              Requiere revisión de un Inspector
            </label>
            <span className="hint">La Tala y el Retiro de tocón siempre la requieren (PR-020).</span>
          </div>

          {conRevision && (
            <div className="field">
              <label htmlFor="otm-revisor">Inspector revisor</label>
              {inspectores.length === 0 ? (
                <p className="sivu-state">El proyecto no tiene Inspectores. El Administrador debe agregar uno como miembro.</p>
              ) : (
                <select id="otm-revisor" value={revisorId} onChange={(e) => setRevisorId(e.target.value)} disabled={creando}>
                  <option value="">Elige un Inspector</option>
                  {inspectores.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="otm-motivo">
              Motivo <span className="hint">(opcional)</span>
            </label>
            <input id="otm-motivo" type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={creando} />
          </div>

          <div className="field">
            <label htmlFor="otm-obs">
              Observaciones{" "}
              <span className="hint">{accion === "otra_intervencion" ? "(obligatorias: describe la intervención)" : "(opcional)"}</span>
            </label>
            <textarea id="otm-obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} disabled={creando} />
          </div>

          {errorCrear && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {errorCrear}
            </p>
          )}
          {!creando && faltan.length > 0 && <p className="sivu-newot__hint">Falta elegir {faltan.join(", ")}.</p>}
        </div>
      )}
    </Modal>
  );
}

function mensaje(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError && err.status === 403) return "Solo el Usuario municipal del proyecto crea órdenes de mantenimiento.";
  return err instanceof Error && err.message ? err.message : porDefecto;
}
