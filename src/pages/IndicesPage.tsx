import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { obtenerIndicadores } from "../api/indicadores";
import { listarDiagnosticos } from "../api/diagnosticos";
import { obtenerFichaArbol } from "../api/fichaArbol";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { SivuLoader } from "../components/SivuLoader";
import { HuellaVerde, type Aportes } from "../components/indicadores/HuellaVerde";
import { FichaBiometrica } from "../components/indicadores/FichaBiometrica";
import { fechaHoraChile } from "../lib/dates";
import type { IndicadoresProyecto } from "../types/indicadores";
import type { FichaArbol } from "../types/fichaArbol";

/**
 * Indicadores biométricos (CC-060; hoja INDICES filas 3 a 13, CC-016;
 * carbono aéreo leñoso, CC-069 v1). Dos vistas de la maqueta: el
 * proyecto («La huella verde») y la ficha biométrica de cada árbol. El
 * frontend no calcula indicadores: los lee de B19 y de B2.
 */

/** Tope de fichas que se leen para ordenar «Los que más aportan» (un pedido por árbol evaluado). */
const MAX_FICHAS = 60;

type Carga<T> = { estado: "cargando" } | { estado: "listo"; datos: T } | { estado: "error"; mensaje: string };

interface ArbolEvaluado {
  tree_id: string;
  tree_code: string;
  nombre: string | null;
}

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

  useEffect(() => {
    let cancelado = false;
    obtenerIndicadores(projectId, barrio)
      .then((datos) => !cancelado && setIndicadores({ clave, carga: { estado: "listo", datos } }))
      .catch((e: unknown) => !cancelado && setIndicadores({ clave, carga: { estado: "error", mensaje: e instanceof Error ? e.message : "No se pudieron cargar los indicadores." } }));
    return () => {
      cancelado = true;
    };
  }, [projectId, barrio, clave]);

  // Árboles con evaluación vigente (B18): los de la ficha y los candidatos de «Los que más aportan».
  const [evaluados, setEvaluados] = useState<{ id: string; carga: Carga<ArbolEvaluado[]> } | null>(null);
  useEffect(() => {
    let cancelado = false;
    listarDiagnosticos(projectId)
      .then((ds) => {
        if (cancelado) return;
        const lista = ds
          .filter((d) => d.vigente)
          .map((d) => ({ tree_id: d.tree_id, tree_code: d.tree_code, nombre: d.nombre_comun ?? d.especie_cientifica }))
          .sort((x, y) => x.tree_code.localeCompare(y.tree_code));
        setEvaluados({ id: projectId, carga: { estado: "listo", datos: lista } });
      })
      .catch((e: unknown) => !cancelado && setEvaluados({ id: projectId, carga: { estado: "error", mensaje: e instanceof Error ? e.message : "" } }));
    return () => {
      cancelado = true;
    };
  }, [projectId]);
  const listaEvaluados = evaluados?.id === projectId && evaluados.carga.estado === "listo" ? evaluados.carga.datos : null;

  // Fichas (B2) de los árboles evaluados: carbono por árbol para el orden y la ficha seleccionada.
  const [fichas, setFichas] = useState<{ id: string; porArbol: Map<string, FichaArbol | null> } | null>(null);
  useEffect(() => {
    if (!listaEvaluados) return;
    let cancelado = false;
    const candidatos = listaEvaluados.slice(0, MAX_FICHAS);
    Promise.all(candidatos.map((a) => obtenerFichaArbol(projectId, a.tree_id).then((f) => [a.tree_id, f] as const, () => [a.tree_id, null] as const))).then(
      (pares) => !cancelado && setFichas({ id: projectId, porArbol: new Map(pares) })
    );
    return () => {
      cancelado = true;
    };
  }, [projectId, listaEvaluados]);
  const porArbol = fichas?.id === projectId ? fichas.porArbol : null;

  const aportes: Aportes = useMemo(() => {
    if (evaluados?.id === projectId && evaluados.carga.estado === "error") return { estado: "no_disponible", motivo: "No se pudo leer la lista de árboles evaluados." };
    if (!listaEvaluados || !porArbol) return { estado: "cargando" };
    const fichasLeidas = [...porArbol.values()].filter((f): f is FichaArbol => f !== null);
    if (fichasLeidas.length > 0 && fichasLeidas.every((f) => f.estimacion_carbono_aereo_lenoso === undefined)) {
      return { estado: "no_disponible", motivo: "La estimación de carbono por árbol (CC-069) todavía no está publicada en la API de la plataforma." };
    }
    const arboles = listaEvaluados
      .flatMap((a) => {
        const c = porArbol.get(a.tree_id)?.estimacion_carbono_aereo_lenoso;
        return c?.valor ? [{ ...a, carbono_kg: c.valor.carbono_kg }] : [];
      })
      .sort((x, y) => y.carbono_kg - x.carbono_kg);
    return { estado: "listo", arboles, evaluados: listaEvaluados.length };
  }, [evaluados, projectId, listaEvaluados, porArbol]);

  const arbolSel = arbolParam ?? listaEvaluados?.[0]?.tree_id ?? null;
  const [fichaSuelta, setFichaSuelta] = useState<{ id: string; carga: Carga<FichaArbol> } | null>(null);
  const fichaEnCache = arbolSel && porArbol ? porArbol.get(arbolSel) : undefined;
  useEffect(() => {
    if (vista !== "arbol" || !arbolSel || fichaEnCache) return;
    let cancelado = false;
    obtenerFichaArbol(projectId, arbolSel)
      .then((datos) => !cancelado && setFichaSuelta({ id: arbolSel, carga: { estado: "listo", datos } }))
      .catch((e: unknown) => !cancelado && setFichaSuelta({ id: arbolSel, carga: { estado: "error", mensaje: e instanceof Error ? e.message : "No se pudo cargar la ficha." } }));
    return () => {
      cancelado = true;
    };
  }, [vista, arbolSel, fichaEnCache, projectId]);
  const ficha: Carga<FichaArbol> | null = !arbolSel
    ? null
    : fichaEnCache
      ? { estado: "listo", datos: fichaEnCache }
      : fichaSuelta?.id === arbolSel
        ? fichaSuelta.carga
        : { estado: "cargando" };

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
          <h1 className="bio-head__title">{vista === "proyecto" ? "La huella verde del proyecto" : "Ficha biométrica del árbol"}</h1>
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
              <HuellaVerde d={datos} aportes={aportes} />
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
          {listaEvaluados && listaEvaluados.length > 0 && (
            <nav className="bio-trees" aria-label="Árboles con evaluación vigente">
              {listaEvaluados.map((a) => (
                <button key={a.tree_id} className={a.tree_id === arbolSel ? "is-on" : ""} aria-pressed={a.tree_id === arbolSel} onClick={() => actualizar({ arbol: a.tree_id })}>
                  {a.tree_code}
                </button>
              ))}
            </nav>
          )}
          {!listaEvaluados && evaluados?.carga.estado !== "error" && <SivuLoader message="Buscando los árboles evaluados…" />}
          {listaEvaluados && listaEvaluados.length === 0 && !arbolParam && (
            <div className="bio-card bio-vacio">
              <strong>Ningún árbol tiene todavía una evaluación vigente.</strong>
              <span>La ficha biométrica se llena cuando el Usuario municipal completa una OT de Inspección.</span>
            </div>
          )}
          {ficha?.estado === "cargando" && listaEvaluados && <SivuLoader message="Abriendo la ficha del árbol…" />}
          {ficha?.estado === "error" && (
            <div className="bio-card bio-error" role="alert">
              <strong>No se pudo abrir la ficha.</strong>
              <span>{ficha.mensaje}</span>
            </div>
          )}
          {ficha?.estado === "listo" && <FichaBiometrica ficha={ficha.datos} />}
        </>
      )}
    </div>
  );
}
