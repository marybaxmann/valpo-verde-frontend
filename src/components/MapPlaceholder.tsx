import { Icon } from "./Icons";

export function MapPlaceholder({
  title = "Mapa del arbolado urbano",
  note = "Visualización geográfica de árboles registrados — integración cartográfica pendiente.",
  pointCount,
}: {
  title?: string;
  note?: string;
  pointCount?: number;
}) {
  return (
    <div className="card map-placeholder">
      <div className="map-placeholder__grid">
        <Icon name="link" size={26} />
        <h3>{title}</h3>
        {typeof pointCount === "number" && (
          <span className="badge badge--slate">{pointCount} puntos registrados (mock)</span>
        )}
        <p>{note}</p>
      </div>
    </div>
  );
}
