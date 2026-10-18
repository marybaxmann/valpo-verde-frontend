/**
 * DATOS ILUSTRATIVOS — maqueta de exploración visual (laboratorio).
 * No provienen de la API de SIVU. Usan los catálogos vigentes del backend
 * (acciones y estados de mantención, componentes de infraestructura) solo
 * para que la interfaz se lea con la terminología real.
 */
import { FEATURED, TREES, type Tree } from "./mock";

export type Module = "dashboard" | "inventario" | "riesgo" | "infraestructura" | "mantencion" | "conecta";

/* ───────── Inventario ───────── */
export type LifeState = "Activo" | "Retirado" | "Tocón";

export interface InvRow {
  tree: Tree;
  estado: LifeState;
  dap: number; // cm
  altura: number; // m
  medicion: string; // dd-mm-aaaa
  georef: boolean;
}

/** Pseudoaleatorio determinista: la maqueta se ve igual en cada carga. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const FECHAS = ["02-10-2026", "28-09-2026", "21-09-2026", "14-09-2026", "07-09-2026", "30-08-2026", "14-03-2026"];

export const INVENTORY: InvRow[] = [FEATURED, ...TREES].map((tree, i) => {
  const palm = tree.common === "Palmera canaria";
  const estado: LifeState = i > 3 && rnd(i, 1) > 0.94 ? (rnd(i, 2) > 0.5 ? "Retirado" : "Tocón") : "Activo";
  return {
    tree,
    estado,
    dap: i === 0 ? 62 : Math.round((palm ? 45 : 18) + rnd(i, 3) * (palm ? 30 : 48)),
    altura: i === 0 ? 14.5 : Math.round(((palm ? 9 : 5) + rnd(i, 4) * (palm ? 8 : 11)) * 10) / 10,
    medicion: i === 0 ? "02-10-2026" : FECHAS[Math.floor(rnd(i, 5) * FECHAS.length)],
    georef: i === 0 || rnd(i, 6) > 0.07,
  };
});

/** Especies presentes en el inventario de la maqueta, con su conteo. */
export const SPECIES_LIST = [...new Set(INVENTORY.map((r) => r.tree.common))]
  .map((common) => {
    const rows = INVENTORY.filter((r) => r.tree.common === common);
    return { common, scientific: rows[0].tree.scientific, n: rows.length };
  })
  .sort((a, b) => b.n - a.n);

/** Color por especie en el minimapa: evita la paleta de riesgo y la de estados de OT. */
export const SPECIES_COLOR: Record<string, string> = {
  "Palmera canaria": "#5CC8F0",
  "Plátano oriental": "#7EE0A1",
  Jacarandá: "#C9A6FF",
  Pimiento: "#FF9EC4",
  Quillay: "#FFFFFF",
};

/* ───────── Infraestructura ───────── */
export type InfraState = "dano" | "sin_dano" | "sin_eval";

export interface InfraComponent {
  nombre: string;
  estado: "Con daño o interferencia" | "Sin daño ni interferencia" | "No existe" | "Registrado";
  detalle: string;
}

export const INFRA_COMPONENTS = [
  "Acera / vereda",
  "Alcorque / superficie de plantación",
  "Calzada",
  "Redes / servicios",
  "Infraestructura vertical",
] as const;

/** Componente con daño o interferencia de cada árbol evaluado (para filtrar el mapa). */
export function infraOf(t: Tree, i: number): { state: InfraState; comp: (typeof INFRA_COMPONENTS)[number] | null } {
  if (t.id === "featured") return { state: "dano", comp: "Acera / vereda" };
  if (!t.infra && rnd(i, 7) > 0.42) return { state: "sin_eval", comp: null };
  if (rnd(i, 8) > 0.62) return { state: "sin_dano", comp: null };
  const c = INFRA_COMPONENTS[Math.min(4, Math.floor(rnd(i, 9) * 5.6) % 5)];
  return { state: "dano", comp: c };
}

export const INFRA_DETAIL: InfraComponent[] = [
  { nombre: "Acera / vereda", estado: "Con daño o interferencia", detalle: "Baldosa · levantamiento y grieta · afecta la circulación peatonal" },
  { nombre: "Alcorque / superficie de plantación", estado: "Registrado", detalle: "Alcorque cuadrado" },
  { nombre: "Calzada", estado: "Sin daño ni interferencia", detalle: "Asfalto" },
  { nombre: "Redes / servicios", estado: "Sin daño ni interferencia", detalle: "Red aérea presente · sin red subterránea" },
  { nombre: "Infraestructura vertical", estado: "No existe", detalle: "Sin contacto ni interferencia" },
];

/* ───────── Mantención ───────── */
export type OtState = "Pendiente" | "Programada" | "En ejecución" | "Completada" | "Cancelada";

export interface WorkOrder {
  code: string;
  tree: Tree;
  accion: string; // etiqueta del catálogo de acciones
  subtipo: string | null;
  fecha: string | null; // aaaa-mm-dd
  responsable: string | null;
  estado: OtState;
  observacion?: string;
}

export const TODAY = "2026-10-17";

const t = (n: number) => TREES[n % TREES.length];

export const ORDERS: WorkOrder[] = [
  { code: "OT-2026-031", tree: FEATURED, accion: "Poda", subtipo: "Reducción", fecha: "2026-10-21", responsable: "Cuadrilla 2", estado: "Programada", observacion: "Reducir copa sobre la acera según evaluación de riesgo." },
  { code: "OT-2026-018", tree: t(5), accion: "Poda", subtipo: "Sanitaria", fecha: "2026-10-02", responsable: "Cuadrilla 1", estado: "Completada" },
  { code: "OT-2026-019", tree: t(9), accion: "Riego", subtipo: "Programado", fecha: "2026-10-05", responsable: "Cuadrilla 3", estado: "Completada" },
  { code: "OT-2026-021", tree: t(12), accion: "Reparación de alcorque", subtipo: null, fecha: "2026-10-08", responsable: "Contratista vial", estado: "Programada" },
  { code: "OT-2026-022", tree: t(3), accion: "Manejo fitosanitario", subtipo: "Correctivo", fecha: "2026-10-09", responsable: "Cuadrilla 1", estado: "Completada" },
  { code: "OT-2026-024", tree: t(17), accion: "Poda", subtipo: "Despeje", fecha: "2026-10-13", responsable: "Cuadrilla 2", estado: "Programada" },
  { code: "OT-2026-025", tree: t(21), accion: "Soporte / tutorado", subtipo: null, fecha: "2026-10-15", responsable: "Cuadrilla 3", estado: "Completada" },
  { code: "OT-2026-026", tree: t(8), accion: "Tala / retiro", subtipo: "Retiro de tocón", fecha: "2026-10-16", responsable: "Contratista", estado: "En ejecución" },
  { code: "OT-2026-027", tree: t(14), accion: "Poda", subtipo: "Formación", fecha: "2026-10-17", responsable: "Cuadrilla 1", estado: "En ejecución" },
  { code: "OT-2026-028", tree: t(2), accion: "Riego", subtipo: "Emergencia", fecha: "2026-10-17", responsable: "Cuadrilla 3", estado: "Programada" },
  { code: "OT-2026-029", tree: t(25), accion: "Descompactación", subtipo: "Manual", fecha: "2026-10-20", responsable: "Cuadrilla 3", estado: "Programada" },
  { code: "OT-2026-030", tree: t(30), accion: "Manejo fitosanitario", subtipo: "Preventivo", fecha: "2026-10-22", responsable: "Cuadrilla 1", estado: "Programada" },
  { code: "OT-2026-032", tree: t(33), accion: "Poda", subtipo: "Sanitaria", fecha: "2026-10-23", responsable: "Cuadrilla 2", estado: "Programada" },
  { code: "OT-2026-033", tree: t(6), accion: "Riego", subtipo: "Programado", fecha: "2026-10-27", responsable: "Cuadrilla 3", estado: "Programada" },
  { code: "OT-2026-034", tree: t(28), accion: "Tala / retiro", subtipo: "Tala", fecha: "2026-10-28", responsable: "Contratista", estado: "Programada", observacion: "Coordinar corte de tránsito." },
  { code: "OT-2026-035", tree: t(19), accion: "Reparación de alcorque", subtipo: null, fecha: "2026-10-29", responsable: "Contratista vial", estado: "Programada" },
  { code: "OT-2026-023", tree: t(11), accion: "Poda", subtipo: "Despeje", fecha: "2026-10-12", responsable: "Cuadrilla 2", estado: "Cancelada" },
  { code: "OT-2026-036", tree: t(23), accion: "Poda", subtipo: "Formación", fecha: null, responsable: null, estado: "Pendiente" },
  { code: "OT-2026-037", tree: t(4), accion: "Otra intervención", subtipo: null, fecha: null, responsable: null, estado: "Pendiente", observacion: "Retirar señalética adosada al tronco." },
  { code: "OT-2026-038", tree: t(31), accion: "Manejo fitosanitario", subtipo: "Correctivo", fecha: null, responsable: null, estado: "Pendiente" },
];

const FINAL: OtState[] = ["Completada", "Cancelada"];
/** Misma regla que el frontend funcional: no final, con fecha programada anterior a hoy. */
export const isOverdue = (o: WorkOrder) => !FINAL.includes(o.estado) && !!o.fecha && o.fecha < TODAY;
export const isOpen = (o: WorkOrder) => !FINAL.includes(o.estado);

/** Colores de estado: evitan los tonos de la paleta de riesgo (PR-016). */
export const OT_COLOR: Record<OtState, string> = {
  Pendiente: "#C9D1CC",
  Programada: "#7DB8E8",
  "En ejecución": "#B79CF2",
  Completada: "#8FD9B0",
  Cancelada: "#6F7C75",
};

export const fmt = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
