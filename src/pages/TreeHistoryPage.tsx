import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerFichaArbol } from "../api/fichaArbol";
import { listarInspeccionesDeOt, obtenerEsquemaFormulario } from "../api/inspections";
import { obtenerCatalogos } from "../api/catalogs";
import type { FichaArbol, VersionHistorial } from "../types/fichaArbol";
import type { CampoFormulario, EsquemaFormulario, InspeccionDeOt, ValorCampo } from "../types/inspection";
import type { CodigoEtiqueta } from "../types/diagnostico";
import { ClassificationBadge } from "../components/ClassificationBadge";
import { Icon } from "../components/Icons";
import { useAuth } from "../hooks/useAuth";
import { basePathForRole } from "../lib/roles";
import { fechaChile } from "../lib/dates";

/**
 * Historial del árbol (B2 `historial`; B17 para lo registrado en cada
 * inspección; B16 para los nombres visibles y las opciones). Muestra de
 * dónde vienen los resultados: cada versión que fue vigente —el alta y las
 * inspecciones finalizadas de OT completadas— con lo que se registró. El
 * frontend no recalcula nada: muestra los valores tal como los guardó la
 * API, con sus etiquetas.
 */
export default function TreeHistoryPage() {
  const { projectId = "", treeId = "" } = useParams();
  const { profile } = useAuth();
  const basePath = basePathForRole(profile?.role);

  const [ficha, setFicha] = useState<FichaArbol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspecciones, setInspecciones] = useState<Map<string, InspeccionDeOt>>(new Map());
  const [esquemas, setEsquemas] = useState<Map<string, EsquemaFormulario>>(new Map());
  const [tipos, setTipos] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    obtenerCatalogos()
      .then((c) => !cancelled && setTipos(Object.fromEntries((c.tipo_inspeccion_realizada ?? []).map((i) => [i.codigo, i.etiqueta]))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    obtenerFichaArbol(projectId, treeId)
      .then(async (f) => {
        if (cancelled) return;
        setFicha(f);
        // Lo registrado en cada inspección: B17 de las OT de Inspección del árbol.
        const ots = f.ordenes_trabajo.filter((o) => o.tipo_ot.codigo === "inspeccion");
        const listas = await Promise.all(ots.map((o) => listarInspeccionesDeOt(o.id).catch(() => [] as InspeccionDeOt[])));
        const mapa = new Map<string, InspeccionDeOt>();
        for (const l of listas) for (const ins of l) mapa.set(ins.inspection_id, ins);
        if (cancelled) return;
        setInspecciones(mapa);
        // Nombres visibles por tipo de inspección (B16).
        const tipos = [...new Set(["evaluacion_inicial", ...[...mapa.values()].map((i) => i.tipo_inspeccion_realizada ?? "evaluacion_inicial")])];
        const pares = await Promise.all(
          tipos.map((t) =>
            obtenerEsquemaFormulario(projectId, t)
              .then((e) => [t, e] as const)
              .catch(() => null)
          )
        );
        if (!cancelled) setEsquemas(new Map(pares.filter((p): p is readonly [string, EsquemaFormulario] => !!p)));
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "No se pudo cargar el historial del árbol."));
    return () => {
      cancelled = true;
    };
  }, [projectId, treeId]);

  const volver = `${basePath}/projects/${projectId}/mapa?arbol=${treeId}`;
  if (error) {
    return (
      <div className="sivu-dash sivu-hist">
        <Link to={volver} className="sivu-insp__back">
          <Icon name="arrow-left" size={14} /> Inventario
        </Link>
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      </div>
    );
  }
  if (!ficha) return <p className="sivu-state">Cargando el historial del árbol…</p>;

  const a = ficha.arbol;
  const riesgo = ficha.evaluacion_vigente?.resultado.clasificacion_riesgo ?? null;
  const base = esquemas.get("evaluacion_inicial") ?? null;

  return (
    <div className="sivu-dash sivu-hist">
      <Link to={volver} className="sivu-insp__back">
        <Icon name="arrow-left" size={14} /> Inventario
      </Link>
      <header className="sivu-hist__head">
        <div>
          <span className="sivu-sheet__code">{a.tree_code}</span>
          <h1>{a.nombre_comun ?? a.especie_cientifica ?? "Árbol"}</h1>
          {a.nombre_comun && a.especie_cientifica && <p className="sivu-hist__species">{a.especie_cientifica}</p>}
        </div>
        <div className="sivu-hist__chips">
          {riesgo ? <ClassificationBadge level={riesgo.etiqueta} /> : <span className="status-pill">Evaluación pendiente</span>}
          {ficha.presencia && (
            <span className="status-pill">
              {ficha.presencia.etiqueta}
              {ficha.presencia.desde ? ` desde ${fechaChile(ficha.presencia.desde)}` : ""}
            </span>
          )}
        </div>
      </header>

      <div className="sivu-hist__grid">
        <section className="sivu-hist__timeline" aria-label="Historial">
          <h2 className="sivu-hist__h2">Historial de registros</h2>
          <p className="sivu-hist__lead">
            Cada versión que fue vigente, de la más reciente a la más antigua, con lo que se registró. Los resultados del árbol salen de estos registros.
          </p>
          {ficha.historial.length === 0 && <p className="sivu-state">El árbol todavía no tiene registros vigentes.</p>}
          <ol className="sivu-hist__list">
            {ordenar(ficha.historial).map((v, idx) => (
              <Version
                key={`${v.origen}-${v.inspection_id ?? idx}`}
                v={v}
                inspeccion={v.inspection_id ? inspecciones.get(v.inspection_id) ?? null : null}
                esquema={(v.inspection_id && esquemas.get(inspecciones.get(v.inspection_id)?.tipo_inspeccion_realizada ?? "")) || base}
                abierta={idx === 0}
                tipoLabel={tipos[(v.inspection_id && inspecciones.get(v.inspection_id)?.tipo_inspeccion_realizada) || ""] ?? null}
              />
            ))}
          </ol>
        </section>

        <aside className="sivu-hist__side">
          <section className="sivu-panel sivu-hist__card" aria-label="Órdenes de trabajo">
            <h2 className="sivu-hist__h2">Órdenes de trabajo</h2>
            {ficha.ordenes_trabajo.length === 0 ? (
              <p className="sivu-inc__muted">El árbol no tiene órdenes de trabajo.</p>
            ) : (
              <ul className="sivu-hist__items">
                {ficha.ordenes_trabajo.map((o) => (
                  <li key={o.id}>
                    <span className="sivu-hist__itemicon" aria-hidden="true">
                      <Icon name={o.tipo_ot.codigo === "inspeccion" ? "clipboard" : "wrench"} size={14} />
                    </span>
                    <span>
                      <strong>{o.subtipo ? `${o.accion.etiqueta} · ${o.subtipo.etiqueta}` : o.accion.etiqueta}</strong>
                      <small>{o.codigo_ot ?? "—"}</small>
                    </span>
                    <span className="sivu-hist__state" style={{ ["--c" as string]: `var(--ot-${o.estado.codigo.replace(/_/g, "-")}, var(--ot-pendiente))` }}>
                      {o.estado.etiqueta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="sivu-panel sivu-hist__card" aria-label="Incidencias">
            <h2 className="sivu-hist__h2">Incidencias</h2>
            {ficha.incidencias.length === 0 ? (
              <p className="sivu-inc__muted">El árbol no tiene incidencias.</p>
            ) : (
              <ul className="sivu-hist__items">
                {ficha.incidencias.map((i) => (
                  <li key={i.id}>
                    <span className="sivu-hist__itemicon" aria-hidden="true">
                      <Icon name="alert" size={14} />
                    </span>
                    <span>
                      <strong>{i.tipo_incidencia?.etiqueta ?? "Incidencia"}</strong>
                      <small>
                        {i.codigo_incidencia ?? "—"} · {fechaChile(i.fecha_reporte)}
                      </small>
                    </span>
                    <span className="sivu-hist__state">{i.estado_incidencia.etiqueta}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Version({
  v,
  inspeccion,
  esquema,
  abierta,
  tipoLabel,
}: {
  tipoLabel: string | null;
  v: VersionHistorial;
  inspeccion: InspeccionDeOt | null;
  esquema: EsquemaFormulario | null;
  abierta: boolean;
}) {
  const [verEval, setVerEval] = useState(false);
  const titulo = v.origen === "alta" ? "Alta del árbol" : tipoLabel ?? "Inspección";
  const campos = esquema?.campos_arbol ?? [];
  const variables = esquema?.variables ?? [];

  return (
    <li className="sivu-hist__item">
      <span className={`sivu-hist__dot ${v.origen === "alta" ? "is-alta" : ""}`} aria-hidden="true" />
      <details className="sivu-panel sivu-hist__version" open={abierta}>
        <summary>
          <span>
            <strong>{titulo}</strong>
            <small>
              {v.codigo_inspeccion ? `${v.codigo_inspeccion} · ` : ""}
              {v.fecha_inspeccion ? `registrada el ${fechaChile(v.fecha_inspeccion)}` : ""}
              {v.vigente_desde ? `${v.fecha_inspeccion ? " · " : ""}vigente desde ${fechaChile(v.vigente_desde)}` : ""}
            </small>
          </span>
        </summary>

        <h3 className="sivu-hist__h3">Datos del árbol registrados</h3>
        <Valores valores={v.valores} campos={campos} />

        {inspeccion && (
          <>
            {inspeccion.observaciones && <p className="sivu-hist__obs">«{inspeccion.observaciones}»</p>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVerEval((x) => !x)} aria-expanded={verEval}>
              <Icon name={verEval ? "chevron-down" : "arrow-right"} size={13} />
              {verEval ? "Ocultar lo registrado en la evaluación" : "Ver lo registrado en la evaluación"}
            </button>
            {verEval && <Evaluacion valores={inspeccion.variables} campos={variables} />}
          </>
        )}
        {v.origen === "inspeccion" && !inspeccion && <p className="sivu-inc__muted">Cargando lo registrado en la inspección…</p>}
      </details>
    </li>
  );
}

/** Lista de pares nombre–valor, en el orden del formulario (fila del Excel). */
function Valores({ valores, campos }: { valores: Record<string, ValorCampo | CodigoEtiqueta>; campos: CampoFormulario[] }) {
  const porId = new Map(campos.map((c) => [c.identificador, c]));
  const claves = Object.keys(valores).sort((x, y) => (porId.get(x)?.orden ?? 9999) - (porId.get(y)?.orden ?? 9999));
  if (claves.length === 0) return <p className="sivu-inc__muted">Sin datos.</p>;
  return (
    <dl className="sivu-hist__values">
      {claves.map((k) => (
        <div key={k}>
          <dt>{porId.get(k)?.etiqueta ?? k}</dt>
          <dd>{formatear(valores[k], porId.get(k))}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Variables de la evaluación agrupadas por sección (B16). */
function Evaluacion({ valores, campos }: { valores: Record<string, ValorCampo>; campos: CampoFormulario[] }) {
  const porId = new Map(campos.map((c) => [c.identificador, c]));
  const grupos = new Map<string, { etiqueta: string; orden: number; claves: string[] }>();
  for (const k of Object.keys(valores)) {
    const sec = porId.get(k)?.seccion;
    const codigo = sec?.codigo ?? "otros";
    const g = grupos.get(codigo) ?? { etiqueta: sec?.etiqueta ?? "Otros registros", orden: 99999, claves: [] };
    g.claves.push(k);
    // La sección va en el orden del formulario: el de su primer campo (fila del Excel).
    g.orden = Math.min(g.orden, porId.get(k)?.orden ?? 99999);
    grupos.set(codigo, g);
  }
  const lista = [...grupos.values()].sort((x, y) => x.orden - y.orden);
  if (lista.length === 0) return <p className="sivu-inc__muted">La inspección no registró variables.</p>;
  return (
    <div className="sivu-hist__eval">
      {lista.map((g) => (
        <section key={g.etiqueta}>
          <h4>{g.etiqueta}</h4>
          <dl className="sivu-hist__values">
            {g.claves
              .sort((x, y) => (porId.get(x)?.orden ?? 9999) - (porId.get(y)?.orden ?? 9999))
              .map((k) => (
                <div key={k}>
                  <dt>{porId.get(k)?.etiqueta ?? k}</dt>
                  <dd>{formatear(valores[k], porId.get(k))}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** Valor en palabras: opciones con su etiqueta (B16), Sí/No, números con su unidad, listas separadas. */
function formatear(valor: ValorCampo | CodigoEtiqueta | undefined, campo: CampoFormulario | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "object" && !Array.isArray(valor) && "etiqueta" in valor) return valor.etiqueta;
  const opcion = (c: string | number | boolean) => campo?.opciones?.find((o) => o.codigo === c)?.etiqueta;
  if (typeof valor === "boolean") return opcion(valor) ?? (valor ? "Sí" : "No");
  // La unidad sin el rango que la acompaña en el Excel (p. ej. «% (0 a 100)» → «%»).
  const u = campo?.unidad?.split(" (")[0].trim();
  const unidad = u && u !== "Sin unidad" ? ` ${u}` : "";
  if (Array.isArray(valor)) {
    return (valor as (string | number)[])
      .map((x) => (typeof x === "number" ? `${x.toLocaleString("es-CL")}${unidad}` : opcion(x) ?? String(x)))
      .join(", ");
  }
  if (typeof valor === "number") return `${valor.toLocaleString("es-CL")}${unidad}`;
  return opcion(valor) ?? String(valor);
}

/** De la más reciente a la más antigua; con la misma fecha, la inspección antes que el alta. */
function ordenar(historial: VersionHistorial[]): VersionHistorial[] {
  return [...historial].sort((x, y) => {
    const f = (y.vigente_desde ?? "").localeCompare(x.vigente_desde ?? "");
    if (f !== 0) return f;
    return (x.origen === "alta" ? 1 : 0) - (y.origen === "alta" ? 1 : 0);
  });
}
