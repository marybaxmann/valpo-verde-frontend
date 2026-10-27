import { useEffect, useMemo, useState } from "react";
import { obtenerCatalogos } from "../api/catalogs";
import { crearOtInspeccion, listarAsignables, type MiembroAsignable } from "../api/workOrders";
import { listarInventarioCompleto } from "../api/inventory";
import { ApiError } from "../api/client";
import type { Catalogos } from "../types/catalogs";
import type { ArbolInventario } from "../types/inventory";
import { Modal } from "./Modal";
import { Icon } from "./Icons";

/** Códigos que acepta el body de la OT para la prioridad (sin «No determinado»). */
const PRIORIDADES_OT = ["baja", "media", "alta", "critica"];

/**
 * Crear una OT de Inspección (#58; D-238, D-244; CC-036). Solo el Usuario
 * municipal. Árbol desde B1, Inspector desde B14 y acción, subtipo y
 * prioridad desde los catálogos de la API (B15): el frontend no escribe
 * ningún catálogo. Las reglas (subtipo según la acción, árbol obligatorio
 * salvo Levantamiento, prioridad propuesta por la evaluación vigente) las
 * valida el backend; aquí solo se ordena el formulario.
 */
export function NewInspectionOrderModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [inspectores, setInspectores] = useState<MiembroAsignable[] | null>(null);
  const [arboles, setArboles] = useState<ArbolInventario[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [accion, setAccion] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [buscar, setBuscar] = useState("");
  const [arbolId, setArbolId] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([obtenerCatalogos(), listarAsignables(projectId, "inspector"), listarInventarioCompleto(projectId, {})])
      .then(([c, i, a]) => {
        if (cancelled) return;
        setCatalogos(c);
        setInspectores(i);
        setArboles(a);
        if (i.length === 1) setInspectorId(i[0].id);
      })
      .catch((err: unknown) => {
        if (!cancelled) setErrorCarga(mensaje(err, "No se pudo cargar lo necesario para crear la orden."));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const acciones = catalogos?.tipo_inspeccion_realizada ?? [];
  const subtipos = (catalogos?.subtipo_inspeccion ?? []).filter((s) => s.padre === accion);
  const prioridades = (catalogos?.clasificacion_prioridad ?? []).filter((p) => PRIORIDADES_OT.includes(p.codigo));
  const esLevantamiento = accion === "levantamiento";

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
  if (!esLevantamiento && !arbolId) faltan.push("el árbol");
  if (!inspectorId) faltan.push("el Inspector responsable");
  const puedeCrear = !!catalogos && faltan.length === 0 && !creando;

  async function crear() {
    if (!puedeCrear) return;
    setCreando(true);
    setErrorCrear(null);
    try {
      await crearOtInspeccion(projectId, {
        ...(esLevantamiento ? {} : { tree_id: arbolId }),
        accion_solicitada: accion,
        subtipo_accion: subtipos.length > 0 ? subtipo : null,
        ...(prioridad ? { prioridad } : {}),
        motivo: motivo.trim() || null,
        observaciones: observaciones.trim() || null,
        responsable_accion_id: inspectorId,
      });
      onCreated();
    } catch (err) {
      setErrorCrear(mensaje(err, "No se pudo crear la orden."));
      setCreando(false);
    }
  }

  const listo = catalogos && inspectores && arboles;

  return (
    <Modal
      title="Nueva orden de inspección"
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
      {!listo && !errorCarga && <p className="sivu-state">Cargando árboles, Inspectores y catálogos…</p>}

      {listo && (
        <div className="sivu-newot">
          <div className="field">
            <label htmlFor="ot-accion">Acción</label>
            <select
              id="ot-accion"
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
              <label htmlFor="ot-subtipo">Subtipo</label>
              <select id="ot-subtipo" value={subtipo} onChange={(e) => setSubtipo(e.target.value)} disabled={creando}>
                <option value="">Elige un subtipo</option>
                {subtipos.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          )}

          {esLevantamiento ? (
            <p className="sivu-newot__hint">El Levantamiento no se asigna a un árbol existente.</p>
          ) : (
            <div className="field">
              <label htmlFor="ot-buscar">Árbol</label>
              {arboles.length === 0 ? (
                <p className="sivu-state">El proyecto no tiene árboles registrados.</p>
              ) : (
                <>
                  <input
                    id="ot-buscar"
                    type="text"
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    placeholder="Código, especie o ubicación"
                    disabled={creando}
                  />
                  <select
                    aria-label="Árbol"
                    size={Math.min(5, Math.max(2, filtrados.length))}
                    value={arbolId}
                    onChange={(e) => setArbolId(e.target.value)}
                    disabled={creando}
                    className="sivu-newot__trees"
                  >
                    {filtrados.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.tree_code} · {a.especie_cientifica ?? "sin especie"}
                        {a.nombre_comun ? ` (${a.nombre_comun})` : ""}
                      </option>
                    ))}
                  </select>
                  {filtrados.length === 0 && <span className="hint">Ningún árbol coincide.</span>}
                  {arbolElegido?.ubicacion_descriptiva && <span className="hint">{arbolElegido.ubicacion_descriptiva}</span>}
                </>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="ot-inspector">Inspector responsable</label>
            {inspectores.length === 0 ? (
              <p className="sivu-state">El proyecto no tiene Inspectores. El Administrador debe agregar uno como miembro.</p>
            ) : (
              <select id="ot-inspector" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} disabled={creando}>
                <option value="">Elige un Inspector</option>
                {inspectores.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label htmlFor="ot-prioridad">
              Prioridad <span className="hint">(opcional si el árbol tiene evaluación vigente)</span>
            </label>
            <select id="ot-prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} disabled={creando}>
              <option value="">La propone el sistema</option>
              {prioridades.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="ot-motivo">
              Motivo <span className="hint">(opcional)</span>
            </label>
            <input id="ot-motivo" type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={creando} />
          </div>

          <div className="field">
            <label htmlFor="ot-obs">
              Observaciones <span className="hint">{esLevantamiento ? "(obligatorias en un Levantamiento)" : "(opcional)"}</span>
            </label>
            <textarea id="ot-obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} disabled={creando} />
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
  if (err instanceof ApiError && err.status === 403) return "Solo el Usuario municipal del proyecto crea órdenes de inspección.";
  return err instanceof Error && err.message ? err.message : porDefecto;
}
