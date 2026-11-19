import type { AspectoCategoria } from "../lib/infraestructura";

/**
 * Íconos de los componentes de infraestructura (maqueta aprobada
 * 2026-11-17). Trazos propios de 24 × 24, mismo grosor que `Icons.tsx`.
 */
const TRAZOS: Record<string, string> = {
  todos: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z M12 4v8l5.5 5.5",
  vereda: "M2 18h20 M2 14h8l3-3h9 M6 14v4 M12 12v6 M17 11v7",
  alcorque: "M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z",
  calzada: "M7 3 4 21 M17 3l3 18 M12 4v3 M12 10.5v3 M12 17v3",
  red_aerea: "M5 21V5 M19 21V5 M3 7h4 M17 7h4 M5 7c4 4.5 10 4.5 14 0",
  red_subterranea: "M2 8h20 M4 8l1.5-2.5 M9 8l1.5-2.5 M14 8l1.5-2.5 M19 8l1.5-2.5 M7 13h10a2.5 2.5 0 0 1 0 5H7a2.5 2.5 0 0 1 0-5Z",
  infraestructura_vertical: "M8 21h8 M12 21V4h5.5 M17.5 4v3 M15.5 7h4",
};

export function IconoComponente({ codigo, size = 16 }: { codigo: string; size?: number }) {
  return (
    <svg
      className="sivu-infra-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={TRAZOS[codigo] ?? TRAZOS.todos} />
    </svg>
  );
}

/** Muestra de la categoría como en el mapa: relleno, rayado o contorno punteado. */
export function MarcaCategoria({ a }: { a: AspectoCategoria }) {
  return <span className={`sivu-infra-dot sivu-infra-dot--${a}`} aria-hidden="true" />;
}

/** Muestra de «Evaluación pendiente»: gris con borde punteado, como el pin. */
export function IconoPendiente() {
  return <span className="sivu-infra-dot sivu-infra-dot--pend" aria-hidden="true" />;
}
