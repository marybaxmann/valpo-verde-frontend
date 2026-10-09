import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icons";

export interface SivuColumn {
  label: string;
  /** Ancho relativo (p. ej. "22%"); con anchos se usa table-layout fixed. */
  width?: string;
  align?: "left" | "right" | "center";
}

/**
 * Tabla SIVU: contenedor blanco con borde suave, encabezado claro y
 * divisores sutiles (estilos en global.css, `.sivu-table*`). Si no hay
 * filas, muestra el estado vacío dentro de la propia tabla.
 */
export function SivuTable({
  columns,
  children,
  empty,
}: {
  columns: SivuColumn[];
  children?: ReactNode;
  empty?: { icon: IconName; title: string; text?: string } | null;
}) {
  const fixed = columns.some((c) => c.width);
  return (
    <div className="sivu-table-wrap">
      <div className="sivu-table-scroll">
        <table className={`sivu-table ${fixed ? "sivu-table--fixed" : ""}`}>
          {fixed && (
            <colgroup>
              {columns.map((c) => (
                <col key={c.label} style={c.width ? { width: c.width } : undefined} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label} style={c.align ? { textAlign: c.align } : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td className="sivu-table__empty" colSpan={columns.length}>
                  <div className="sivu-table__empty-inner">
                    <div className="sivu-table__empty-icon">
                      <Icon name={empty.icon} size={20} />
                    </div>
                    <p className="sivu-table__empty-title">{empty.title}</p>
                    {empty.text && <p className="sivu-table__empty-text">{empty.text}</p>}
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
