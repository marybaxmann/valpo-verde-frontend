import { Icon } from "./Icons";

/**
 * Estado «en desarrollo» (Fase 7; CC-059): dice en palabras simples qué
 * parte todavía no está disponible, sin botones inactivos ni valores de
 * relleno. `refs` nombra el pendiente para soporte (CC y endpoint de
 * docs/propuestas-cc/pendientes-backend.md); no se muestra en pantalla,
 * queda en `data-refs` para quien inspeccione la página.
 */
export function PendingNotice({
  what,
  refs,
  compact = false,
}: {
  /** Qué falta, por ejemplo «el resumen del proyecto». */
  what: string;
  refs: string;
  compact?: boolean;
}) {
  return (
    <div className={`sivu-pending ${compact ? "sivu-pending--compact" : ""}`} role="status" data-refs={refs}>
      <span className="sivu-pending__icon" aria-hidden="true">
        <Icon name="sort" size={compact ? 13 : 15} />
      </span>
      <span className="sivu-pending__text">
        <strong>En desarrollo</strong>
        <span>Esta sección mostrará {what} en una próxima etapa.</span>
      </span>
    </div>
  );
}
