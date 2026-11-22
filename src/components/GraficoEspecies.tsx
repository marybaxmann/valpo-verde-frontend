/**
 * Columnas por especie (pedido de la responsable, 2026-11-22): las cinco más
 * registradas y «Otras» con el resto, en número de árboles y % del inventario
 * (B7 `especies_top`, que trae hasta 10). Se usa en el Dashboard y en el
 * Inventario. Paleta otoñal «Ámbar y caramelo» elegida por la responsable:
 * ámbar, caramelo, cobre, óxido y granate, de la especie con más árboles a
 * la quinta.
 */
const PALETA_ESPECIES = ["#D9B05E", "#CB8D4A", "#B76E3A", "#A3443A", "#8C302E"] as const;

export function GraficoEspecies({
  especies,
  total,
  compacto = false,
}: {
  especies: { especie_cientifica: string | null; nombre_comun: string | null; total: number }[];
  total: number;
  /** Altura menor, para la columna lateral del Inventario. */
  compacto?: boolean;
}) {
  const top = especies.slice(0, PALETA_ESPECIES.length);
  const enTop = top.reduce((s, e) => s + e.total, 0);
  const otras = Math.max(0, total - enTop);
  const columnas = [
    ...top.map((e, i) => ({
      clave: e.especie_cientifica ?? e.nombre_comun ?? `sin-${i}`,
      nombre: e.nombre_comun ?? e.especie_cientifica ?? "Sin especie",
      detalle: e.especie_cientifica ?? "",
      total: e.total,
      color: PALETA_ESPECIES[i] as string | null,
    })),
    ...(otras > 0 ? [{ clave: "otras", nombre: "Otras", detalle: "Resto de las especies", total: otras, color: null }] : []),
  ];
  const max = Math.max(1, ...columnas.map((c) => c.total));
  if (columnas.length === 0) return <p className="sivu-state">Sin especies registradas.</p>;
  const plantilla = { gridTemplateColumns: `repeat(${columnas.length}, minmax(0, 1fr))` };
  return (
    <figure className={`sivu-colchart ${compacto ? "sivu-colchart--compacto" : ""}`} aria-label="Árboles por especie">
      <div className="sivu-colchart__barras" style={plantilla}>
        {columnas.map((c) => {
          const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
          return (
            <div key={c.clave} className="sivu-colchart__col" title={`${c.nombre}${c.detalle ? ` (${c.detalle})` : ""}: ${c.total} árboles, ${pct} %`}>
              <span className="sivu-colchart__valor">
                {c.total}
                <small>{pct}%</small>
              </span>
              <span
                className={`sivu-colchart__barra ${c.color ? "" : "is-otras"}`}
                style={{ height: `${Math.max(4, (c.total / max) * 100)}%`, ...(c.color ? { background: c.color } : {}) }}
              />
            </div>
          );
        })}
      </div>
      <div className="sivu-colchart__nombres" style={plantilla}>
        {columnas.map((c) => (
          <span key={c.clave}>{c.nombre}</span>
        ))}
      </div>
    </figure>
  );
}
