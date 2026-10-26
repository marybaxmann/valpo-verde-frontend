import { Icon } from "./Icons";

/**
 * Estado «pendiente del backend» (Fase 7; CC-059): dice en palabras
 * simples qué falta para mostrar una sección, sin botones inactivos ni
 * valores de relleno. `refs` nombra el pendiente para soporte (CC y
 * endpoint de docs/propuestas-cc/pendientes-backend.md).
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
    <div className={`sivu-pending ${compact ? "sivu-pending--compact" : ""}`} role="status">
      <span className="sivu-pending__icon" aria-hidden="true">
        <Icon name="sort" size={compact ? 13 : 15} />
      </span>
      <span className="sivu-pending__text">
        <strong>Pendiente</strong>
        <span>El sistema todavía no entrega {what}.</span>
        <small>{refs}</small>
      </span>
    </div>
  );
}
