import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listarInventarioCompleto } from "../../api/inventory";
import { listarDiagnosticos } from "../../api/diagnosticos";
import { obtenerCatalogos } from "../../api/catalogs";
import { buscarEspeciesCatalogo } from "../../api/species";
import { Icon } from "../Icons";
import { ClassificationBadge, getClassificationTone } from "../ClassificationBadge";
import { fotoDeEspecie } from "../conecta/fotosEspecie";
import type { ArbolInventario } from "../../types/inventory";
import type { Diagnostico, CodigoEtiqueta } from "../../types/diagnostico";
import type { Catalogos } from "../../types/catalogs";
import type { EspecieCatalogo } from "../../types/species";

/**
 * Apartado «Especies» del módulo Inventario (pedido de la responsable,
 * 2026-11-22). Tabla con las especies que tienen árboles en el inventario y
 * lo registrado en el catálogo (CC-053); al elegir una, su ficha con los
 * árboles de esa especie y su clasificación de riesgo vigente (B18, CC-050).
 * El frontend solo agrupa y cuenta lo que entrega la API: no calcula
 * clasificaciones ni indicadores.
 */

type Tono = ReturnType<typeof getClassificationTone>;
const TONOS: { tono: Exclude<Tono, "neutral">; etiqueta: string }[] = [
  { tono: "critical", etiqueta: "Extremo" },
  { tono: "high", etiqueta: "Alto" },
  { tono: "medium", etiqueta: "Moderado" },
  { tono: "low", etiqueta: "Bajo" },
];
const RANGO: Record<Tono, number> = { critical: 4, high: 3, medium: 2, low: 1, neutral: 0 };

interface ArbolEspecie {
  arbol: ArbolInventario;
  riesgo: CodigoEtiqueta | null;
}

interface Especie {
  clave: string;
  cientifico: string | null;
  comun: string | null;
  arboles: ArbolEspecie[];
  porTono: Record<Tono, number>;
  pendientes: number;
}

type Carga<T> = { estado: "cargando" } | { estado: "listo"; datos: T } | { estado: "error"; mensaje: string };

export function CatalogoEspecies({ projectId, onArbol }: { projectId: string; onArbol: (treeId: string) => void }) {
  const [params, setParams] = useSearchParams();
  const elegida = params.get("especie");

  const [carga, setCarga] = useState<{ id: string; datos: Carga<{ arboles: ArbolInventario[]; diags: Diagnostico[]; catalogos: Catalogos }> } | null>(null);
  const [fichas, setFichas] = useState<Record<string, EspecieCatalogo | null>>({});
  const [busqueda, setBusqueda] = useState("");
  const [origen, setOrigen] = useState("");
  const [orden, setOrden] = useState<"arboles" | "nombre" | "riesgo">("arboles");

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      listarInventarioCompleto(projectId, {}),
      listarDiagnosticos(projectId).catch(() => [] as Diagnostico[]),
      obtenerCatalogos().catch(() => ({}) as Catalogos),
    ])
      .then(([arboles, diags, catalogos]) => !cancelado && setCarga({ id: projectId, datos: { estado: "listo", datos: { arboles, diags, catalogos } } }))
      .catch((e: unknown) => !cancelado && setCarga({ id: projectId, datos: { estado: "error", mensaje: e instanceof Error ? e.message : "No se pudo cargar el inventario." } }));
    return () => {
      cancelado = true;
    };
  }, [projectId]);

  const datos = carga?.id === projectId && carga.datos.estado === "listo" ? carga.datos.datos : null;

  // Especies del inventario (solo árboles activos o con cualquier ciclo: se muestran todos los del inventario).
  const especies = useMemo<Especie[]>(() => {
    if (!datos) return [];
    const riesgoDe = new Map(datos.diags.map((d) => [d.tree_id, d.vigente?.resultado.clasificacion_riesgo ?? null]));
    const grupos = new Map<string, Especie>();
    for (const a of datos.arboles) {
      const clave = a.especie_cientifica?.trim() || "__sin__";
      let g = grupos.get(clave);
      if (!g) {
        g = { clave, cientifico: a.especie_cientifica?.trim() || null, comun: null, arboles: [], porTono: { critical: 0, high: 0, medium: 0, low: 0, neutral: 0 }, pendientes: 0 };
        grupos.set(clave, g);
      }
      const riesgo = riesgoDe.get(a.id) ?? null;
      g.arboles.push({ arbol: a, riesgo });
      if (riesgo) g.porTono[getClassificationTone(riesgo.etiqueta)]++;
      else g.pendientes++;
      if (!g.comun && a.nombre_comun) g.comun = a.nombre_comun;
    }
    return [...grupos.values()];
  }, [datos]);

  // Lo registrado en el catálogo de cada especie (CC-053): una búsqueda exacta por nombre.
  const nombresClave = especies.map((e) => e.cientifico).filter((n): n is string => !!n).join("|");
  useEffect(() => {
    if (!nombresClave) return;
    let cancelado = false;
    const nombres = nombresClave.split("|");
    Promise.all(
      nombres.map((n) =>
        buscarEspeciesCatalogo(projectId, n)
          .then((r) => [n, r.find((x) => x.especie_cientifica.toLowerCase() === n.toLowerCase()) ?? null] as const)
          .catch(() => [n, null] as const)
      )
    ).then((pares) => !cancelado && setFichas(Object.fromEntries(pares)));
    return () => {
      cancelado = true;
    };
  }, [projectId, nombresClave]);

  const etiqueta = (catalogo: string, codigo: string | null | undefined) =>
    codigo ? datos?.catalogos[catalogo]?.find((i) => i.codigo === codigo)?.etiqueta ?? codigo : null;
  const totalArboles = datos?.arboles.length ?? 0;
  const origenes = datos?.catalogos.origen_biogeografico ?? [];

  const q = busqueda.trim().toLowerCase();
  const visibles = especies
    .filter((e) => !q || `${e.cientifico ?? ""} ${e.comun ?? ""} ${fichas[e.cientifico ?? ""]?.familia ?? ""}`.toLowerCase().includes(q))
    .filter((e) => !origen || fichas[e.cientifico ?? ""]?.origen_biogeografico === origen)
    .sort((a, b) => {
      if (orden === "nombre") return (a.comun ?? a.cientifico ?? "~").localeCompare(b.comun ?? b.cientifico ?? "~", "es");
      if (orden === "riesgo") {
        const pa = a.porTono.critical * 1000 + a.porTono.high * 100 + a.porTono.medium * 10;
        const pb = b.porTono.critical * 1000 + b.porTono.high * 100 + b.porTono.medium * 10;
        if (pb !== pa) return pb - pa;
      }
      return b.arboles.length - a.arboles.length;
    });

  const seleccion = especies.find((e) => e.clave === elegida) ?? null;
  const abrir = (clave: string | null) => {
    const p = new URLSearchParams(params);
    if (clave) p.set("especie", clave);
    else p.delete("especie");
    setParams(p, { replace: true });
  };

  // Escape cierra la ficha.
  useEffect(() => {
    if (!seleccion) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && abrir(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="sivu-esp">
      <p className="sivu-esp__resumen">
        {datos ? `${especies.filter((e) => e.cientifico).length} especies con árboles en el inventario · ${totalArboles} árboles` : "Especies del proyecto y lo registrado en el catálogo."}
      </p>

      <div className="sivu-esp__tools">
        <label className="sivu-esp__search">
          <Icon name="search" size={15} />
          <input type="search" placeholder="Buscar por nombre común, científico o familia" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar especie" />
        </label>
        <select value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Filtrar por origen">
          <option value="">Todos los orígenes</option>
          {origenes.map((o) => (
            <option key={o.codigo} value={o.codigo}>
              {o.etiqueta}
            </option>
          ))}
        </select>
        <div className="sivu-seg" role="group" aria-label="Ordenar">
          {(
            [
              ["arboles", "Más árboles"],
              ["riesgo", "Mayor riesgo"],
              ["nombre", "A–Z"],
            ] as const
          ).map(([v, t]) => (
            <button key={v} type="button" className={`sivu-seg__opt ${orden === v ? "is-on" : ""}`} aria-pressed={orden === v} onClick={() => setOrden(v)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {carga?.datos.estado === "error" && carga.id === projectId ? (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {carga.datos.mensaje}
        </p>
      ) : !datos ? (
        <p className="sivu-state">Cargando el catálogo…</p>
      ) : visibles.length === 0 ? (
        <p className="sivu-state">Ninguna especie coincide con la búsqueda.</p>
      ) : (
        <div className="sivu-esp__tabla-wrap">
          <table className="sivu-esp__tabla">
            <thead>
              <tr>
                <th scope="col">Especie</th>
                <th scope="col">Familia</th>
                <th scope="col">Origen</th>
                <th scope="col">Follaje</th>
                <th scope="col" className="is-num">
                  Árboles
                </th>
                <th scope="col">Riesgo vigente</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => {
                const f = e.cientifico ? fichas[e.cientifico] : null;
                const foto = fotoDeEspecie(e.cientifico);
                const pct = totalArboles ? Math.round((e.arboles.length / totalArboles) * 100) : 0;
                return (
                  <tr
                    key={e.clave}
                    className={seleccion?.clave === e.clave ? "is-sel" : ""}
                    tabIndex={0}
                    onClick={() => abrir(e.clave)}
                    onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), abrir(e.clave))}
                    aria-label={`Abrir ${e.comun ?? e.cientifico ?? "árboles sin especie"}`}
                  >
                    <td>
                      <div className="sivu-esp__nombre">
                        <span className="sivu-esp__foto" aria-hidden="true">
                          {foto ? <img src={foto} alt="" loading="lazy" /> : <Icon name="leaf" size={16} />}
                        </span>
                        <span>
                          <strong>{e.comun ?? e.cientifico ?? "Sin especie registrada"}</strong>
                          {e.cientifico && <em>{e.cientifico}</em>}
                        </span>
                      </div>
                    </td>
                    <td>{f?.familia ?? <span className="sivu-esp__nd">—</span>}</td>
                    <td>{etiqueta("origen_biogeografico", f?.origen_biogeografico) ?? <span className="sivu-esp__nd">—</span>}</td>
                    <td>{etiqueta("persistencia_follaje", f?.persistencia_follaje) ?? <span className="sivu-esp__nd">—</span>}</td>
                    <td className="is-num">
                      <strong>{e.arboles.length}</strong>
                      <small>{pct}%</small>
                    </td>
                    <td>
                      <BarraRiesgo especie={e} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {seleccion && (
        <FichaEspecie
          especie={seleccion}
          ficha={seleccion.cientifico ? fichas[seleccion.cientifico] ?? null : null}
          totalArboles={totalArboles}
          etiqueta={etiqueta}
          onCerrar={() => abrir(null)}
          onArbol={onArbol}
        />
      )}
    </div>
  );
}

/** Barra apilada con los árboles por nivel de riesgo vigente; el texto acompaña al color. */
function BarraRiesgo({ especie }: { especie: Especie }) {
  const total = especie.arboles.length || 1;
  const partes = TONOS.filter((t) => especie.porTono[t.tono] > 0);
  const resumen = [
    ...partes.map((t) => `${especie.porTono[t.tono]} ${t.etiqueta.toLowerCase()}`),
    ...(especie.porTono.neutral ? [`${especie.porTono.neutral} no determinado`] : []),
    ...(especie.pendientes ? [`${especie.pendientes} sin evaluación vigente`] : []),
  ].join(", ");
  const peor = partes[0];
  return (
    <div className="sivu-esp__riesgo" title={resumen} aria-label={resumen}>
      <div className="sivu-esp__barra">
        {partes
          .slice()
          .reverse()
          .map((t) => (
            <span key={t.tono} style={{ width: `${(especie.porTono[t.tono] / total) * 100}%`, background: `var(--classification-${t.tono})` }} />
          ))}
        {especie.porTono.neutral > 0 && <span className="is-nd" style={{ width: `${(especie.porTono.neutral / total) * 100}%` }} />}
      </div>
      <span className="sivu-esp__riesgo-txt">
        {peor ? `${especie.porTono[peor.tono]} ${peor.etiqueta.toLowerCase()}` : especie.porTono.neutral ? "No determinado" : "Sin evaluación vigente"}
      </span>
    </div>
  );
}

/** Ficha de la especie: lo registrado en el catálogo y sus árboles con la clasificación vigente. */
function FichaEspecie({
  especie,
  ficha,
  totalArboles,
  etiqueta,
  onCerrar,
  onArbol,
}: {
  especie: Especie;
  ficha: EspecieCatalogo | null;
  totalArboles: number;
  etiqueta: (catalogo: string, codigo: string | null | undefined) => string | null;
  onCerrar: () => void;
  onArbol: (id: string) => void;
}) {
  const foto = fotoDeEspecie(especie.cientifico);
  const pct = totalArboles ? Math.round((especie.arboles.length / totalArboles) * 100) : 0;
  const arboles = [...especie.arboles].sort((a, b) => {
    const ra = a.riesgo ? RANGO[getClassificationTone(a.riesgo.etiqueta)] : -1;
    const rb = b.riesgo ? RANGO[getClassificationTone(b.riesgo.etiqueta)] : -1;
    return rb - ra || a.arbol.tree_code.localeCompare(b.arbol.tree_code);
  });
  const datos: [string, string | null][] = [
    ["Género", ficha?.genero ?? null],
    ["Familia", ficha?.familia ?? null],
    ["Origen", etiqueta("origen_biogeografico", ficha?.origen_biogeografico)],
    ["Follaje", etiqueta("persistencia_follaje", ficha?.persistencia_follaje)],
    ["Tipo de hoja", etiqueta("tipo_hoja", ficha?.tipo_hoja)],
  ];
  return (
    <aside className="sivu-sheet sivu-sheet--drawer sivu-esp__ficha" aria-label={`Ficha de ${especie.comun ?? especie.cientifico ?? "la especie"}`}>
      <div className="sivu-esp__ficha-head">
        <span className="sivu-esp__ficha-foto" aria-hidden="true">
          {foto ? <img src={foto} alt="" /> : <Icon name="leaf" size={26} />}
        </span>
        <div>
          <h2>{especie.comun ?? especie.cientifico ?? "Sin especie registrada"}</h2>
          {especie.cientifico && <em>{especie.cientifico}</em>}
        </div>
        <button type="button" className="sivu-esp__cerrar" onClick={onCerrar} aria-label="Cerrar ficha">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="sivu-sheet__body sivu-esp__ficha-body">
        <div className="sivu-esp__cifras">
          <div>
            <strong>{especie.arboles.length}</strong>
            <span>árboles · {pct}% del inventario</span>
          </div>
          <div>
            <strong>{especie.arboles.length - especie.pendientes}</strong>
            <span>con evaluación vigente</span>
          </div>
        </div>

        <section>
          <h3>Riesgo vigente</h3>
          <div className="sivu-esp__niveles">
            {TONOS.filter((t) => especie.porTono[t.tono] > 0).map((t) => (
              <span key={t.tono} className="sivu-esp__nivel">
                <ClassificationBadge level={t.etiqueta} />
                <b>{especie.porTono[t.tono]}</b>
              </span>
            ))}
            {especie.porTono.neutral > 0 && (
              <span className="sivu-esp__nivel">
                <ClassificationBadge level="No determinado" />
                <b>{especie.porTono.neutral}</b>
              </span>
            )}
            {especie.pendientes > 0 && (
              <span className="sivu-esp__nivel">
                <span className="status-pill">Sin evaluación vigente</span>
                <b>{especie.pendientes}</b>
              </span>
            )}
          </div>
        </section>

        <section>
          <h3>En el catálogo</h3>
          {ficha === null && especie.cientifico ? (
            <p className="sivu-esp__nd">Esta especie no tiene ficha en el catálogo.</p>
          ) : (
            <dl className="sivu-esp__datos">
              {datos.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v ?? <span className="sivu-esp__nd">Sin dato</span>}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section>
          <h3>Árboles de esta especie</h3>
          <ul className="sivu-esp__arboles">
            {arboles.map(({ arbol, riesgo }) => (
              <li key={arbol.id}>
                <button type="button" onClick={() => onArbol(arbol.id)} title="Abrir la ficha del árbol">
                  <span className="sivu-esp__arbol-id">
                    <strong>{arbol.tree_code}</strong>
                    <small>{arbol.ubicacion_descriptiva ?? arbol.sector ?? "Sin ubicación descriptiva"}</small>
                  </span>
                  <span className="sivu-esp__arbol-med">
                    {arbol.dap_cm != null ? `DAP ${arbol.dap_cm.toLocaleString("es-CL", { maximumFractionDigits: 1 })} cm` : "DAP —"}
                    <small>{arbol.altura_total_m != null ? `${arbol.altura_total_m.toLocaleString("es-CL", { maximumFractionDigits: 1 })} m` : "Altura —"}</small>
                  </span>
                  {riesgo ? <ClassificationBadge level={riesgo.etiqueta} /> : <span className="status-pill">Pendiente</span>}
                  <Icon name="arrow-right" size={13} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
