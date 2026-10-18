import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Glass, IconButton, RiskTag } from "./primitives";
import { MapControls } from "./MapChrome";
import { FEATURED, PROJECT, TREES, type Tree } from "../data/mock";
import { INFRA_COMPONENTS, INFRA_DETAIL, infraOf, type InfraState } from "../data/lab";
import type { Role } from "../data/nav";

const COLOR: Record<InfraState, string> = { dano: "#4FA3E0", sin_dano: "#CFE8F7", sin_eval: "#A7B0AB" };
const LABEL: Record<InfraState, string> = {
  dano: "Con daño o interferencia",
  sin_dano: "Sin daño ni interferencia",
  sin_eval: "Sin evaluación",
};

type Comp = (typeof INFRA_COMPONENTS)[number];

const ALL = [FEATURED, ...TREES].map((t, i) => ({ t, ...infraOf(t, i) }));

function InfraSheet({ tree, role, onClose }: { tree: Tree; role: Role; onClose: () => void }) {
  const info = ALL.find((a) => a.t.id === tree.id)!;
  const evaluated = info.state !== "sin_eval";
  return (
    <Glass tone="light" className="sheet" aria-label={`Infraestructura de ${tree.code}`}>
      <span className="sheet__grabber" aria-hidden="true" />
      <div className="sheet__head">
        <div>
          <span className="sheet__code mono">{tree.code}</span>
          <h2>{tree.common}</h2>
          <p>{tree.scientific}</p>
        </div>
        <div className="sheet__tools">
          <IconButton icon="close" label="Cerrar ficha" tone="light" size={34} onClick={onClose} />
        </div>
      </div>
      <div className="sheet__status">
        <span className="infra-tag" style={{ ["--c" as string]: COLOR[info.state] }}>
          {LABEL[info.state]}
        </span>
        <RiskTag level={tree.risk} />
      </div>
      <span className="sheet__place">{tree.place}</span>

      <div className="sheet__body">
        {evaluated ? (
          <>
            <div className="card">
              <span className="card__eyebrow">Evaluación de infraestructura · 02-10-2026 · [Inspector]</span>
              <ul className="comp-list">
                {(info.t.id === "featured"
                  ? INFRA_DETAIL
                  : INFRA_DETAIL.map((d) =>
                      d.nombre === info.comp
                        ? { ...d, estado: "Con daño o interferencia" as const, detalle: "Daño observado en terreno" }
                        : d.estado === "Con daño o interferencia"
                          ? { ...d, estado: "Sin daño ni interferencia" as const, detalle: "Sin observaciones" }
                          : d
                    )
                ).map((d) => (
                  <li key={d.nombre} className={d.estado === "Con daño o interferencia" ? "is-hit" : ""}>
                    <span className="comp-list__icon">
                      <Icon name={d.estado === "Con daño o interferencia" ? "alert" : d.estado === "No existe" ? "minus" : "check"} size={14} />
                    </span>
                    <span className="comp-list__txt">
                      <strong>{d.nombre}</strong>
                      <small>
                        {d.estado} · {d.detalle}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <span className="card__eyebrow">Historial</span>
              <div className="row">
                <span>02-10-2026</span>
                <strong>Evaluación vigente</strong>
              </div>
              <div className="row">
                <span>18-04-2026</span>
                <strong>Evaluación anterior</strong>
              </div>
            </div>
          </>
        ) : (
          <div className="card empty">Este árbol aún no tiene evaluación de infraestructura.</div>
        )}
        <p className="note">Registro de condiciones observadas. La maqueta no calcula ninguna clasificación de infraestructura.</p>
      </div>

      <div className="sheet__actions">
        {role === "municipal" ? (
          <button type="button" className="btn-primary">
            <Icon name="building" size={16} />
            Nueva evaluación de infraestructura
          </button>
        ) : (
          <span className="readonly-tag">Solo lectura · Administrador</span>
        )}
      </div>
    </Glass>
  );
}

export function Infra({ role, selected, onSelect }: { role: Role; selected: Tree | null; onSelect: (t: Tree | null) => void }) {
  const [comp, setComp] = useState<Comp | null>(null);
  const [states, setStates] = useState<Record<InfraState, boolean>>({ dano: true, sin_dano: true, sin_eval: true });

  const visible = useMemo(() => ALL.filter((a) => states[a.state] && (!comp || a.comp === comp)), [comp, states]);
  const counts = useMemo(() => {
    const c = { dano: 0, sin_dano: 0, sin_eval: 0 } as Record<InfraState, number>;
    ALL.forEach((a) => c[a.state]++);
    return c;
  }, []);
  const sel = selected ? ALL.find((a) => a.t.id === selected.id) : null;

  return (
    <>
      <div className="map" role="application" aria-label="Mapa de infraestructura (imagen aérea ilustrativa)">
        <div className="map__imagery" />
        <div className="map__grade map__grade--infra" />
        <div className="map__vignette" />
        <span className="map__label" style={{ left: 870, top: 318, transform: "translate(-50%,-50%) rotate(-1deg)" }}>AV. BRASIL</span>
        <span className="map__label" style={{ left: 640, top: 700, transform: "translate(-50%,-50%)" }}>PLAZA VICTORIA</span>
        {ALL.map((a) => {
          const on = visible.includes(a);
          return (
            <button
              key={a.t.id}
              type="button"
              className={`ipin ipin--${a.state} ${on ? "" : "ipin--off"} ${sel?.t.id === a.t.id ? "ipin--sel" : ""}`}
              style={{ left: a.t.x, top: a.t.y, ["--c" as string]: COLOR[a.state] }}
              aria-label={`${a.t.code} · ${LABEL[a.state]}${a.comp ? ` · ${a.comp}` : ""}`}
              onClick={() => onSelect(a.t)}
            >
              {a.state === "dano" && <Icon name="building" size={12} stroke={2.2} />}
            </button>
          );
        })}
        {sel && (
          <div className="callout" style={{ left: sel.t.x, top: sel.t.y }}>
            <span className="callout__code">{sel.t.code}</span>
            <strong>{sel.t.common}</strong>
            <span className="callout__lvl">{sel.comp ?? LABEL[sel.state]}</span>
          </div>
        )}
      </div>

      <div className="left left--narrow">
        <Glass className="ov ov--infra">
          <div className="ov__head">
            <span>Infraestructura</span>
            <span className="ov__hint">{PROJECT.infra.evaluaciones} evaluaciones</span>
          </div>
          <div className="ov__hero">
            <span className="ov__num">{PROJECT.infra.conEvaluacion}</span>
            <span className="ov__lbl">
              árboles con
              <br />
              evaluación
            </span>
          </div>
          <span className="ov__sub">Componente con daño o interferencia · toca para filtrar</span>
          <ul className="compfilter">
            {PROJECT.infra.componentes.map((c) => (
              <li key={c.nombre}>
                <button
                  type="button"
                  className={comp === c.nombre ? "is-on" : ""}
                  aria-pressed={comp === c.nombre}
                  onClick={() => setComp(comp === c.nombre ? null : (c.nombre as Comp))}
                >
                  <span>{c.nombre}</span>
                  <i>
                    <b style={{ width: `${(c.n / 18) * 100}%` }} />
                  </i>
                  <strong>{c.n}</strong>
                </button>
              </li>
            ))}
          </ul>
          {comp && (
            <button type="button" className="ov__clear" onClick={() => setComp(null)}>
              <Icon name="close" size={13} /> Quitar filtro
            </button>
          )}
        </Glass>
      </div>

      {selected && <InfraSheet key={selected.id} tree={selected} role={role} onClose={() => onSelect(null)} />}

      <div className={`right-rail ${selected ? "" : "right-rail--wide"}`}>
        <MapControls />
      </div>

      <div className={`legend-dock ${selected ? "" : "legend-dock--wide"}`}>
        <Glass className="legend-dock__inner">
          {(Object.keys(LABEL) as InfraState[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`lchip ${states[s] ? "is-on" : ""}`}
              aria-pressed={states[s]}
              onClick={() => setStates({ ...states, [s]: !states[s] })}
            >
              <i style={{ background: COLOR[s] }} />
              {LABEL[s]}
              <small>{counts[s]}</small>
            </button>
          ))}
        </Glass>
      </div>
    </>
  );
}
