/**
 * DATOS ILUSTRATIVOS — Valpo Verde Conecta (maqueta de exploración).
 * Los catálogos (tipo_incidencia, prioridad_reportada, estado_incidencia,
 * origen_reporte, clase_edad) son los de las listas de validación del Excel
 * maestro vigente al 2026-10-17. Árboles, personas, reportes y escaneos son
 * inventados y solo sirven para mostrar la interfaz.
 */
import { FEATURED, TREES, type Tree } from "./mock";

export type IncState = "Ingresada" | "En revisión" | "Derivada" | "Resuelta" | "Descartada";
export type Priority = "Crítica" | "Alta" | "Media" | "Baja";
export type AgeClass = "Joven" | "Semimaduro" | "Maduro" | "Sobremaduro";

/** INCIDENCIA.tipo_incidencia */
export const INC_TYPES = [
  "Rama caída",
  "Rama quebrada",
  "Árbol inclinado",
  "Árbol caído",
  "Daño en infraestructura",
  "Raíces expuestas",
  "Problema fitosanitario",
  "Obstrucción",
  "Otro",
] as const;
export type IncType = (typeof INC_TYPES)[number];

/** Texto de ayuda para la ciudadanía: no cambia el valor guardado. */
export const INC_HELP: Record<IncType, string> = {
  "Rama caída": "Hay una rama en el suelo",
  "Rama quebrada": "Una rama colgando o rota en el árbol",
  "Árbol inclinado": "Se ve más inclinado que antes",
  "Árbol caído": "El árbol está en el suelo",
  "Daño en infraestructura": "Vereda, muro o alcorque roto",
  "Raíces expuestas": "Raíces al aire o suelo levantado",
  "Problema fitosanitario": "Hongos, plagas u hojas enfermas",
  Obstrucción: "Tapa paso, luminaria o señalética",
  Otro: "Algo distinto a lo anterior",
};

/** INCIDENCIA.prioridad_reportada, presentada a la ciudadanía como urgencia percibida. */
export const PRIORITY_HELP: Record<Priority, string> = {
  Crítica: "Peligro inmediato para personas",
  Alta: "Puede causar daño pronto",
  Media: "Conviene revisarlo",
  Baja: "No es urgente",
};

/** Colores de estado: mismo criterio que las OT (nuevo = neutro) y sin usar la paleta de riesgo. */
export const INC_COLOR: Record<IncState, string> = {
  Ingresada: "#C9D1CC",
  "En revisión": "#7DB8E8",
  Derivada: "#B79CF2",
  Resuelta: "#8FD9B0",
  Descartada: "#6F7C75",
};

/** Lo que la persona ve de cada estado en "Mis reportes". */
export const INC_PUBLIC: Record<IncState, string> = {
  Ingresada: "Recibimos tu reporte",
  "En revisión": "Un equipo municipal lo está revisando",
  Derivada: "Se derivó a inspección o mantención",
  Resuelta: "El problema fue atendido",
  Descartada: "Revisado: no requiere intervención",
};

export interface PublicTree {
  tree: Tree;
  qr: string; // código impreso en la placa
  edad: AgeClass;
  altura: number; // m
  dap: number; // cm
  copa: number; // m
  scans: number; // escaneos en 30 días
  active: boolean;
  about: string; // texto editorial: NO existe en el modelo de datos
}

const ABOUT: Record<string, string> = {
  "Palmera canaria": "Originaria de las Islas Canarias, es una de las especies más emblemáticas de las plazas de Valparaíso. Puede vivir más de 100 años.",
  "Plátano oriental": "Árbol de sombra de gran copa, muy usado en avenidas por su resistencia a la ciudad. Su corteza se desprende en placas.",
  Jacarandá: "Famoso por su floración lila en primavera. Originario de Sudamérica, florece entre octubre y diciembre.",
  Pimiento: "Especie sudamericana muy resistente a la sequía. Sus frutos rosados se usaron históricamente como condimento.",
  Quillay: "Especie nativa de Chile central. Su corteza contiene saponinas que se usaban para lavar ropa.",
};
const AGES: AgeClass[] = ["Maduro", "Semimaduro", "Maduro", "Sobremaduro", "Joven"];

export const PUBLIC_TREES: PublicTree[] = [FEATURED, ...TREES.slice(22, 34), ...TREES.slice(0, 6)].map((tree, i) => ({
  tree,
  qr: `VV-${tree.code.replace(/\D/g, "").padStart(4, "0")}`,
  edad: AGES[i % AGES.length],
  altura: Math.round((6 + ((i * 37) % 14) + ((i * 13) % 10) / 10) * 10) / 10,
  dap: 18 + ((i * 29) % 52),
  copa: Math.round((3 + ((i * 17) % 9) + ((i * 7) % 10) / 10) * 10) / 10,
  scans: [184, 96, 71, 58, 44, 39, 33, 27, 21, 18, 12, 9, 6, 4, 3, 2, 0, 0, 0][i] ?? 0,
  active: i < 16,
  about: ABOUT[tree.common] ?? "Texto editorial sobre la especie.",
}));

// El árbol de la placa de ejemplo con medidas verosímiles para un plátano oriental maduro.
Object.assign(PUBLIC_TREES[0], { altura: 14.5, dap: 62, copa: 11.5 });

export const HERO = PUBLIC_TREES[0];

export interface CitizenReport {
  code: string;
  fecha: string; // ISO con hora
  tipo: IncType;
  prioridad: Priority;
  estado: IncState;
  tree: Tree | null; // null = reportado sin árbol identificado
  place: string;
  descripcion: string;
  foto: boolean;
  persona: string; // seudónimo visible para el municipio
  respuesta?: string;
}

const T = (i: number) => PUBLIC_TREES[i].tree;

export const REPORTS: CitizenReport[] = [
  { code: "INC-000148", fecha: "2026-10-17 09:42", tipo: "Rama quebrada", prioridad: "Alta", estado: "Ingresada", tree: T(0), place: T(0).place, descripcion: "Rama grande colgando sobre la banca del lado del kiosco, se mueve con el viento.", foto: true, persona: "Camila R." },
  { code: "INC-000147", fecha: "2026-10-17 08:15", tipo: "Raíces expuestas", prioridad: "Media", estado: "Ingresada", tree: T(3), place: T(3).place, descripcion: "La raíz levantó la vereda y una señora casi se cae.", foto: true, persona: "Jorge P." },
  { code: "INC-000146", fecha: "2026-10-16 19:03", tipo: "Problema fitosanitario", prioridad: "Baja", estado: "Ingresada", tree: T(6), place: T(6).place, descripcion: "Hojas con manchas negras y polvo blanco.", foto: true, persona: "Anónimo verificado" },
  { code: "INC-000145", fecha: "2026-10-16 13:27", tipo: "Árbol inclinado", prioridad: "Crítica", estado: "En revisión", tree: T(1), place: T(1).place, descripcion: "Después del viento de ayer está mucho más inclinado hacia la calle.", foto: true, persona: "Valentina S.", respuesta: "Inspección agendada para hoy." },
  { code: "INC-000143", fecha: "2026-10-15 11:50", tipo: "Obstrucción", prioridad: "Media", estado: "En revisión", tree: T(8), place: T(8).place, descripcion: "Las ramas tapan la luminaria, de noche queda oscuro.", foto: false, persona: "Pedro M." },
  { code: "INC-000141", fecha: "2026-10-14 17:12", tipo: "Rama caída", prioridad: "Alta", estado: "Derivada", tree: T(2), place: T(2).place, descripcion: "Rama en el suelo bloqueando el paso del sendero.", foto: true, persona: "Ignacio L.", respuesta: "Derivada a mantención: OT-2026-034 (Poda)." },
  { code: "INC-000139", fecha: "2026-10-13 10:05", tipo: "Daño en infraestructura", prioridad: "Media", estado: "Derivada", tree: T(11), place: T(11).place, descripcion: "Alcorque roto, quedó un hoyo.", foto: true, persona: "Francisca T.", respuesta: "Derivada a mantención: reparación de alcorque." },
  { code: "INC-000137", fecha: "2026-10-12 08:31", tipo: "Otro", prioridad: "Baja", estado: "Ingresada", tree: null, place: "Plaza Victoria · costado oriente", descripcion: "Árbol nuevo plantado sin tutor, se está doblando.", foto: true, persona: "Matías A." },
  { code: "INC-000134", fecha: "2026-10-10 15:44", tipo: "Obstrucción", prioridad: "Media", estado: "Resuelta", tree: T(4), place: T(4).place, descripcion: "Las ramas bajas tapan el paso por la vereda.", foto: true, persona: "Camila R.", respuesta: "Poda realizada el 14-10-2026. ¡Gracias por avisar!" },
  { code: "INC-000131", fecha: "2026-10-08 12:20", tipo: "Problema fitosanitario", prioridad: "Baja", estado: "Descartada", tree: T(5), place: T(5).place, descripcion: "Hojas amarillas.", foto: false, persona: "Rodrigo V.", respuesta: "Revisado: cambio estacional normal de la especie." },
  { code: "INC-000128", fecha: "2026-10-05 09:58", tipo: "Rama caída", prioridad: "Alta", estado: "Resuelta", tree: T(9), place: T(9).place, descripcion: "Rama sobre auto estacionado.", foto: true, persona: "Daniela C.", respuesta: "Retiro realizado el mismo día." },
];

export const CONECTA_STATS = {
  registrados: 214,
  nuevosMes: 37,
  escaneosMes: PUBLIC_TREES.reduce((a, p) => a + p.scans, 0),
  reportesMes: 26,
  respuestaHoras: 19,
};

export const fmtDT = (s: string) => `${s.slice(8, 10)}-${s.slice(5, 7)} · ${s.slice(11)}`;
