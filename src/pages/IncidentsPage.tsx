import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listarIncidencias } from "../api/incidencias";
import { obtenerCatalogos } from "../api/catalogs";
import { obtenerResumen } from "../api/resumen";
import { listarInventarioCompleto } from "../api/inventory";
import type { Incidencia } from "../types/incidencia";
import type { Catalogos } from "../types/catalogs";
import type { ConteoCatalogo } from "../types/resumen";
import type { ArbolInventario } from "../types/inventory";
import { Icon } from "../components/Icons";
import { getArcgisApiKey } from "../lib/arcgis";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { COLOR_PRIORIDAD, COLOR_SIN_REVISAR, colorEstadoInc, esReciente, hace, iconoTipo } from "../lib/incidencias";

const ProjectMapView = lazy(() => import("../components/ProjectMapView"));

/**
 * Bandeja de incidencias (B9; contrato §7). Composición de la maqueta del
 * módulo (artefacto «SIVU — Incidencias», tablero «Bandeja de incidencias»):
 * cifras por estado, filtro por tipo, «Pulso del territorio» y el flujo de
 * gestión en columnas. Todo dato viene de la API; las cifras, del resumen
 * del proyecto (B7). Al tocar una incidencia se abre su revisión.
 */
const COLUMNAS = ["ingresada", "en_revision", "derivada", "resuelta"];
const ABIERTAS = ["ingresada", "en_revision", "derivada"];

export default function IncidentsPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { project } = useCurrentProject();
  const apiKey = getArcgisApiKey();

  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [conteo, setConteo] = useState<ConteoCatalogo[] | null>(null);
  const [arboles, setArboles] = useState<ArbolInventario[] | null>(null);
  const [tipo, setTipo] = useState("");
  const [verDescartadas, setVerDescartadas] = useState(false);
  const [lista, setLista] = useState<{ key: string; data: Incidencia[] } | null>(null);
  const [errorLista, setErrorLista] = useState<{ key: string; msg: string } | null>(null);
  const [resaltado, setResaltado] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    obtenerCatalogos()
      .then((c) => !cancelled && setCatalogos(c))
      .catch(() => !cancelled && setCatalogos({}));
    obtenerResumen(projectId)
      .then((r) => !cancelled && setConteo(r.incidencias_por_estado ?? null))
      .catch(() => !cancelled && setConteo(null));
    listarInventarioCompleto(projectId, {})
      .then((a) => !cancelled && setArboles(a))
      .catch(() => !cancelled && setArboles([]));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const key = `${projectId}|${tipo}`;
  useEffect(() => {
    let cancelled = false;
    listarIncidencias(projectId, { tipo: tipo || undefined })
      .then((r) => !cancelled && setLista({ key, data: r.data }))
      .catch((err: unknown) => !cancelled && setErrorLista({ key, msg: err instanceof Error ? err.message : "No se pudieron cargar las incidencias." }));
    return () => {
      cancelled = true;
    };
  }, [projectId, tipo, key]);

  const actual = lista?.key === key ? lista.data : null;
  const error = errorLista?.key === key ? errorLista.msg : null;
  const etiquetaEstado = (codigo: string) => catalogos?.estado_incidencia?.find((c) => c.codigo === codigo)?.etiqueta ?? codigo;
  const columnas = verDescartadas ? [...COLUMNAS, "descartada"] : COLUMNAS;
  const abrir = (i: Incidencia) => navigate(i.id);

  // Pulso del territorio: un punto por árbol; los que tienen una incidencia abierta, con su color.
  const abiertaPorArbol = new Map<string, Incidencia>();
  for (const i of actual ?? []) {
    if (i.arbol && ABIERTAS.includes(i.estado_incidencia.codigo) && !abiertaPorArbol.has(i.arbol.id)) abiertaPorArbol.set(i.arbol.id, i);
  }
  const resaltadaInc = actual?.find((i) => i.id === resaltado) ?? null;
  const points = (arboles ?? [])
    .filter((a) => a.ubicacion)
    .map((a) => {
      const inc = abiertaPorArbol.get(a.id);
      const color = inc
        ? inc.estado_incidencia.codigo === "ingresada"
          ? COLOR_SIN_REVISAR
          : COLOR_PRIORIDAD[inc.prioridad_municipal?.codigo ?? ""] ?? colorEstadoInc(inc.estado_incidencia.codigo)
        : undefined;
      return {
        id: a.id,
        lng: a.ubicacion!.lng,
        lat: a.ubicacion!.lat,
        title: a.tree_code,
        label: a.nombre_comun ?? undefined,
        detail: inc?.tipo_incidencia?.etiqueta,
        ...(color ? { color } : { tone: "neutral" as const }),
      };
    });

  return (
    <div className="sivu-dash sivu-inc">
      <header className="sivu-phead sivu-inc__head">
        <div>
          <div className="sivu-phead__eyebrow">
            <span className="sivu-inc__badge">Incidencias</span>
            {project && <span>{project.nombre_proyecto} · reportes por QR</span>}
          </div>
          <h1 className="sivu-phead__title">Bandeja de incidencias</h1>
          {error && (
            <p className="sivu-phead__meta">
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {error}
              </span>
            </p>
          )}
        </div>
        {conteo && conteo.length > 0 && (
          <div className="sivu-stats" aria-label="Incidencias por estado">
            {conteo.map((c) => (
              <span key={c.codigo ?? "sin"} style={{ ["--c" as string]: colorEstadoInc(c.codigo) }}>
                <i aria-hidden="true" />
                <strong>{c.total}</strong>
                {c.etiqueta ?? c.codigo}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="sivu-inc__chips" role="group" aria-label="Filtrar por tipo">
        <button type="button" className="sivu-inc__chipbtn" aria-pressed={tipo === ""} onClick={() => setTipo("")}>
          Todas
        </button>
        {(catalogos?.tipo_incidencia ?? []).map((c) => (
          <button key={c.codigo} type="button" className="sivu-inc__chipbtn" aria-pressed={tipo === c.codigo} onClick={() => setTipo(c.codigo)}>
            {c.etiqueta}
          </button>
        ))}
        <label className="sivu-inc__toggle">
          <input type="checkbox" checked={verDescartadas} onChange={(e) => setVerDescartadas(e.target.checked)} />
          Ver descartadas
        </label>
      </div>

      <div className="sivu-inc__board">
        <section className="sivu-panel sivu-inc__pulse" aria-label="Pulso del territorio">
          <div className="sivu-panel__head">
            <h2>Pulso del territorio</h2>
            {resaltadaInc?.arbol && (
              <span className="sivu-inc__muted">
                {resaltadaInc.arbol.tree_code} · {resaltadaInc.tipo_incidencia?.etiqueta}
              </span>
            )}
          </div>
          <div className="sivu-inc__map">
            {apiKey ? (
              <Suspense fallback={<div className="sivu-inc__mapstate">Cargando mapa…</div>}>
                <ProjectMapView
                  apiKey={apiKey}
                  points={points}
                  selectedId={resaltadaInc?.arbol?.id ?? null}
                  onSelect={(treeId) => {
                    const inc = abiertaPorArbol.get(treeId);
                    if (inc) abrir(inc);
                  }}
                  className="sivu-inc__mapview"
                />
              </Suspense>
            ) : (
              <div className="sivu-inc__mapstate">El mapa no está configurado en este entorno.</div>
            )}
          </div>
          <div className="sivu-inc__legend">
            <span>
              <i style={{ background: COLOR_SIN_REVISAR }} /> Sin revisar
            </span>
            {(catalogos?.prioridad_municipal ?? []).map((p) => (
              <span key={p.codigo}>
                <i style={{ background: COLOR_PRIORIDAD[p.codigo] ?? "#c9d1cc" }} /> Prioridad {p.etiqueta.toLowerCase()}
              </span>
            ))}
            <span>
              <i className="sivu-inc__legend-empty" /> Sin incidencias abiertas
            </span>
          </div>
        </section>

        <section className={`sivu-inc__flow sivu-inc__flow--${columnas.length}`} aria-label="Flujo de gestión">
          {columnas.map((estado) => {
            const items = (actual ?? []).filter((i) => i.estado_incidencia.codigo === estado);
            return (
              <div key={estado} className="sivu-inc__col">
                <div className="sivu-inc__colhead">
                  <span>
                    <i style={{ background: colorEstadoInc(estado) }} />
                    {etiquetaEstado(estado)}
                  </span>
                  <span className="sivu-inc__muted">{actual ? items.length : "…"}</span>
                </div>
                {actual && items.length === 0 && <p className="sivu-inc__empty">Sin incidencias.</p>}
                {items.map((i) => {
                  const prio = i.prioridad_municipal;
                  const nota = i.ot_derivadas.length
                    ? i.ot_derivadas.map((o) => o.codigo_ot).filter(Boolean).join(", ")
                    : i.resultado_revision?.etiqueta;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      className="sivu-inc__card"
                      onClick={() => abrir(i)}
                      onMouseEnter={() => setResaltado(i.id)}
                      onFocus={() => setResaltado(i.id)}
                    >
                      <span className="sivu-inc__cardtop">
                        <span className="sivu-inc__code">
                          {esReciente(i.estado_incidencia.codigo, i.fecha_reporte) && <i className="sivu-inc__live" aria-label="Ingresada hace menos de 24 horas" />}
                          {i.codigo_incidencia ?? "—"}
                        </span>
                        <span className="sivu-inc__muted">{hace(i.fecha_reporte)}</span>
                      </span>
                      <span className="sivu-inc__type">
                        <span className="sivu-inc__typeicon" aria-hidden="true">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d={iconoTipo(i.tipo_incidencia?.codigo)} />
                          </svg>
                        </span>
                        <strong>{i.tipo_incidencia?.etiqueta ?? "Incidencia"}</strong>
                      </span>
                      <span className="sivu-inc__tree">
                        {i.arbol ? `${i.arbol.tree_code} · ${i.arbol.nombre_comun ?? i.arbol.especie_cientifica ?? ""}` : "Sin árbol identificado"}
                      </span>
                      <span className="sivu-inc__meta">
                        <span className="sivu-inc__prio" style={{ ["--c" as string]: prio ? COLOR_PRIORIDAD[prio.codigo] ?? "#c9d1cc" : "#c9d1cc" }}>
                          {prio ? prio.etiqueta : "Sin prioridad"}
                        </span>
                        {nota && <span className="sivu-inc__muted">{nota}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
