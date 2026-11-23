import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { obtenerIndicadores } from "../api/indicadores";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarInventarioCompleto } from "../api/inventory";
import { obtenerFichaArbol } from "../api/fichaArbol";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { SivuLoader } from "../components/SivuLoader";
import { HuellaVerde } from "../components/indicadores/HuellaVerde";
import { FichaBiometrica } from "../components/indicadores/FichaBiometrica";
import { SelectorArbol, type ArbolLista } from "../components/indicadores/SelectorArbol";
import { fechaHoraChile } from "../lib/dates";
import type { IndicadoresProyecto } from "../types/indicadores";
import type { FichaArbol } from "../types/fichaArbol";

/**
 * Indicadores biométricos (CC-060; hoja INDICES filas 3 a 13, CC-016;
 * carbono aéreo leñoso, CC-069 v1). Dos vistas: el proyecto, compacta como
 * el Dashboard (2026-11-19), y la ficha biométrica de cada árbol. El
 * frontend no calcula indicadores: los lee de B19 y de B2.
 */

type Carga<T> = { estado: "cargando" } | { estado: "listo"; datos: T } | { estado: "error"; mensaje: string };


export default function IndicesPage() {
  const { projectId = "" } = useParams();
  const { project } = useCurrentProject();
  const [params, setParams] = useSearchParams();
  const vista = params.get("vista") === "arbol" ? "arbol" : "proyecto";
  const barrio = params.get("barrio") ?? undefined;
  const arbolParam = params.get("arbol");

  const [reintento, setReintento] = useState(0);
  const [indicadores, setIndicadores] = useState<{ clave: string; carga: Carga<IndicadoresProyecto> } | null>(null);
  const clave = `${projectId}|${barrio ?? ""}|${reintento}`;

  // Los indicadores del proyecto se piden solo al abrir «Proyecto»: «Por árbol» no los usa
  // y competían con la lista y la ficha (2026-11-23).
  const indicadoresPedidos = indicadores?.clave === clave;
  useEffect(() => {
    if (vista !== "proyecto" || indicadoresPedidos) return;
    let cancelado = false;
    obtenerIndicadores(projectId, barrio)
      .then((datos) => !cancelado && setIndicadores({ clave, carga: { estado: "listo", datos } }))
      .catch((e: unknown) => !cancelado && setIndicadores({ clave, carga: { estado: "error", mensaje: e instanceof Error ? e.message : "No se pudieron cargar los indicadores." } }));
    return () => {
      cancelado = true;
    };
  }, [projectId, barrio, clave, vista, indicadoresPedidos]);

  // Árboles con evaluación vigente (B18): los que se pueden abrir en la vista «Por árbol».
  const [evaluados, setEvaluados] = useState<{ id: string; carga: Carga<ArbolLista[]> } | null>(null);
  const evaluadosPedidos = evaluados?.id === projectId;
  useEffect(() => {
    if (vista !== "arbol" || evaluadosPedidos) return;
    let cancelado = false;
    // La ubicación corta (calle y sector) sale del inventario (B1); si falla, el selector funciona sin ella.
    Promise.all([listarDiagnosticos(projectId), listarInventarioCompleto(projectId, {}).catch(() => [])])
      .then(([ds, inv]) => {
        if (cancelado) return;
        const porId = new Map(inv.map((t) => [t.id, t]));
        const lista: ArbolLista[] = ds
          .filter((d) => d.vigente)
          .map((d) => {
            const t = porId.get(d.tree_id);
            const corta = t?.ubicacion_descriptiva?.split(";")[0]?.trim() || null;
            return { id: d.tree_id, codigo: d.tree_code, comun: d.nombre_comun, cientifico: d.especie_cientifica, lugar: corta ?? t?.sector ?? null };
          })
          .sort((x, y) => (x.comun ?? "~").localeCompare(y.comun ?? "~", "es") || x.codigo.localeCompare(y.codigo));
        setEvaluados({ id: projectId, carga: { estado: "listo", datos: lista } });
      })
      .catch((e: unknown) => !cancelado && setEvaluados({ id: projectId, carga: { estado: "error", mensaje: e instanceof Error ? e.message : "" } }));
    return () => {
      cancelado = true;
    };
  }, [projectId, vista, evaluadosPedidos]);
  const listaEvaluados = evaluados?.id === projectId && evaluados.carga.estado === "listo" ? evaluados.carga.datos : null;

  // El último árbol abierto se recuerda por proyecto: su ficha se pide de inmediato, en paralelo con
  // la lista, en vez de esperar a que la lista llegue (2026-11-23).
  const claveRecordado = `sivu.indices.arbol.${projectId}`;
  const recordado = (() => {
    try {
      return localStorage.getItem(claveRecordado);
    } catch {
      return null;
    }
  })();
  const recordadoValido = recordado && (!listaEvaluados || listaEvaluados.some((a) => a.id === recordado)) ? recordado : null;
  const arbolSel = arbolParam ?? recordadoValido ?? listaEvaluados?.[0]?.id ?? null;
  useEffect(() => {
    if (vista !== "arbol" || !arbolSel) return;
    try {
      localStorage.setItem(claveRecordado, arbolSel);
    } catch {
      // Sin almacenamiento local: solo se pierde el recuerdo del último árbol.
    }
  }, [vista, arbolSel, claveRecordado]);
  const [fichaSuelta, setFichaSuelta] = useState<{ id: string; carga: Carga<FichaArbol> } | null>(null);
  // La ficha (B2) se pide solo al abrir un árbol; ya no se leen todas para ordenar el carbono.
  useEffect(() => {
    if (vista !== "arbol" || !arbolSel) return;
    let cancelado = false;
    obtenerFichaArbol(projectId, arbolSel)
      .then((datos) => !cancelado && setFichaSuelta({ id: arbolSel, carga: { estado: "listo", datos } }))
      .catch((e: unknown) => !cancelado && setFichaSuelta({ id: arbolSel, carga: { estado: "error", mensaje: e instanceof Error ? e.message : "No se pudo cargar la ficha." } }));
    return () => {
      cancelado = true;
    };
  }, [vista, arbolSel, projectId]);
  const ficha: Carga<FichaArbol> | null = !arbolSel ? null : fichaSuelta?.id === arbolSel ? fichaSuelta.carga : { estado: "cargando" };

  const actualizar = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  };

  const carga = indicadores?.clave === clave ? indicadores.carga : ({ estado: "cargando" } as const);
  const datos = carga.estado === "listo" ? carga.datos : null;
  const superficie = datos?.densidad_arborea.superficie_m2;

  return (
    <div className="bio-page">
      <header className="bio-head">
        <div>
          <div className="bio-head__eyebrow">
            <span className="bio-chip">Indicadores biométricos</span>
            <span>
              {project?.nombre_proyecto ?? "Proyecto"}
              {vista === "proyecto" && superficie ? ` · sector de ${(superficie / 10000).toLocaleString("es-CL", { maximumFractionDigits: 2 })} ha` : ""}
              {barrio ? ` · ${barrio}` : ""}
            </span>
          </div>
          <h1 className="bio-head__title">{vista === "proyecto" ? "Indicadores del proyecto" : "Ficha biométrica del árbol"}</h1>
        </div>

        <div className="bio-head__tools">
          <div className="bio-seg" role="tablist" aria-label="Vista">
            <button role="tab" aria-selected={vista === "proyecto"} className={vista === "proyecto" ? "is-on" : ""} onClick={() => actualizar({ vista: null })}>
              Proyecto
            </button>
            <button role="tab" aria-selected={vista === "arbol"} className={vista === "arbol" ? "is-on" : ""} onClick={() => actualizar({ vista: "arbol" })}>
              Por árbol
            </button>
          </div>
          {/* Espacio de ancho fijo a la derecha del cambio de vista: el cambio de vista no se mueve al pasar de una vista a otra. */}
          <div className="bio-head__slot">
            {vista === "arbol" && listaEvaluados && listaEvaluados.length > 0 && (
              <SelectorArbol arboles={listaEvaluados} sel={arbolSel} onSel={(id) => actualizar({ arbol: id })} />
            )}
            {vista === "proyecto" && datos && datos.barrios.length > 0 && (
              <label className="bio-select">
                <span>Ámbito</span>
                <select value={barrio ?? ""} onChange={(e) => actualizar({ barrio: e.target.value || null })}>
                  <option value="">Todo el proyecto</option>
                  {datos.barrios.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {vista === "proyecto" && (
              <ul className="bio-head__legend">
                <li>
                  <i className="bio-legend__dot bio-legend__dot--ok" /> Resuelto · datos del proyecto
                </li>
                <li>
                  <i className="bio-legend__dot bio-legend__dot--pend" /> Método pendiente
                </li>
              </ul>
            )}
          </div>
        </div>
      </header>

      {vista === "proyecto" && (
        <>
          {carga.estado === "cargando" && <SivuLoader message="Leyendo los indicadores del proyecto…" />}
          {carga.estado === "error" && (
            <div className="bio-card bio-error" role="alert">
              <strong>No se pudieron cargar los indicadores.</strong>
              <span>{carga.mensaje}</span>
              <button className="bio-btn" onClick={() => setReintento((r) => r + 1)}>
                Reintentar
              </button>
            </div>
          )}
          {datos && datos.cobertura.arboles_presentes === 0 && (
            <div className="bio-card bio-vacio">
              <strong>Todavía no hay árboles presentes {barrio ? "en este barrio" : "en el proyecto"}.</strong>
              <span>Los indicadores aparecen cuando el inventario tenga árboles dados de alta.</span>
            </div>
          )}
          {datos && datos.cobertura.arboles_presentes > 0 && (
            <>
              <HuellaVerde d={datos} onVerArboles={() => actualizar({ vista: "arbol" })} />
              <p className="bio-pie">
                {datos.cobertura.arboles_presentes} presentes de {datos.cobertura.arboles_registrados} registrados
                {datos.cobertura.arboles_con_evaluacion_valida !== undefined && ` · ${datos.cobertura.arboles_con_evaluacion_valida} con evaluación completa vigente`} ·
                consulta del {fechaHoraChile(datos.fecha_consulta)}
              </p>
            </>
          )}
        </>
      )}

      {vista === "arbol" && (
        <>
          {!listaEvaluados && !arbolSel && evaluados?.carga.estado !== "error" && <SivuLoader message="Buscando los árboles evaluados…" />}
          {listaEvaluados && listaEvaluados.length === 0 && !arbolParam && (
            <div className="bio-card bio-vacio">
              <strong>Ningún árbol tiene todavía una evaluación vigente.</strong>
              <span>La ficha biométrica se llena cuando el Usuario municipal completa una OT de Inspección.</span>
            </div>
          )}
          {ficha?.estado === "cargando" && <SivuLoader message="Abriendo la ficha del árbol…" />}
          {ficha?.estado === "error" && (
            <div className="bio-card bio-error" role="alert">
              <strong>No se pudo abrir la ficha.</strong>
              <span>{ficha.mensaje}</span>
            </div>
          )}
          {ficha?.estado === "listo" && <FichaBiometrica ficha={ficha.datos} lugar={listaEvaluados?.find((x) => x.id === arbolSel)?.lugar ?? null} />}
        </>
      )}
    </div>
  );
}
