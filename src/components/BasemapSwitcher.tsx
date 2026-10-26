import { BASEMAPS, type BasemapId } from "../lib/arcgis";

/**
 * Selector de capa base sobre un mapa ArcGIS (Mapa, Satélite, Híbrido,
 * Limpio). Solo cambia el fondo: no toca los datos del mapa.
 */
export function BasemapSwitcher({ value, onChange }: { value: BasemapId; onChange: (id: BasemapId) => void }) {
  return (
    <div className="sivu-basemaps" role="radiogroup" aria-label="Capa base del mapa">
      {BASEMAPS.map((b) => (
        <button
          key={b.id}
          type="button"
          role="radio"
          aria-checked={value === b.id}
          title={b.hint}
          className={`sivu-basemaps__opt ${value === b.id ? "is-on" : ""}`}
          onClick={() => onChange(b.id)}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
