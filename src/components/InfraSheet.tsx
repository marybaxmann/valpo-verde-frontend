import { useEffect, useState } from "react";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarInspeccionesDeOt, obtenerEsquemaFormulario } from "../api/inspections";
import { obtenerCatalogos } from "../api/catalogs";
import type { FotoArbol } from "../api/fichaArbol";
import type { ArbolInfraestructura, ComponenteInfraestructura } from "../types/infraestructura";
import type { ArbolInventario } from "../types/inventory";
import type { Diagnostico } from "../types/diagnostico";
import type { CampoFormulario, EsquemaFormulario, InspeccionDeOt, ValorCampo } from "../types/inspection";
import { fechaChile } from "../lib/dates";
import { Icon } from "./Icons";
import { prioridadDe } from "../lib/prioridadGestion";
import { PendingNotice } from "./PendingNotice";
import { fotosCompatibles, VisorFoto } from "./TreePhotos";
import { IconoComponente } from "./InfraIcons";
import { aspectoCategoria, COMPONENTES, ORDEN_CATEGORIAS, type DefComponente } from "../lib/infraestructura";
import { motivoParaUsuario } from "../lib/textoUsuario";

type Tab = "resumen" | "componentes" | "fotos";

/** Esquema del formulario (B16): una sola carga por sesión, para las etiquetas y unidades de las mediciones. */
let esquemaCache: Promise<EsquemaFormulario> | null = null;
function esquema(projectId: string): Promise<EsquemaFormulario> {
  if (!esquemaCache) {
    esquemaCache = obtenerEsquemaFormulario(projectId).catch((err) => {
      esquemaCache = null;
      throw err;
    });
  }
  return esquemaCache;
}

interface Carga<T> {
  estado: "cargando" | "listo" | "error";
  valor?: T;
  error?: string;
}

function useCarga<T>(fn: () => Promise<T>, deps: unknown[]): Carga<T> {
  const [c, setC] = useState<Carga<T>>({ estado: "cargando" });
  useEffect(() => {
    let cancelled = false;
    setC({ estado: "cargando" });
    fn()
      .then((valor) => !cancelled && setC({ estado: "listo", valor }))
      .catch((err: unknown) => !cancelled && setC({ estado: "error", error: err instanceof Error ? err.message : "No se pudo cargar." }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return c;
}

function formatear(campo: CampoFormulario | undefined, valor: ValorCampo): string {
  if (valor === null || valor === undefined || valor === "") return "Sin dato";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  const opcion = (v: string | number) => campo?.opciones?.find((o) => String(o.codigo) === String(v))?.etiqueta ?? String(v);
  if (Array.isArray(valor)) return valor.map((v) => opcion(v)).join(", ");
  if (typeof valor === "number") {
    // Sin repetir la unidad si la etiqueta ya la trae, p. ej. «Distancia copa red aérea (m)».
    const u = campo?.unidad && !campo.etiqueta.includes(`(${campo.unidad})`) ? ` ${campo.unidad}` : "";
    return `${valor.toLocaleString("es-CL")}${u}`;
  }
  return opcion(valor);
}

function etiquetaCampo(campo: CampoFormulario | undefined, id: string): string {
  return campo && !campo.etiqueta_pendiente ? campo.etiqueta : id.replace(/_/g, " ");
}

/**
 * Ficha del árbol en Infraestructura (maqueta aprobada 2026-11-17, v2.1):
 * Resumen (clasificación y su porqué), Componentes (resultado del motor,
 * mediciones registradas y evidencia) y Fotos. Fuentes: B8 (categorías,
 * regla y motivo de cada componente), la inspección de la OT vigente
 * (`GET /work-orders/:id/inspections`: variables y observación) y las fotos
 * del árbol (037). Sin evaluación vigente: «Evaluación pendiente».
 */
export function InfraSheet({
  projectId,
  fila,
  arbol,
  componenteInicial,
  onClose,
}: {
  projectId: string;
  /** Árbol con evaluación vigente (B8); null si es un árbol pendiente. */
  fila: ArbolInfraestructura | null;
  /** Árbol del inventario sin evaluación vigente. */
  arbol: ArbolInventario | null;
  /** Componente de la lente activa: la pestaña Componentes abre en él. */
  componenteInicial: string | null;
  onClose: () => void;
}) {
  const treeId = fila?.arbol.id ?? arbol!.id;
  const code = fila?.arbol.tree_code ?? arbol!.tree_code;
  const comun = fila?.arbol.nombre_comun ?? arbol?.nombre_comun ?? null;
  const cientifico = fila?.arbol.especie_cientifica ?? arbol?.especie_cientifica ?? null;
  const sector = fila?.arbol.sector ?? arbol?.sector ?? null;

  const [tab, setTab] = useState<Tab>("resumen");
  const [comp, setComp] = useState<string>(componenteInicial ?? peorComponente(fila));
  const [foto, setFoto] = useState(0);
  const [visor, setVisor] = useState<number | null>(null);
  const [vistas, setVistas] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    obtenerCatalogos()
      .then((c) => !cancelled && setVistas(Object.fromEntries((c.vista_foto ?? []).map((i) => [i.codigo, i.etiqueta]))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const vista = (v: string | null) => (v ? vistas[v] ?? v : "Sin vista");

  const diagC = useCarga<Diagnostico | null>(
    () => listarDiagnosticos(projectId, treeId).then((d) => d.find((x) => x.tree_id === treeId) ?? null),
    [projectId, treeId]
  );
  const diag = diagC.valor ?? null;
  const fotosC = useCarga<FotoArbol[]>(
    () => (diagC.estado === "cargando" ? new Promise<FotoArbol[]>(() => undefined) : fotosCompatibles(projectId, treeId, diag)),
    [projectId, treeId, diagC.estado]
  );
  const woId = fila?.evaluacion_vigente.work_order_id ?? null;
  const inspC = useCarga<InspeccionDeOt | null>(
    () =>
      !woId || diagC.estado === "cargando"
        ? diagC.estado === "cargando" && woId
          ? new Promise<InspeccionDeOt | null>(() => undefined)
          : Promise.resolve(null)
        : listarInspeccionesDeOt(woId).then((lista) => {
            const delArbol = lista.filter((i) => i.tree_id === treeId && i.estado_registro === "finalizado");
            return delArbol.find((i) => i.inspection_id === diag?.vigente?.inspection_id) ?? delArbol[0] ?? null;
          }),
    [woId, treeId, diagC.estado]
  );
  const esqC = useCarga<EsquemaFormulario>(() => esquema(projectId), [projectId]);
  const campos = new Map((esqC.valor?.variables ?? []).map((c) => [c.identificador, c]));

  // Fotos: las de la inspección vigente primero; después el resto.
  const fotos = [...(fotosC.valor ?? [])].sort((a, b) => peso(a, inspC.valor?.inspection_id) - peso(b, inspC.valor?.inspection_id));
  const fotoActual = fotos[Math.min(foto, Math.max(0, fotos.length - 1))];

  const cls = fila?.infraestructura.clasificacion ?? null;
  const parcial = !!fila?.componentes.some((c) => c.categoria?.codigo === "no_determinado");
  const desde = fila?.evaluacion_vigente.desde;

  return (
    <aside className="sivu-sheet sivu-sheet--drawer sivu-infra-sheet" aria-label={`Infraestructura del árbol ${code}`}>
      <div className="sivu-sheet__head">
        <div>
          <span className="sivu-sheet__code">{code}</span>
          <h2>{comun ?? cientifico ?? "Sin especie"}</h2>
          {comun && cientifico && <p>{cientifico}</p>}
        </div>
        <button type="button" className="sivu-topbar__icon-btn" onClick={onClose} aria-label="Cerrar ficha">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="sivu-sheet__status">
        {fila ? (
          (() => {
            const p = prioridadDe(fila.prioridad?.codigo);
            return (
              <>
                {p && (
                  <span className="sivu-infra-tag" style={{ background: p.color, color: "#fff" }}>
                    {p.orientacion === "Intervención prioritaria en el corto plazo" ? "Intervenir a corto plazo" : p.orientacion}
                  </span>
                )}
                <span className="sivu-infra-tag sivu-infra-tag--parcial">Afectación: {cls?.etiqueta ?? "sin clasificar"}</span>
              </>
            );
          })()
        ) : (
          <span className="sivu-infra-tag sivu-infra-tag--pend">Evaluación pendiente</span>
        )}
        {parcial && <span className="sivu-infra-tag sivu-infra-tag--parcial">Parcial</span>}
        {fila?.infraestructura.ajustada && <span className="sivu-infra-tag sivu-infra-tag--parcial">Ajustada por el Inspector</span>}
        <span className="sivu-sheet__place">
          {sector ?? ""}
          {desde ? ` · ${fechaChile(desde)}` : ""}
        </span>
      </div>

      <div className="sivu-seg sivu-sheet__tabs sivu-infra-tabs" role="tablist" aria-label="Secciones de la ficha">
        {(
          [
            ["resumen", "Resumen"],
            ["componentes", "Componentes"],
            ["fotos", "Fotos"],
          ] as [Tab, string][]
        ).map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} className={`sivu-seg__opt ${tab === v ? "is-on" : ""}`} onClick={() => setTab(v)}>
            {l}
            {v === "fotos" && fotosC.estado === "listo" && <small> {fotos.length}</small>}
          </button>
        ))}
      </div>

      <div className="sivu-sheet__body">
        {tab === "resumen" && (
          <>
            {fila && (() => {
              const p = prioridadDe(fila.prioridad?.codigo);
              return p ? (
                <div className="sivu-sheet__card infp-gestion" style={{ ["--pc" as string]: p.color }}>
                  <span className="infp-gestion__eyebrow">Qué hacer</span>
                  <strong>{p.orientacion}</strong>
                  <span className="infp-gestion__cruce">
                    <span>
                      Riesgo del árbol <b>{fila.riesgo?.etiqueta ?? "—"}</b>
                    </span>
                    <span aria-hidden>×</span>
                    <span>
                      Afectación <b>{fila.infraestructura.clasificacion?.etiqueta ?? "—"}</b>
                    </span>
                  </span>
                  {fila.prioridad_ajustada && <span>Prioridad ajustada por el Inspector.</span>}
                </div>
              ) : null;
            })()}
            <div className="sivu-sheet__card infd">
              <span className="infp-gestion__eyebrow infd__eyebrow">Daño a la infraestructura</span>
              {fila ? (
                (() => {
                  const danados = fila.componentes.filter((x) => ["leve", "moderada", "severa"].includes(x.categoria?.codigo ?? ""));
                  const orden = { severa: 0, moderada: 1, leve: 2 } as Record<string, number>;
                  danados.sort((x, y) => (orden[x.categoria!.codigo] ?? 9) - (orden[y.categoria!.codigo] ?? 9));
                  return danados.length === 0 ? (
                    <strong className="infd__frase">Sin daño en la infraestructura junto al árbol.</strong>
                  ) : (
                    <>
                      <strong className="infd__frase">
                        Daño {danados[0].categoria!.etiqueta?.toLowerCase()} en {danados.length === 1 ? "1 componente" : `${danados.length} componentes`}
                      </strong>
                      <div className="infd__chips">
                        {danados.map((x) => {
                          const def = COMPONENTES.find((c) => c.codigo === x.componente.codigo);
                          return (
                            <button
                              key={x.componente.codigo}
                              type="button"
                              className={`infd__chip infd__chip--${aspectoCategoria(x.categoria?.codigo)}`}
                              onClick={() => {
                                setComp(x.componente.codigo);
                                setTab("componentes");
                              }}
                            >
                              <IconoComponente codigo={x.componente.codigo} size={14} />
                              {def?.nombre ?? x.componente.etiqueta}
                              <small>{x.categoria?.etiqueta}</small>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()
              ) : (
                <p className="sivu-infra-empty">El árbol no tiene una evaluación vigente.</p>
              )}
            </div>

            <div className="sivu-sheet__card sivu-infra-card">
              <span className="sivu-infra-eyebrow">
                <Icon name="camera" size={13} /> Evidencia
                {fotosC.estado === "listo" && <span className="sivu-infra-eyebrow__r">{fotos.length} fotos</span>}
              </span>
              {fotosC.estado === "cargando" && <p className="sivu-state">Cargando fotografías…</p>}
              {fotosC.estado === "error" && <p className="sivu-state sivu-state--error">{fotosC.error}</p>}
              {fotosC.estado === "listo" && fotos.length === 0 && <p className="sivu-state">El árbol no tiene fotografías.</p>}
              {fotos.length > 0 && (
                <div className="sivu-infra-strip">
                  {fotos.slice(0, 4).map((f, i) => (
                    <button
                      key={f.id}
                      type="button"
                      className="sivu-infra-thumb"
                      onClick={() => {
                        setFoto(i);
                        setTab("fotos");
                      }}
                      title={vista(f.vista)}
                    >
                      <img src={f.url} alt={`${vista(f.vista)} del árbol`} loading="lazy" />
                      {i === 3 && fotos.length > 4 && <span className="sivu-infra-thumb__more">+{fotos.length - 4}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "componentes" &&
          (fila ? (
            <>
              <div className="sivu-infra-compbar" role="tablist" aria-label="Componente">
                {COMPONENTES.map((c) => {
                  const a = aspectoCategoria(cat(fila, c.codigo));
                  return (
                    <button key={c.codigo} type="button" role="tab" aria-selected={comp === c.codigo} className={comp === c.codigo ? "is-on" : ""} onClick={() => setComp(c.codigo)} title={c.nombre}>
                      <span className="sivu-infra-compbar__ic">
                        <IconoComponente codigo={c.codigo} size={17} />
                        <span className={`sivu-infra-dot sivu-infra-dot--${a} sivu-infra-compbar__dot`} />
                      </span>
                      {c.corto}
                    </button>
                  );
                })}
              </div>
              <DetalleComponente
                def={COMPONENTES.find((c) => c.codigo === comp) ?? COMPONENTES[0]}
                r={fila.componentes.find((x) => x.componente.codigo === comp) ?? null}
                insp={inspC}
                campos={campos}
                esquemaListo={esqC.estado !== "cargando"}
              />
            </>
          ) : (
            <>
              <div className="sivu-sheet__card sivu-infra-card">
                <p className="sivu-infra-empty">Los seis componentes aparecerán cuando el Inspector finalice una evaluación completa de este árbol y su OT se complete.</p>
              </div>
            </>
          ))}

        {tab === "fotos" && (
          <>
            {fotosC.estado === "cargando" && <p className="sivu-state">Cargando fotografías…</p>}
            {fotosC.estado === "error" && <p className="sivu-state sivu-state--error">{fotosC.error}</p>}
            {fotosC.estado === "listo" && fotos.length === 0 && <p className="sivu-state">El árbol no tiene fotografías.</p>}
            {fotoActual && (
              <>
                <div className="sivu-infra-photo">
                  <button type="button" className="sivu-infra-photo__img" onClick={() => setVisor(fotos.indexOf(fotoActual))} title="Ver más grande">
                    <img src={fotoActual.url} alt={`${vista(fotoActual.vista)} del árbol`} />
                  </button>
                  <span className="sivu-infra-photo__tags">
                    <span>{vista(fotoActual.vista)}</span>
                    <span>
                      {fotos.indexOf(fotoActual) + 1} / {fotos.length}
                    </span>
                  </span>
                  {fotos.length > 1 && (
                    <>
                      <button type="button" className="sivu-infra-photo__nav is-l" onClick={() => setFoto((fotos.indexOf(fotoActual) - 1 + fotos.length) % fotos.length)} aria-label="Foto anterior">
                        <Icon name="chevron-left" size={15} />
                      </button>
                      <button type="button" className="sivu-infra-photo__nav is-r" onClick={() => setFoto((fotos.indexOf(fotoActual) + 1) % fotos.length)} aria-label="Foto siguiente">
                        <Icon name="chevron-right" size={15} />
                      </button>
                    </>
                  )}
                </div>
                <span className="sivu-infra-note">
                  {origenFoto(fotoActual, inspC.valor)}
                  {fotoActual.created_at ? ` · ${fechaChile(fotoActual.created_at)}` : ""}
                </span>
                <div className="sivu-infra-pgrid">
                  {fotos.map((f, i) => (
                    <button key={f.id} type="button" className={`sivu-infra-thumb ${f === fotoActual ? "is-sel" : ""}`} onClick={() => setFoto(i)} title={vista(f.vista)}>
                      <img src={f.url} alt={`${vista(f.vista)} del árbol`} loading="lazy" />
                    </button>
                  ))}
                </div>
              </>
            )}
            <PendingNotice compact what="las fotos etiquetadas por componente y vinculadas a una medición" refs="D-27, 037" />
          </>
        )}
      </div>

      {visor !== null && fotos[visor] && <VisorFoto fotos={fotos} indice={visor} etiqueta={vista} onCambiar={setVisor} onCerrar={() => setVisor(null)} />}
    </aside>
  );
}

function cat(f: ArbolInfraestructura, codigo: string): string | null {
  return f.componentes.find((c) => c.componente.codigo === codigo)?.categoria?.codigo ?? null;
}

/** Componente con la categoría más grave (para abrir la pestaña Componentes en él). */
function peorComponente(f: ArbolInfraestructura | null): string {
  if (!f) return COMPONENTES[0].codigo;
  const orden = (c: string) => {
    const i = ORDEN_CATEGORIAS.indexOf(cat(f, c) ?? "");
    return i < 0 ? 99 : i;
  };
  return [...COMPONENTES].sort((a, b) => orden(a.codigo) - orden(b.codigo))[0].codigo;
}

function peso(f: FotoArbol, inspeccionVigente: string | undefined): number {
  if (inspeccionVigente && f.inspection_id === inspeccionVigente) return f.vista === "detalle" ? 1 : 0;
  if (f.origen === "inspeccion") return 2;
  if (f.origen === "registro") return 3;
  return 4;
}

function origenFoto(f: FotoArbol, insp: InspeccionDeOt | null | undefined): string {
  if (insp && f.inspection_id === insp.inspection_id) return `Inspección vigente ${insp.codigo_inspeccion ?? ""}`.trim();
  return { registro: "Registro del árbol", inspeccion: "Inspección anterior", mantenimiento: "Mantención", incidencia: "Reporte ciudadano" }[f.origen];
}

function EstadoComponente({ r, pendiente = false }: { r: ComponenteInfraestructura | null; pendiente?: boolean }) {
  if (pendiente) return <span className="sivu-infra-st sivu-infra-st--pend">Pendiente</span>;
  const a = aspectoCategoria(r?.categoria?.codigo);
  return <span className={`sivu-infra-st sivu-infra-st--${a}`}>{r?.categoria?.etiqueta ?? "Sin dato"}</span>;
}

/** Una frase simple por estado del componente (sin códigos ni reglas). */
function frase(a: string, nombre: string, etiqueta: string | null | undefined): string {
  const n = nombre.toLowerCase();
  if (a === "na") return `No hay ${n} junto al árbol, así que no se evalúa.`;
  if (a === "nd") return "No se pudo evaluar: faltó un dato en la inspección.";
  if (a === "sin") return "Existe junto al árbol y no tiene daño.";
  return `El árbol le provoca un daño ${String(etiqueta ?? "").toLowerCase()}.`;
}

function DetalleComponente({
  def,
  r,
  insp,
  campos,
  esquemaListo,
}: {
  def: DefComponente;
  r: ComponenteInfraestructura | null;
  insp: Carga<InspeccionDeOt | null>;
  campos: Map<string, CampoFormulario>;
  esquemaListo: boolean;
}) {
  const a = aspectoCategoria(r?.categoria?.codigo);
  const variables = insp.valor?.variables ?? {};
  // Solo las mediciones con un valor útil: se omiten «No» y vacíos, que no dicen nada del daño.
  const filas = def.campos.filter((id) => {
    const v = variables[id];
    return id in variables && v !== null && v !== "" && v !== false && v !== "no";
  });
  const motivo = motivoParaUsuario(r?.motivo);
  return (
    <div className={`sivu-sheet__card infc infc--${a}`}>
      <div className="infc__cab">
        <span className="infc__ic">
          <IconoComponente codigo={def.codigo} size={20} />
        </span>
        <div>
          <strong>{def.nombre}</strong>
          <span className="infc__frase">{frase(a, def.nombre, r?.categoria?.etiqueta)}</span>
        </div>
        <EstadoComponente r={r} />
      </div>
      {a !== "na" && (
        <>
          {insp.estado === "cargando" && <p className="sivu-state">Cargando mediciones…</p>}
          {insp.estado === "error" && <p className="sivu-state sivu-state--error">No se pudieron leer las mediciones.</p>}
          {filas.length > 0 && esquemaListo && (
            <dl className="infc__med">
              {filas.map((id) => (
                <div key={id}>
                  <dt>{etiquetaCampo(campos.get(id), id)}</dt>
                  <dd>{formatear(campos.get(id), variables[id])}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
      {insp.estado === "listo" && filas.length === 0 && (a === "lev" || a === "mod" || a === "sev") && (
        <span className="infc__nota">La inspección no registró mediciones de este componente.</span>
      )}
      {motivo && <span className="infc__nota">{motivo}</span>}
    </div>
  );
}
