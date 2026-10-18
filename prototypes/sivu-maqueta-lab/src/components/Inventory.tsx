import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { RiskTag, Segmented } from "./primitives";
import { PageHead } from "./Dashboard";
import { PROJECT, type Tree, type TreeRisk } from "../data/mock";
import { INVENTORY, SPECIES_COLOR, SPECIES_LIST, type InvRow, type LifeState } from "../data/lab";
import type { Role } from "../data/nav";

type RiskFilter = "todos" | "alto" | "sin";
const PAGE = 12;

const matchesRisk = (r: TreeRisk, f: RiskFilter) =>
  f === "todos" ? true : f === "alto" ? r === "Alto" || r === "Extremo" : r === null || r === "Sin clasificación";

/** Minimapa del inventario: encuadra los árboles sobre la imagen aérea y resalta los filtrados. */
function InvMap({ rows, selectedId, hoverId, onSelect }: { rows: InvRow[]; selectedId: string | null; hoverId: string | null; onSelect: (t: Tree) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 330, h: 300 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Encuadre fijo sobre todo el inventario georreferenciado, para que el mapa no salte al filtrar.
  const all = INVENTORY.filter((r) => r.georef);
  const x0 = Math.min(...all.map((r) => r.tree.x)) - 40;
  const x1 = Math.max(...all.map((r) => r.tree.x)) + 40;
  const y0 = Math.min(...all.map((r) => r.tree.y)) - 40;
  const y1 = Math.max(...all.map((r) => r.tree.y)) + 40;
  const k = Math.min(size.w / (x1 - x0), size.h / (y1 - y0));
  // Centrado, pero sin dejar ver el borde de la imagen aérea (1440×900).
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const ox = clamp((size.w - (x1 - x0) * k) / 2 - x0 * k, size.w - 1440 * k, 0);
  const oy = clamp((size.h - (y1 - y0) * k) / 2 - y0 * k, size.h - 900 * k, 0);
  const ids = new Set(rows.map((r) => r.tree.id));

  return (
    <div className="invmap" ref={box} role="application" aria-label="Minimapa de árboles filtrados (imagen aérea ilustrativa)">
      <div className="invmap__inner" style={{ transform: `translate(${ox}px, ${oy}px) scale(${k})` }}>
        <div className="map__imagery" />
        <div className="map__grade" />
      </div>
      {all.map((r) => {
        const on = ids.has(r.tree.id);
        return (
          <button
            key={r.tree.id}
            type="button"
            className={`spin ${on ? "" : "spin--off"} ${r.tree.id === selectedId ? "is-sel" : ""} ${r.tree.id === hoverId ? "is-hover" : ""}`}
            style={{ left: r.tree.x * k + ox, top: r.tree.y * k + oy, ["--c" as string]: SPECIES_COLOR[r.tree.common] ?? "#fff" }}
            aria-label={`${r.tree.code} · ${r.tree.common}`}
            title={`${r.tree.code} · ${r.tree.common}`}
            tabIndex={on ? 0 : -1}
            onClick={() => on && onSelect(r.tree)}
          />
        );
      })}
    </div>
  );
}

export function Inventory({
  role,
  selectedId,
  onSelect,
  onMap,
}: {
  role: Role;
  selectedId: string | null;
  onSelect: (t: Tree) => void;
  onMap: () => void;
}) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<LifeState | "todos">("Activo");
  const [risk, setRisk] = useState<RiskFilter>("todos");
  const [page, setPage] = useState(0);
  const [species, setSpecies] = useState<string[]>([]);
  const [sq, setSq] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const toggleSpecies = (c: string) => {
    setSpecies((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));
    setPage(0);
  };
  const speciesShown = SPECIES_LIST.filter((x) => `${x.common} ${x.scientific}`.toLowerCase().includes(sq.trim().toLowerCase()));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return INVENTORY.filter(
      (r) =>
        (estado === "todos" || r.estado === estado) &&
        matchesRisk(r.tree.risk, risk) &&
        (species.length === 0 || species.includes(r.tree.common)) &&
        (!s || `${r.tree.code} ${r.tree.common} ${r.tree.scientific} ${r.tree.place}`.toLowerCase().includes(s))
    );
  }, [q, estado, risk, species]);
  const mapped = rows.filter((r) => r.georef);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  const shown = rows.slice(p * PAGE, p * PAGE + PAGE);

  return (
    <div className={`page page--inv ${selectedId ? "page--with-sheet" : ""}`}>
      <PageHead
        title="Inventario"
        meta={`${PROJECT.total} árboles · ${PROJECT.georef} georreferenciados · ${PROJECT.especies} especies`}
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={onMap}>
              <Icon name="map" size={16} />
              Ver en mapa
            </button>
            {role === "municipal" && (
              <button type="button" className="btn-primary btn-primary--auto">
                <Icon name="plus" size={16} stroke={2.2} />
                Nuevo árbol
              </button>
            )}
          </>
        }
      />

      <div className="inv">
      <div className="inv__main">
      <div className="tbar">
        <label className="search">
          <Icon name="search" size={16} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por código, especie o ubicación"
            aria-label="Buscar árboles"
          />
        </label>
        <Segmented
          label="Estado del ciclo de vida"
          size="sm"
          value={estado}
          onChange={(v) => {
            setEstado(v);
            setPage(0);
          }}
          options={[
            { value: "Activo", label: "Activos" },
            { value: "Retirado", label: "Retirados" },
            { value: "Tocón", label: "Tocones" },
            { value: "todos", label: "Todos" },
          ]}
        />
        <Segmented
          label="Filtro de riesgo"
          size="sm"
          value={risk}
          onChange={(v) => {
            setRisk(v);
            setPage(0);
          }}
          options={[
            { value: "todos", label: "Todo riesgo" },
            { value: "alto", label: "Alto y extremo" },
            { value: "sin", label: "Sin clasificar" },
          ]}
        />
        <span className="tbar__count">{rows.length} resultados</span>
      </div>

      <div className="panel tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Código</th>
              <th>Especie</th>
              <th className="opt">Ubicación</th>
              <th>Estado</th>
              <th className="num">DAP</th>
              <th className="num">Altura</th>
              <th>Riesgo</th>
              <th className="opt">Infraestructura</th>
              <th>Última medición</th>
              <th aria-label="Georreferenciación" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.tree.id}
                className={r.tree.id === selectedId ? "is-sel" : ""}
                onClick={() => onSelect(r.tree)}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect(r.tree)}
                onMouseEnter={() => setHoverId(r.tree.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <td className="mono">{r.tree.code}</td>
                <td>
                  <strong>
                    <i className="spdot" style={{ background: SPECIES_COLOR[r.tree.common] }} />
                    {r.tree.common}
                  </strong>
                  <em>{r.tree.scientific}</em>
                </td>
                <td className="muted opt">{r.tree.place}</td>
                <td>
                  <span className={`life life--${r.estado === "Activo" ? "on" : "off"}`}>{r.estado}</span>
                </td>
                <td className="num">{r.dap} cm</td>
                <td className="num">{r.altura.toString().replace(".", ",")} m</td>
                <td>
                  <RiskTag level={r.tree.risk} />
                </td>
                <td className="muted opt">{r.tree.infra ? "Con evaluación" : "—"}</td>
                <td className="muted mono">{r.medicion}</td>
                <td>
                  {r.georef ? (
                    <span className="geo geo--ok" title="Georreferenciado">
                      <Icon name="pin" size={15} />
                    </span>
                  ) : (
                    <span className="geo geo--no" title="Sin georreferenciar">
                      <Icon name="alert" size={14} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr className="tbl__empty">
                <td colSpan={10}>Ningún árbol coincide con la búsqueda y los filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="pager">
          <span>
            Mostrando {rows.length ? p * PAGE + 1 : 0}–{p * PAGE + shown.length} de {rows.length} en la maqueta · {PROJECT.total} en el proyecto
          </span>
          <div className="pager__btns">
            <button type="button" className="icon-btn icon-btn--plain" aria-label="Página anterior" disabled={p === 0} onClick={() => setPage(p - 1)}>
              <Icon name="chevronLeft" size={16} />
            </button>
            <span className="mono">
              {p + 1} / {pages}
            </span>
            <button type="button" className="icon-btn icon-btn--plain" aria-label="Página siguiente" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>
      </div>
      </div>

      {!selectedId && (
        <aside className="inv__side">
          <section className="panel spp" aria-label="Filtrar por especie">
            <div className="panel__head">
              <h2>Especies</h2>
              {species.length > 0 ? (
                <button
                  type="button"
                  className="panel__link"
                  onClick={() => {
                    setSpecies([]);
                    setPage(0);
                  }}
                >
                  Quitar filtro ({species.length})
                </button>
              ) : (
                <span className="panel__count">{SPECIES_LIST.length} en la maqueta</span>
              )}
            </div>
            <label className="search search--sm">
              <Icon name="search" size={14} />
              <input value={sq} onChange={(e) => setSq(e.target.value)} placeholder="Buscar especie" aria-label="Buscar especie" />
            </label>
            <ul className="spp__list">
              {speciesShown.map((x) => {
                const on = species.includes(x.common);
                return (
                  <li key={x.common}>
                    <button type="button" className={on ? "is-on" : ""} aria-pressed={on} onClick={() => toggleSpecies(x.common)}>
                      <i style={{ background: SPECIES_COLOR[x.common] }} />
                      <span>
                        <strong>{x.common}</strong>
                        <em>{x.scientific}</em>
                      </span>
                      <b>{x.n}</b>
                    </button>
                  </li>
                );
              })}
              {speciesShown.length === 0 && <li className="spp__empty">Ninguna especie coincide.</li>}
            </ul>
          </section>
          <section className="panel invmapcard" aria-label="Minimapa">
            <div className="panel__head">
              <h2>Mapa</h2>
              <span className="panel__count">{mapped.length} árboles en el mapa</span>
            </div>
            <InvMap rows={mapped} selectedId={selectedId} hoverId={hoverId} onSelect={onSelect} />
            <button type="button" className="panel__link invmapcard__more" onClick={onMap}>
              Abrir mapa completo <Icon name="arrowRight" size={13} />
            </button>
          </section>
        </aside>
      )}
      </div>
    </div>
  );
}
