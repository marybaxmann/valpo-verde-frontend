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
import { getClassificationTone } from "./ClassificationBadge";
import { Icon } from "./Icons";
import { PendingNotice } from "./PendingNotice";
import { fotosCompatibles, VisorFoto } from "./TreePhotos";
import { IconoComponente } from "./InfraIcons";
import { aspectoCategoria, colorClasificacion, COMPONENTES, ORDEN_CATEGORIAS, svgDataUrl, svgReloj, type DefComponente } from "../lib/infraestructura";

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

/** Escalera de la clasificación (M04, D-170: según el peor componente evaluado). Solo texto de lectura. */
const ESCALERA: { codigo: string; regla: string }[] = [
  { codigo: "bajo", regla: "Sin afectación o Leve" },
  { codigo: "moderado", regla: "Moderada" },
  { codigo: "alto", regla: "1 Severa" },
  { codigo: "critico", regla: "2 o más Severas" },
];

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
  const tono = cls ? getClassificationTone(cls.etiqueta) : "neutral";
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
          <span className="sivu-infra-tag" style={cls && cls.codigo !== "no_aplica" ? { background: colorClasificacion(tono), color: tono === "low" || tono === "medium" ? "#1f2a10" : "#fff" } : undefined}>
            {cls?.etiqueta ?? "Sin clasificación"}
          </span>
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
            <div className="sivu-sheet__card sivu-infra-card">
              <span className="sivu-infra-eyebrow">
                <span className="sivu-infra-tbd" title="Ícono por definir">?</span>
                Clasificación de infraestructura
                {fila && <span className="sivu-infra-eyebrow__r">Peor componente</span>}
              </span>
              {fila ? (
                <>
                  <div className="sivu-infra-result">
                    <img
                      src={svgDataUrl(svgReloj(COMPONENTES.map((c) => aspectoCategoria(cat(fila, c.codigo))), cls && cls.codigo !== "no_aplica" ? colorClasificacion(tono) : null))}
                      width={52}
                      height={52}
                      alt=""
                    />
                    <span className="sivu-infra-result__why">{porque(fila)}</span>
                  </div>
                  {cls && cls.codigo !== "no_aplica" && (
                    <div className="sivu-infra-ladder" aria-label="Escala de la clasificación">
                      {ESCALERA.map((e) => (
                        <div key={e.codigo} className={cls.codigo === e.codigo ? "is-on" : ""}>
                          <b style={{ background: colorClasificacion(getClassificationTone(e.codigo === "critico" ? "crítico" : e.codigo)) }} />
                          <strong>{e.codigo === "critico" ? "Crítico" : e.codigo[0].toUpperCase() + e.codigo.slice(1)}</strong>
                          <span>{e.regla}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {excluidos(fila) && <span className="sivu-infra-note">No cuentan: {excluidos(fila)}</span>}
                </>
              ) : (
                <p className="sivu-infra-empty">
                  El árbol está presente, pero no tiene una evaluación completa válida y vigente. No se le asigna «Sin afectación» ni «No aplica».
                </p>
              )}
            </div>

            <div className="sivu-sheet__card sivu-infra-card">
              <span className="sivu-infra-eyebrow">
                Por componente
              </span>
              <div className="sivu-infra-tiles">
                {COMPONENTES.map((c) => {
                  const r = fila?.componentes.find((x) => x.componente.codigo === c.codigo) ?? null;
                  return (
                    <button
                      key={c.codigo}
                      type="button"
                      className="sivu-infra-tile"
                      disabled={!fila}
                      onClick={() => {
                        setComp(c.codigo);
                        setTab("componentes");
                      }}
                    >
                      <span className="sivu-infra-tile__nm">
                        <IconoComponente codigo={c.codigo} size={14} />
                        {c.corto}
                      </span>
                      <EstadoComponente r={r} pendiente={!fila} />
                    </button>
                  );
                })}
              </div>
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
              {inspC.valor?.observaciones && (
                <p className="sivu-infra-obs">
                  <b>Observación de la inspección {inspC.valor.codigo_inspeccion ?? ""}</b>
                  {inspC.valor.observaciones}
                </p>
              )}
              <ClaveEstados />
            </>
          ) : (
            <>
              <div className="sivu-sheet__card sivu-infra-card">
                <p className="sivu-infra-empty">Los seis componentes aparecerán cuando el Inspector finalice una evaluación completa de este árbol y su OT se complete.</p>
              </div>
              <ClaveEstados />
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

/** Qué componentes sostienen la clasificación (lectura de las categorías de B8, sin recalcular). */
function porque(f: ArbolInfraestructura): string {
  const cls = f.infraestructura.clasificacion?.codigo;
  const nombres = (codigo: string) => COMPONENTES.filter((c) => cat(f, c.codigo) === codigo).map((c) => c.nombre.split(" / ")[0]);
  if (f.infraestructura.ajustada) return "Clasificación ajustada por el Inspector en la evaluación vigente.";
  if (cls === "no_aplica") return "Ningún componente aplica: no hay infraestructura inmediata junto al árbol.";
  const sev = nombres("severa");
  if (sev.length) return `${sev.length === 1 ? "Un componente" : `${sev.length} componentes`} con afectación Severa: ${sev.join(", ")}.`;
  const mod = nombres("moderada");
  if (mod.length) return `El peor componente está en Moderada: ${mod.join(", ")}.`;
  return "Los componentes evaluados están Sin afectación o Leve.";
}

function excluidos(f: ArbolInfraestructura): string {
  if (f.infraestructura.clasificacion?.codigo === "no_aplica") return "";
  return COMPONENTES.filter((c) => ["no_aplica", "no_determinado"].includes(cat(f, c.codigo) ?? ""))
    .map((c) => `${c.corto} (${(f.componentes.find((x) => x.componente.codigo === c.codigo)?.categoria?.etiqueta ?? "").toLowerCase()})`)
    .join(", ");
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
  const filas = def.campos.filter((id) => id in variables);
  return (
    <div className="sivu-sheet__card sivu-infra-card">
      <div className="sivu-infra-dhead">
        <IconoComponente codigo={def.codigo} size={18} />
        <strong>{def.nombre}</strong>
        <EstadoComponente r={r} />
      </div>
      {a === "na" ? (
        <p className="sivu-infra-empty">El componente no existe junto al árbol: no se evalúa y no entra en la clasificación.</p>
      ) : (
        <>
          {insp.estado === "cargando" && <p className="sivu-state">Cargando las mediciones de la inspección…</p>}
          {insp.estado === "error" && <p className="sivu-state sivu-state--error">No se pudieron leer las mediciones: {insp.error}</p>}
          {insp.estado === "listo" && !insp.valor && <p className="sivu-state">La evaluación vigente no tiene una inspección con mediciones disponible.</p>}
          {insp.estado === "listo" && insp.valor && filas.length === 0 && <p className="sivu-state">La inspección no registró mediciones de este componente.</p>}
          {filas.length > 0 && esquemaListo && (
            <dl className="sivu-infra-rows">
              {filas.map((id) => (
                <div key={id}>
                  <dt>{etiquetaCampo(campos.get(id), id)}</dt>
                  <dd>{formatear(campos.get(id), variables[id])}</dd>
                </div>
              ))}
            </dl>
          )}
          {a === "nd" && <span className="sivu-infra-note">No determinado: faltó un dato. No cuenta en la clasificación y la marca como «Parcial».</span>}
          {a === "sin" && <span className="sivu-infra-note">Sin afectación: existe, se evaluó y no tiene daño. Sí cuenta en la clasificación.</span>}
        </>
      )}
      {r?.motivo && <span className="sivu-infra-note">Motivo del motor: {r.motivo}</span>}
      <span className="sivu-infra-note sivu-infra-mono" title="Regla de REGLAS_INDICADORES que produjo el resultado (M04)">
        {r?.regla_id ? `Regla ${r.regla_id}` : `Reglas ${def.familia} · sin regla específica`}
      </span>
    </div>
  );
}

function ClaveEstados() {
  return (
    <div className="sivu-infra-key" aria-label="Diferencia entre estados">
      <div>
        <span className="sivu-infra-st sivu-infra-st--sin">Sin afectación</span>
        Existe y se evaluó, sin daño. Cuenta.
      </div>
      <div>
        <span className="sivu-infra-st sivu-infra-st--na">No aplica</span>
        No existe junto al árbol. No cuenta.
      </div>
      <div>
        <span className="sivu-infra-st sivu-infra-st--pend">Pendiente</span>
        El árbol no tiene evaluación vigente.
      </div>
    </div>
  );
}
