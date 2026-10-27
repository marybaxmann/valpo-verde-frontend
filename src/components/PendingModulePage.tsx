import { PendingNotice } from "./PendingNotice";

/**
 * Módulo de la navegación (CC-059) cuyo contrato en la API de la Fase 6
 * todavía no existe. Muestra solo el aviso de «pendiente»: sin llamar a la
 * demo, sin datos de relleno ni acciones inactivas.
 */
export function PendingModulePage({ title, what, refs }: { title: string; what: string; refs: string }) {
  return (
    <div className="sivu-dash">
      <header className="sivu-phead">
        <div>
          <h1 className="sivu-phead__title">{title}</h1>
        </div>
      </header>
      <PendingNotice what={what} refs={refs} />
    </div>
  );
}
