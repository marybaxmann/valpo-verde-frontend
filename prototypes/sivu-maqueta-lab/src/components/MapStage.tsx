import { RISK_COLOR, type Lens, type Tree } from "../data/mock";

const LABELS = [
  { text: "AV. BRASIL", x: 870, y: 318, rot: -1 },
  { text: "PLAZA VICTORIA", x: 640, y: 700, rot: 0 },
];

function pinStyle(t: Tree, lens: Lens) {
  if (lens === "riesgo") return { fill: RISK_COLOR[t.risk ?? "none"], dim: false };
  if (lens === "infraestructura") return t.infra ? { fill: "#9CD3F5", dim: false } : { fill: "#E8EEE9", dim: true };
  return { fill: "#E9F7EF", dim: false };
}

export function MapStage({
  trees,
  featured,
  lens,
  selectedId,
  onSelect,
}: {
  trees: Tree[];
  featured: Tree;
  lens: Lens;
  selectedId: string;
  onSelect: (t: Tree) => void;
}) {
  const all = [...trees, featured];
  const selected = all.find((t) => t.id === selectedId) ?? featured;
  const sel = pinStyle(selected, lens);
  return (
    <div className="map" role="application" aria-label="Mapa del territorio (imagen aérea ilustrativa)">
      <div className="map__imagery" />
      <div className="map__grade" />
      <div className="map__vignette" />

      {LABELS.map((l) => (
        <span key={l.text} className="map__label" style={{ left: l.x, top: l.y, transform: `translate(-50%,-50%) rotate(${l.rot}deg)` }}>
          {l.text}
        </span>
      ))}

      {all.map((t) => {
        const s = pinStyle(t, lens);
        const isSel = t.id === selected.id;
        return (
          <button
            key={t.id}
            type="button"
            className={`pin ${s.dim ? "pin--dim" : ""} ${isSel ? "pin--sel" : ""} ${lens === "inventario" ? "pin--inv" : ""}`}
            style={{ left: t.x, top: t.y, ["--c" as string]: s.fill }}
            aria-label={`${t.code} · ${t.common}${t.risk ? ` · riesgo ${t.risk.toLowerCase()}` : ""}`}
            onClick={() => onSelect(t)}
          />
        );
      })}

      <div className="halo" style={{ left: selected.x, top: selected.y, ["--c" as string]: sel.fill }} aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="callout" style={{ left: selected.x, top: selected.y }}>
        <span className="callout__code">{selected.code}</span>
        <strong>{selected.common}</strong>
        {lens === "riesgo" && (
          <span className="callout__lvl">
            <i style={{ background: RISK_COLOR[selected.risk ?? "none"] }} />
            {selected.risk ?? "Sin evaluación"}
          </span>
        )}
        {lens === "infraestructura" && <span className="callout__lvl">{selected.infra ? "Con evaluación" : "Sin evaluación de infraestructura"}</span>}
      </div>

      <div className="cluster" style={{ left: 520, top: 790 }} aria-label="Grupo de 14 árboles">14</div>
      <div className="cluster" style={{ left: 470, top: 610 }} aria-label="Grupo de 9 árboles">9</div>
      <div className="cluster cluster--sm" style={{ left: 880, top: 770 }} aria-label="Grupo de 6 árboles">6</div>
    </div>
  );
}
