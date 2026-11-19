import { useEffect, useRef, useState } from "react";
import type { ArbolInventario } from "../../types/inventory";
import type { CampoMedida, CodigoEtiquetaPublico, FichaPublicaAmpliada, MedidaPublica, RespuestaFichaArbol } from "../../types/fichaPublica";
import {
  guardarFichaPublicaArbol,
  quitarFotoFichaPublica,
  subirFotoFichaPublica,
  verFichaPublicaArbol,
  type GuardarFichaArbol,
} from "../../api/fichaPublica";
import { ApiError } from "../../api/client";
import { Icon } from "../Icons";
import { VistaPreviaCiudadana } from "./VistaPreviaCiudadana";

type Interruptor = "mostrar_clase_edad" | "mostrar_altura_total" | "mostrar_dap" | "mostrar_diametro_copa" | "mostrar_rango_edad";
type Medida = keyof RespuestaFichaArbol["medidas_vigentes"];

/** Datos del ejemplar que el municipio puede publicar, uno por interruptor (CC-078, D-297 a D-301). */
const OPCIONALES: { interruptor: Interruptor; medida: Medida; etiqueta: string; dn: string; unidad?: string }[] = [
  { interruptor: "mostrar_clase_edad", medida: "clase_edad", etiqueta: "Clase de edad", dn: "D-25" },
  { interruptor: "mostrar_altura_total", medida: "altura_total_m", etiqueta: "Altura total", dn: "D-19", unidad: "m" },
  { interruptor: "mostrar_dap", medida: "dap_cm", etiqueta: "Diámetro del tronco (DAP)", dn: "D-18", unidad: "cm" },
  { interruptor: "mostrar_diametro_copa", medida: "diametro_copa_m", etiqueta: "Diámetro de copa", dn: "D-22", unidad: "m" },
  { interruptor: "mostrar_rango_edad", medida: "rango_edad_estimada_anios", etiqueta: "Rango de edad estimada", dn: "D-26" },
];

const NUNCA = [
  { titulo: "Riesgo y evaluaciones", nota: "Información técnica" },
  { titulo: "Órdenes de trabajo e incidencias", nota: "Uso interno" },
  { titulo: "Usuarios y reportantes", nota: "Datos personales" },
  { titulo: "Código del árbol y coordenadas", nota: "Basta la ubicación descriptiva" },
];

const MAX_HISTORIA = 1000;
const MAX_FUENTE = 300;

function mostrarValor(v: number | CodigoEtiquetaPublico | null, unidad?: string): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v.etiqueta;
  return `${v.toLocaleString("es-CL")}${unidad ? ` ${unidad}` : ""}`;
}

function borradorDe(r: RespuestaFichaArbol): GuardarFichaArbol {
  const f = r.ficha;
  return {
    mostrar_clase_edad: f.mostrar_clase_edad,
    mostrar_altura_total: f.mostrar_altura_total,
    mostrar_dap: f.mostrar_dap,
    mostrar_diametro_copa: f.mostrar_diametro_copa,
    mostrar_rango_edad: f.mostrar_rango_edad,
    historia: f.historia,
    historia_fuente: f.historia_fuente,
    textos_personalizados: f.textos_personalizados,
  };
}

/** Texto vacío → null; sin historia no hay fuente (D-303). */
function normalizar(b: GuardarFichaArbol): GuardarFichaArbol {
  const historia = b.historia?.trim() ? b.historia.trim() : null;
  const fuente = historia && b.historia_fuente?.trim() ? b.historia_fuente.trim() : null;
  return { ...b, historia, historia_fuente: fuente };
}

/**
 * Naturaleza y unidad de cada medida, igual que la ficha pública de la base
 * (`fn_ficha_publica_arbol`, 037) y sus rótulos en el backend (CC-078).
 */
const NATURALEZA = {
  medicion_o_estimacion: { codigo: "medicion_o_estimacion", etiqueta: "Medida en terreno o estimada con escala" },
  estimacion: { codigo: "estimacion", etiqueta: "Estimación" },
  clasificacion: { codigo: "clasificacion", etiqueta: "Clasificación del Inspector" },
};
const REGLA_MEDIDA: Record<Medida, { interruptor: Interruptor; unidad?: string; naturaleza: keyof typeof NATURALEZA }> = {
  clase_edad: { interruptor: "mostrar_clase_edad", naturaleza: "clasificacion" },
  altura_total_m: { interruptor: "mostrar_altura_total", unidad: "m", naturaleza: "medicion_o_estimacion" },
  dap_cm: { interruptor: "mostrar_dap", unidad: "cm", naturaleza: "medicion_o_estimacion" },
  diametro_copa_m: { interruptor: "mostrar_diametro_copa", unidad: "m", naturaleza: "medicion_o_estimacion" },
  rango_edad_estimada_anios: { interruptor: "mostrar_rango_edad", naturaleza: "estimacion" },
};

/**
 * Vista previa del borrador: la ficha publicada con lo que aún no se guarda
 * («Mi historia» y las medidas activadas). Solo se dibuja aquí; no se envía
 * nada hasta «Guardar y publicar». Misma regla que la base: una medida se
 * muestra si su interruptor está en Sí y tiene valor vigente.
 */
function fichaBorrador(r: RespuestaFichaArbol, b: GuardarFichaArbol): FichaPublicaAmpliada {
  const n = normalizar(b);
  const medidas: Partial<Record<CampoMedida, MedidaPublica>> = {};
  for (const campo of Object.keys(REGLA_MEDIDA) as Medida[]) {
    const regla = REGLA_MEDIDA[campo];
    const v = r.medidas_vigentes[campo];
    if (!n[regla.interruptor] || v === null || v === undefined) continue;
    const naturaleza = NATURALEZA[regla.naturaleza];
    medidas[campo] = typeof v === "object" ? { ...v, naturaleza } : { valor: Number(v), unidad: regla.unidad ?? "", naturaleza };
  }
  return { ...r.vista_previa, ejemplar: { historia: n.historia, historia_fuente: n.historia_fuente }, medidas };
}

const mismo = (a: GuardarFichaArbol, b: GuardarFichaArbol) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));

function mensajeError(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return "La API conectada todavía no tiene la ficha pública editable (CC-078).";
  if (err instanceof ApiError && err.status === 403) return "Tu rol puede ver la ficha, pero no editarla.";
  return err instanceof Error ? err.message : "No se pudo completar la operación.";
}

/**
 * Conecta → «Ficha pública»: edición de la ficha de cada árbol (CC-078;
 * PR-022 v3.0, PR-004 v8.0) con la vista previa del teléfono al lado.
 *
 * - Lo propio del árbol vive en su ficha pública (`tree_public_content`);
 *   guardar nunca cambia el inventario: ni el código del árbol, ni su QR,
 *   ni sus medidas. Los interruptores solo deciden qué medida vigente se
 *   muestra.
 * - Publica al guardar, sin borrador ni aprobación (decisión de la
 *   responsable). Editan el Usuario municipal y el Administrador; el resto
 *   de los roles ve la ficha en solo lectura. La autorización la decide el
 *   backend.
 * - La vista previa es la ficha tal como la entrega el backend.
 */
export function FichaPublicaEditor({
  projectId,
  arboles,
  puedeEditar,
}: {
  projectId: string;
  arboles: ArbolInventario[];
  puedeEditar: boolean;
}) {
  const [indice, setIndice] = useState(0);
  const arbol = arboles[Math.min(indice, arboles.length - 1)];
  const [datos, setDatos] = useState<{ id: string; r: RespuestaFichaArbol } | null>(null);
  const [errorCarga, setErrorCarga] = useState<{ id: string; mensaje: string } | null>(null);
  const [borrador, setBorrador] = useState<GuardarFichaArbol | null>(null);
  const [ocupado, setOcupado] = useState<null | "guardar" | "foto">(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  // Vista previa: el borrador (lo que se está editando) o lo publicado.
  const [verPublicada, setVerPublicada] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    verFichaPublicaArbol(projectId, arbol.id)
      .then((r) => {
        if (cancelado) return;
        setDatos({ id: arbol.id, r });
        setBorrador(borradorDe(r));
        setErrorCarga(null);
      })
      .catch((err: unknown) => !cancelado && setErrorCarga({ id: arbol.id, mensaje: mensajeError(err) }));
    return () => {
      cancelado = true;
    };
  }, [projectId, arbol.id]);

  const r = datos?.id === arbol.id ? datos.r : null;
  const error = errorCarga?.id === arbol.id ? errorCarga.mensaje : null;
  const b = r ? borrador : null;
  const cambios = !!(r && b && !mismo(b, borradorDe(r)));
  const editable = puedeEditar && !!r && !ocupado;
  const nombre = arbol.nombre_comun ?? arbol.especie_cientifica ?? "este árbol";
  const mostrarBorrador = cambios && !verPublicada;
  const previa = r ? (mostrarBorrador && b ? fichaBorrador(r, b) : r.vista_previa) : null;

  function irA(i: number) {
    if (cambios && !window.confirm("Hay cambios sin guardar en esta ficha. ¿Descartarlos?")) return;
    setAviso(null);
    setVerPublicada(false);
    setIndice(i);
  }

  function aplicar(r2: RespuestaFichaArbol, texto: string) {
    setDatos({ id: arbol.id, r: r2 });
    setBorrador(borradorDe(r2));
    setVerPublicada(false);
    setAviso({ tipo: "ok", texto });
  }

  async function guardar() {
    if (!b) return;
    setOcupado("guardar");
    setAviso(null);
    try {
      aplicar(await guardarFichaPublicaArbol(projectId, arbol.id, normalizar(b)), "Guardado y publicado.");
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setOcupado(null);
    }
  }

  async function subirFoto(f: File) {
    setOcupado("foto");
    setAviso(null);
    try {
      const r2 = await subirFotoFichaPublica(projectId, arbol.id, f);
      // La foto se publica sola; lo que estaba sin guardar en el formulario se conserva.
      setDatos({ id: arbol.id, r: r2 });
      setAviso({ tipo: "ok", texto: "Foto publicada." });
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setOcupado(null);
      if (archivo.current) archivo.current.value = "";
    }
  }

  async function quitarFoto() {
    if (!window.confirm("¿Quitar la foto de este árbol? La ficha vuelve a la foto referencial de la especie.")) return;
    setOcupado("foto");
    setAviso(null);
    try {
      await quitarFotoFichaPublica(projectId, arbol.id);
      setDatos({ id: arbol.id, r: await verFichaPublicaArbol(projectId, arbol.id) });
      setAviso({ tipo: "ok", texto: "Foto quitada." });
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setOcupado(null);
    }
  }

  const fijar = (cambio: Partial<GuardarFichaArbol>) => setBorrador((x) => (x ? { ...x, ...cambio } : x));

  return (
    <div className="sivu-fpe">
      <section className="sivu-panel sivu-fpe__main">
        <div className="sivu-fpe__picker">
          <button type="button" className="sivu-fpe__nav" aria-label="Árbol anterior" disabled={indice === 0} onClick={() => irA(indice - 1)}>
            <Icon name="chevron-left" size={16} />
          </button>
          <div className="sivu-fpe__who">
            <span className="sivu-fpe__code">{arbol.tree_code}</span>
            <select aria-label="Árbol" value={arbol.id} onChange={(e) => irA(arboles.findIndex((a) => a.id === e.target.value))}>
              {arboles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tree_code} · {a.nombre_comun ?? a.especie_cientifica ?? ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="sivu-fpe__nav"
            aria-label="Árbol siguiente"
            disabled={indice >= arboles.length - 1}
            onClick={() => irA(indice + 1)}
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        {error ? (
          <div className="sivu-fpe__notice" role="alert">
            <Icon name="alert" size={15} />
            <p>
              <strong>No se pudo cargar la ficha de {nombre}.</strong> {error}
            </p>
          </div>
        ) : (
          <div className="sivu-fpe__notice sivu-fpe__notice--info" role="note">
            <Icon name="eye" size={15} />
            <p>
              {puedeEditar ? (
                <>
                  <strong>Se publica al guardar.</strong> Lo que guardes se ve de inmediato al escanear la placa. Guardar no cambia el inventario:
                  ni el código del árbol, ni su QR, ni sus medidas.
                </>
              ) : (
                <>
                  <strong>Solo lectura.</strong> Editan la ficha el Usuario municipal y el Administrador.
                </>
              )}
            </p>
          </div>
        )}

        <h3 className="sivu-fpe__group">Siempre visible · desde el inventario</h3>
        <ul className="sivu-fpe__rows">
          {[
            { etiqueta: "Nombre común", dn: "D-14", valor: arbol.nombre_comun },
            { etiqueta: "Especie", dn: "D-13", valor: arbol.especie_cientifica, italica: true },
            { etiqueta: "Ubicación descriptiva", dn: "D-8", valor: arbol.ubicacion_descriptiva },
          ].map((f) => (
            <li key={f.dn} className="sivu-fpe__row">
              <span className="sivu-fpe__check" aria-hidden="true">
                <Icon name="check" size={13} />
              </span>
              <div>
                <strong>{f.etiqueta}</strong>
                <span className={f.italica ? "is-italic" : ""}>{f.valor ?? "Sin registro"}</span>
              </div>
              <code>{f.dn}</code>
            </li>
          ))}
          <li className="sivu-fpe__row">
            <span className="sivu-fpe__check" aria-hidden="true">
              <Icon name="check" size={13} />
            </span>
            <div>
              <strong>Contenido de la especie</strong>
              <span>Curiosidad, aportes, reconóceme, mi año y cuidados</span>
            </div>
            <code>D-280–295</code>
          </li>
        </ul>

        <h3 className="sivu-fpe__group">Datos del ejemplar que puedes mostrar</h3>
        <ul className="sivu-fpe__rows">
          {OPCIONALES.map((o) => {
            const v = r ? mostrarValor(r.medidas_vigentes[o.medida], o.unidad) : null;
            const on = !!b?.[o.interruptor];
            return (
              <li key={o.interruptor} className="sivu-fpe__row">
                <button
                  type="button"
                  className={`sivu-fpe__switch ${on ? "is-on" : ""}`}
                  role="switch"
                  aria-checked={on}
                  aria-label={`Mostrar ${o.etiqueta}`}
                  disabled={!editable}
                  onClick={() => fijar({ [o.interruptor]: !on })}
                />
                <div>
                  <strong>{o.etiqueta}</strong>
                  <span>
                    {!r && !error ? "Cargando…" : v ? `Vigente: ${v}` : on ? "Sin registro: no se mostrará" : "Sin registro en el inventario"}
                  </span>
                </div>
                <code>{o.dn}</code>
              </li>
            );
          })}
        </ul>

        <h3 className="sivu-fpe__group">Contenido propio de este árbol</h3>
        <div className="sivu-fpe__content">
          <div className="sivu-fpe__fields">
            <label className="sivu-fpe__field">
              <span>
                Mi historia <small>{(b?.historia ?? "").length}/{MAX_HISTORIA}</small>
              </span>
              <textarea
                rows={4}
                maxLength={MAX_HISTORIA}
                disabled={!editable}
                value={b?.historia ?? ""}
                onChange={(e) => fijar({ historia: e.target.value })}
                placeholder="Antecedentes verificables del ejemplar: quién lo plantó, un hecho que vivió…"
              />
            </label>
            <label className="sivu-fpe__field">
              <span>Fuente de la historia</span>
              <input
                type="text"
                maxLength={MAX_FUENTE}
                disabled={!editable || !b?.historia?.trim()}
                value={b?.historia_fuente ?? ""}
                onChange={(e) => fijar({ historia_fuente: e.target.value })}
                placeholder="Archivo, entrevista o publicación (no se muestra en la ficha)"
              />
            </label>
          </div>

          <div className="sivu-fpe__photo">
            {r?.ficha.foto ? (
              <img className="sivu-fpe__photo-img" src={r.ficha.foto.url} alt={`Foto pública de ${nombre}`} />
            ) : (
              <>
                <Icon name="camera" size={20} />
                <strong>Sin foto propia</strong>
                <span>La ficha usa la foto referencial de la especie.</span>
              </>
            )}
            {puedeEditar && (
              <div className="sivu-fpe__photo-actions">
                <input
                  ref={archivo}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])}
                />
                <button type="button" className="btn btn-secondary btn-sm" disabled={!editable} onClick={() => archivo.current?.click()}>
                  {ocupado === "foto" ? "Subiendo…" : r?.ficha.foto ? "Reemplazar" : "Subir foto"}
                </button>
                {r?.ficha.foto && (
                  <button type="button" className="btn btn-ghost btn-sm" disabled={!editable} onClick={quitarFoto}>
                    Quitar
                  </button>
                )}
              </div>
            )}
            {puedeEditar && <small>Sin personas ni patentes. Se publica al subirla, sin ubicación ni datos de cámara.</small>}
          </div>
        </div>

        {puedeEditar && (
          <div className="sivu-fpe__actions">
            {aviso && (
              <p className={`sivu-fpe__aviso ${aviso.tipo === "error" ? "is-error" : ""}`} role={aviso.tipo === "error" ? "alert" : "status"}>
                <Icon name={aviso.tipo === "error" ? "alert" : "check"} size={13} /> {aviso.texto}
              </p>
            )}
            {r?.ficha.updated_at && !aviso && (
              <span className="sivu-fpe__stamp">Última edición: {new Date(r.ficha.updated_at).toLocaleString("es-CL")}</span>
            )}
            <button type="button" className="btn btn-ghost btn-sm" disabled={!cambios || !!ocupado} onClick={() => r && setBorrador(borradorDe(r))}>
              Descartar
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!cambios || !editable} onClick={guardar}>
              {ocupado === "guardar" ? "Guardando…" : "Guardar y publicar"}
            </button>
          </div>
        )}

        <h3 className="sivu-fpe__group">Nunca se publica</h3>
        <ul className="sivu-fpe__never">
          {NUNCA.map((n) => (
            <li key={n.titulo}>
              <Icon name="lock" size={13} />
              <div>
                <strong>{n.titulo}</strong>
                <span>{n.nota}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="sivu-panel sivu-fpe__preview">
        <div className="sivu-fpe__phead">
          <h2>Vista previa</h2>
          {cambios ? (
            <div className="sivu-seg sivu-fpe__pseg" role="tablist" aria-label="Qué versión ver">
              {(
                [
                  [false, "Borrador"],
                  [true, "Publicada"],
                ] as [boolean, string][]
              ).map(([pub, label]) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={verPublicada === pub}
                  className={`sivu-seg__opt ${verPublicada === pub ? "is-on" : ""}`}
                  onClick={() => setVerPublicada(pub)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span>Así se ve al escanear su placa</span>
          )}
        </div>
        {mostrarBorrador && (
          <p className="sivu-fpe__draft" role="status">
            <Icon name="edit" size={13} /> Borrador sin publicar: así quedará al guardar.
          </p>
        )}
        <div className={mostrarBorrador ? "sivu-fpe__frame is-draft" : "sivu-fpe__frame"}>
          <VistaPreviaCiudadana projectId={projectId} arbol={arbol} publicada={previa} />
        </div>
      </aside>
    </div>
  );
}
