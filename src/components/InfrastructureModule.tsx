import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { obtenerInfraestructura } from "../api/infraestructura";
import { listarInventarioCompleto } from "../api/inventory";
import type { ArbolInfraestructura, RespuestaInfraestructura } from "../types/infraestructura";
import type { ArbolInventario } from "../types/inventory";
import type { MapPoint } from "./ProjectMapView";
import { TerritorialModule } from "./TerritorialModule";
import { Icon } from "./Icons";
import { InfraSheet } from "./InfraSheet";
import { CATEGORIAS_CON_AFECTACION, COMPONENTES, svgDataUrl } from "../lib/infraestructura";
import { PRIORIDADES, prioridadDe, svgPin, svgPinPendiente } from "../lib/prioridadGestion";

/**
 * Infraestructura (rediseño 2026-11-24, pedido de la responsable): responde
 * tres preguntas en orden.
 * 1. Qué hacer y dónde: prioridad de intervención (M05, riesgo × afectación)
 *    con su orientación de gestión; cada grupo filtra el mapa.
 * 2. Qué está dañando: árboles con afectación por componente y su severidad
 *    (M04); solo los componentes con algún árbol afectado, y aparte lo que
 *    quedó sin evaluar.
 * 3. El mapa: pin por prioridad (paleta propia, distinta de la de riesgo);
 *    lo urgente más grande; los árboles sin evaluación, tenues.
 * Los datos son los de B8; el frontend solo agrupa y dibuja.
 */


/** Nombre de la clasificación de prioridad tal como lo entrega B8 (Crítica, Alta, Media, Baja). */
function etiquetaPrioridad(filas: ArbolInfraestructura[], codigo: string): string {
  return filas.find((f) => f.prioridad?.codigo === codigo)?.prioridad?.etiqueta ?? codigo.charAt(0).toUpperCase() + codigo.slice(1);
}

function categoriaDe(f: ArbolInfraestructura, componente: string): string | null {
  return f.componentes.find((c) => c.componente.codigo === componente)?.categoria?.codigo ?? null;
}

export function InfrastructureModule() {
  const { projectId = "" } = useParams();
  const [datos, setDatos] = useState<{ infra: RespuestaInfraestructura; inventario: ArbolInventario[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  /** Filtro del mapa: una prioridad o un componente (null = todos). */
  const [filtro, setFiltro] = useState<{ tipo: "prioridad" | "componente"; codigo: string } | null>(null);
  const [verPendientes, setVerPendientes] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([obtenerInfraestructura(projectId), listarInventarioCompleto(projectId, {})])
      .then(([infra, inventario]) => {
        if (!cancelled) setDatos({ infra, inventario });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar la infraestructura del proyecto.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filas = useMemo(() => datos?.infra.arboles ?? [], [datos]);
  const porId = useMemo(() => new Map(filas.map((f) => [f.arbol.id, f])), [filas]);
  const pendientes = useMemo(
    () => (datos?.inventario ?? []).filter((a) => a.estado_ciclo_vida === "activo" && !porId.has(a.id)),
    [datos, porId]
  );

  const pasa = (f: ArbolInfraestructura) => {
    if (!filtro) return true;
    if (filtro.tipo === "prioridad") return f.prioridad?.codigo === filtro.codigo;
    return CATEGORIAS_CON_AFECTACION.includes(categoriaDe(f, filtro.codigo) ?? "");
  };

  const points: MapPoint[] = [];
  // Lo urgente al final, para que quede encima.
  const orden = (f: ArbolInfraestructura) => PRIORIDADES.length - PRIORIDADES.findIndex((p) => p.codigo === f.prioridad?.codigo);
  for (const f of [...filas].sort((a, b) => orden(b) - orden(a))) {
    const u = f.arbol.ubicacion;
    if (!u || !pasa(f)) continue;
    const p = prioridadDe(f.prioridad?.codigo);
    const color = p?.color ?? "#A7B0AB";
    points.push({
      id: f.arbol.id,
      lng: u.lng,
      lat: u.lat,
      title: f.arbol.tree_code,
      label: f.arbol.nombre_comun ?? f.arbol.especie_cientifica ?? undefined,
      detail: p ? p.orientacion : "Sin prioridad",
      color,
      icon: { url: svgDataUrl(svgPin(color, p?.codigo === "critica")), size: p?.pin ?? 14, key: `pr:${p?.codigo ?? "x"}` },
    });
  }
  if (verPendientes && !filtro) {
    for (const a of pendientes) {
      if (!a.ubicacion) continue;
      points.push({
        id: a.id,
        lng: a.ubicacion.lng,
        lat: a.ubicacion.lat,
        title: a.tree_code,
        label: a.nombre_comun ?? a.especie_cientifica ?? undefined,
        detail: "Sin evaluación vigente",
        color: "#A7B0AB",
        icon: { url: svgDataUrl(svgPinPendiente()), size: 14, key: "pend" },
      });
    }
  }

  const fila = elegido ? porId.get(elegido) ?? null : null;
  const arbolPendiente = elegido && !fila ? datos?.inventario.find((a) => a.id === elegido) ?? null : null;
  const nPendientes = pendientes.filter((a) => a.ubicacion).length;
  const alternar = (tipo: "prioridad" | "componente", codigo: string) =>
    setFiltro((f) => (f && f.tipo === tipo && f.codigo === codigo ? null : { tipo, codigo }));

  return (
    <TerritorialModule
      moduleLabel="Infraestructura gris"
      points={points}
      selectedId={elegido}
      onSelect={setElegido}
      sheet={
        fila || arbolPendiente ? (
          <InfraSheet
            key={elegido!}
            projectId={projectId}
            fila={fila}
            arbol={arbolPendiente}
            componenteInicial={filtro?.tipo === "componente" ? filtro.codigo : null}
            onClose={() => setElegido(null)}
          />
        ) : undefined
      }
      card={
        <>
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!datos && !error && <p className="sivu-state">Cargando la infraestructura del proyecto…</p>}
          {datos && (
            <Panel
              infra={datos.infra}
              filas={filas}
              filtro={filtro}
              onFiltro={alternar}
              nPendientes={nPendientes}
              verPendientes={verPendientes}
              onPendientes={() => setVerPendientes((v) => !v)}
            />
          )}
        </>
      }
    />
  );
}

/** Panel lateral: 1) qué hacer y dónde; 2) qué está dañando; 3) qué falta evaluar. */
function Panel({
  infra,
  filas,
  filtro,
  onFiltro,
  nPendientes,
  verPendientes,
  onPendientes,
}: {
  nPendientes: number;
  verPendientes: boolean;
  onPendientes: () => void;
  infra: RespuestaInfraestructura;
  filas: ArbolInfraestructura[];
  filtro: { tipo: "prioridad" | "componente"; codigo: string } | null;
  onFiltro: (tipo: "prioridad" | "componente", codigo: string) => void;
}) {
  const { cobertura, resumen } = infra;
  const conteo = (codigo: string) => filas.filter((f) => f.prioridad?.codigo === codigo).length;
  const comps = COMPONENTES.map((c) => {
    const r = resumen.por_componente.find((p) => p.componente.codigo === c.codigo);
    const n = (k: string) => r?.categorias.find((x) => x.codigo === k)?.arboles ?? 0;
    return { def: c, severa: n("severa"), moderada: n("moderada"), leve: n("leve"), sinDato: n("no_determinado") };
  });
  const afectados = comps.filter((c) => c.severa + c.moderada + c.leve > 0);
  // «Sin daño» solo si además no quedaron árboles sin determinar en ese componente.
  const sinAfectacion = comps.filter((c) => c.severa + c.moderada + c.leve === 0 && c.sinDato === 0).map((c) => c.def.nombre.toLowerCase());
  const maxAf = Math.max(1, ...afectados.map((c) => c.severa + c.moderada + c.leve));

  return (
    <div className="infp">
      <section className="infp__bloque" aria-labelledby="infp-que-hacer">
        <h3 id="infp-que-hacer" title="Prioridad de intervención: riesgo del árbol × infraestructura gris (M05)">
          Qué hacer y dónde
        </h3>
        <div className="infp__prio">
          {PRIORIDADES.map((p) => {
            const n = conteo(p.codigo);
            const on = filtro?.tipo === "prioridad" && filtro.codigo === p.codigo;
            return (
              <button
                key={p.codigo}
                type="button"
                className={`infp__prio-tile ${on ? "is-on" : ""} ${n === 0 ? "is-cero" : ""}`}
                style={{ ["--pc" as string]: p.color }}
                aria-pressed={on}
                title={p.orientacion}
                onClick={() => onFiltro("prioridad", p.codigo)}
              >
                <span className="infp__prio-n">{n}</span>
                <span className="infp__prio-txt">{etiquetaPrioridad(filas, p.codigo)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="infp__bloque" aria-labelledby="infp-dano">
        <h3 id="infp-dano">Qué está dañando</h3>
        {afectados.length === 0 ? (
          <p className="infp__sub">Ningún árbol evaluado afecta la infraestructura.</p>
        ) : (
          <div className="infp__comps">
            {afectados.map((c) => {
              const total = c.severa + c.moderada + c.leve;
              const on = filtro?.tipo === "componente" && filtro.codigo === c.def.codigo;
              return (
                <button
                  key={c.def.codigo}
                  type="button"
                  className={`infp__comp ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => onFiltro("componente", c.def.codigo)}
                  title={`${c.def.nombre} · Severa ${c.severa} · Moderada ${c.moderada} · Leve ${c.leve}`}
                >
                  <span className="infp__comp-nom">{c.def.corto}</span>
                  <span className="infp__pista">
                    <span className="infp__barra" style={{ width: `${(total / maxAf) * 100}%` }} aria-hidden>
                      {c.severa > 0 && <i className="is-sev" style={{ flexGrow: c.severa }} />}
                      {c.moderada > 0 && <i className="is-mod" style={{ flexGrow: c.moderada }} />}
                      {c.leve > 0 && <i className="is-lev" style={{ flexGrow: c.leve }} />}
                    </span>
                  </span>
                  <b>{total}</b>
                </button>
              );
            })}
          </div>
        )}
        <div className="infp__ley" aria-hidden>
          <span>
            <i className="is-lev" /> leve
          </span>
          <span>
            <i className="is-mod" /> moderada
          </span>
          <span>
            <i className="is-sev" /> severa
          </span>
        </div>
        {sinAfectacion.length > 0 && <p className="infp__sub">Sin daño: {sinAfectacion.join(", ")}.</p>}
      </section>

      <div className="infp__pie">
        <span>
          {cobertura.arboles_con_evaluacion_valida} de {cobertura.arboles_presentes} árboles evaluados
        </span>
        {nPendientes > 0 && (
          <label className="infp__toggle">
            <input type="checkbox" checked={verPendientes} onChange={onPendientes} />
            Ver los {nPendientes} sin evaluar
          </label>
        )}
      </div>
    </div>
  );
}
