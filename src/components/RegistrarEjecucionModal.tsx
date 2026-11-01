import { useEffect, useRef, useState } from "react";
import { obtenerCatalogos } from "../api/catalogs";
import { registrarEjecucion } from "../api/mantenimiento";
import type { Catalogos } from "../types/catalogs";
import type { OtListada } from "../types/workOrder";
import { Modal } from "./Modal";
import { Icon } from "./Icons";
import { hoyChile } from "../lib/dates";
import { reducirFoto, tamano } from "../lib/fotos";

/** Límites del backend (contrato §5 bis): 1 a 10 fotos JPG o PNG. */
const MAX_FOTOS = 10;

interface FotoLista {
  id: string;
  archivo: Blob;
  nombre: string;
  vista: string;
}

/**
 * Registrar la ejecución de una OT de Mantenimiento (Encargado responsable,
 * OT en ejecución; PR-020 v1.1; D-216 a D-224). La acción ejecutada es la
 * solicitada (el backend lo exige); resultado y subtipo salen de los
 * catálogos. Sin revisión y con «Ejecutado completamente», el Sistema
 * completa la OT; con revisión, queda pendiente del Inspector.
 */
export function RegistrarEjecucionModal({
  ot,
  onClose,
  onRegistrada,
}: {
  ot: OtListada;
  onClose: () => void;
  onRegistrada: (mensaje: string) => void;
}) {
  const hoy = hoyChile();
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [fecha, setFecha] = useState(hoy);
  const [subtipo, setSubtipo] = useState(ot.subtipo?.codigo ?? "");
  const [resultado, setResultado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [seguimiento, setSeguimiento] = useState(false);
  const [fechaSeguimiento, setFechaSeguimiento] = useState("");
  const [fotos, setFotos] = useState<FotoLista[]>([]);
  const [preparando, setPreparando] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerCatalogos()
      .then((c) => !cancelado && setCatalogos(c))
      .catch((e: unknown) => !cancelado && setErrorCarga(e instanceof Error ? e.message : "No se pudieron cargar los catálogos."));
    return () => {
      cancelado = true;
    };
  }, []);

  // Las vistas previas usan URL locales: se liberan al cerrar.
  const fotosRef = useRef(fotos);
  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.vista)), []);

  const subtipos = (catalogos?.subtipo_mantenimiento ?? []).filter((s) => s.padre === ot.accion.codigo);
  const resultados = catalogos?.resultado_mantenimiento ?? [];
  const pesoTotal = fotos.reduce((s, f) => s + f.archivo.size, 0);

  async function agregar(lista: FileList | null) {
    if (!lista?.length) return;
    setPreparando(true);
    setError(null);
    try {
      const nuevas: FotoLista[] = [];
      for (const archivo of Array.from(lista).slice(0, MAX_FOTOS - fotos.length)) {
        const reducida = await reducirFoto(archivo);
        nuevas.push({ id: crypto.randomUUID(), archivo: reducida, nombre: archivo.name, vista: URL.createObjectURL(reducida) });
      }
      setFotos((prev) => [...prev, ...nuevas]);
    } catch {
      setError("No se pudo preparar una de las fotos. Prueba con otra en JPG o PNG.");
    } finally {
      setPreparando(false);
    }
  }

  function quitar(id: string) {
    setFotos((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.vista);
      return prev.filter((x) => x.id !== id);
    });
  }

  const faltan: string[] = [];
  if (!fecha) faltan.push("la fecha");
  if (subtipos.length > 0 && !subtipo) faltan.push("el subtipo ejecutado");
  if (!resultado) faltan.push("el resultado");
  if (seguimiento && !fechaSeguimiento) faltan.push("la fecha de seguimiento");
  if (fotos.length === 0) faltan.push("al menos una foto");
  const puedeEnviar = !!catalogos && faltan.length === 0 && !enviando && !preparando;

  async function enviar() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await registrarEjecucion(
        ot.id,
        {
          fecha_ejecucion: fecha,
          accion_ejecutada: ot.accion.codigo,
          ...(subtipos.length > 0 ? { subtipo_ejecutado: subtipo } : {}),
          resultado,
          ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
          requiere_seguimiento: String(seguimiento),
          ...(seguimiento ? { fecha_seguimiento: fechaSeguimiento } : {}),
        },
        fotos.map((f) => f.archivo)
      );
      const codigo = r.codigo_mantenimiento ?? "La ejecución";
      onRegistrada(
        r.estado_ot === "completada"
          ? `${codigo} registrada. La orden quedó completada.`
          : r.estado_revision === "pendiente_revision"
            ? `${codigo} registrada. Queda pendiente de la revisión del Inspector.`
            : `${codigo} registrada.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la ejecución.");
      setEnviando(false);
    }
  }

  return (
    <Modal
      title={`Registrar ejecución · ${ot.codigo_ot ?? "orden"}`}
      onClose={enviando ? () => {} : onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={enviar} disabled={!puedeEnviar}>
            {enviando ? "Enviando…" : "Registrar ejecución"}
          </button>
        </>
      }
    >
      {errorCarga && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {errorCarga}
        </p>
      )}
      {!catalogos && !errorCarga && <p className="sivu-state">Cargando catálogos…</p>}

      {catalogos && (
        <div className="sivu-newot">
          <p className="sivu-newot__hint">
            <strong>{ot.accion.etiqueta}</strong>
            {ot.arbol ? ` · ${ot.arbol.tree_code}${ot.arbol.nombre_comun ? ` (${ot.arbol.nombre_comun})` : ""}` : ""}
          </p>

          <div className="field">
            <label htmlFor="ej-fecha">Fecha de ejecución</label>
            <input id="ej-fecha" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={enviando} />
          </div>

          {subtipos.length > 0 && (
            <div className="field">
              <label htmlFor="ej-subtipo">Subtipo ejecutado</label>
              <select id="ej-subtipo" value={subtipo} onChange={(e) => setSubtipo(e.target.value)} disabled={enviando}>
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
            <label htmlFor="ej-resultado">Resultado</label>
            <select id="ej-resultado" value={resultado} onChange={(e) => setResultado(e.target.value)} disabled={enviando}>
              <option value="">Elige el resultado</option>
              {resultados.map((r) => (
                <option key={r.codigo} value={r.codigo}>
                  {r.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span className="field__label">
              Fotos <span className="hint">(1 a {MAX_FOTOS})</span>
            </span>
            {fotos.length > 0 && (
              <ul className="sivu-otm__fotos sivu-otm__fotos--edit">
                {fotos.map((f) => (
                  <li key={f.id}>
                    <img src={f.vista} alt={f.nombre} />
                    <button type="button" onClick={() => quitar(f.id)} aria-label={`Quitar ${f.nombre}`} disabled={enviando}>
                      <Icon name="close" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fotos.length < MAX_FOTOS && (
              <label className={`btn btn-secondary btn-sm sivu-otm__add ${enviando || preparando ? "is-disabled" : ""}`}>
                <Icon name="camera" size={14} /> {preparando ? "Preparando…" : fotos.length ? "Agregar más fotos" : "Tomar o elegir fotos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  hidden
                  disabled={enviando || preparando}
                  onChange={(e) => {
                    void agregar(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {fotos.length > 0 && <span className="hint">Listas para enviar: {tamano(pesoTotal)}</span>}
          </div>

          <div className="field">
            <label htmlFor="ej-obs">
              Observaciones <span className="hint">(opcional)</span>
            </label>
            <textarea id="ej-obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} disabled={enviando} />
          </div>

          <div className="field">
            <label className="sivu-newot__check">
              <input
                type="checkbox"
                checked={seguimiento}
                onChange={(e) => {
                  setSeguimiento(e.target.checked);
                  if (!e.target.checked) setFechaSeguimiento("");
                }}
                disabled={enviando}
              />
              Requiere seguimiento
            </label>
          </div>
          {seguimiento && (
            <div className="field">
              <label htmlFor="ej-seg">Fecha de seguimiento (posterior a la ejecución)</label>
              <input
                id="ej-seg"
                type="date"
                min={fecha || hoy}
                value={fechaSeguimiento}
                onChange={(e) => setFechaSeguimiento(e.target.value)}
                disabled={enviando}
              />
            </div>
          )}

          {ot.requiere_revision_inspector && (
            <p className="sivu-newot__hint">Esta orden tiene revisión: tu registro quedará pendiente hasta que el Inspector lo apruebe.</p>
          )}

          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!enviando && faltan.length > 0 && <p className="sivu-newot__hint">Falta {faltan.join(", ")}.</p>}
        </div>
      )}
    </Modal>
  );
}
