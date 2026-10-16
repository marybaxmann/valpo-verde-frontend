import type { IconName } from "../components/Icon";

/**
 * Arquitectura de navegación propuesta. Cada destino conserva su NOMBRE
 * ORIGINAL de módulo y su RUTA real del frontend productivo (App.tsx).
 * Las agrupaciones (Territorio / Operación / Análisis / Proyecto) son solo
 * visuales: no fusionan ni reemplazan módulos.
 */
export type Role = "admin" | "municipal";

export interface NavItem {
  label: string; // nombre original del módulo
  hint: string; // qué contiene (funciones reales)
  route: string; // ruta real bajo /admin o /usuario
  icon: IconName;
  roles?: Role[]; // si se omite: visible para ambos roles
}

export interface NavGroup {
  id: "territorio" | "operacion" | "analisis" | "proyecto";
  label: string;
  icon: IconName;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    id: "territorio",
    label: "Territorio",
    icon: "map",
    items: [
      { label: "Inventario", hint: "Mapa de árboles, búsqueda, filtros por estado y riesgo, alta de árboles", route: "/projects/:id/mapa", icon: "leaf" },
      { label: "Inspección y Riesgo", hint: "Evaluaciones de riesgo, asistente de 6 pasos, historial por árbol", route: "/projects/:id/inspeccion", icon: "alert" },
      { label: "Infraestructura", hint: "Evaluaciones de conflicto árbol–infraestructura e historial", route: "/projects/:id/infraestructura", icon: "building" },
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    icon: "inbox",
    items: [
      { label: "Mantención", hint: "Órdenes de trabajo: alta, estados, vencidas, detalle", route: "/projects/:id/mantencion", icon: "wrench" },
      { label: "Incidencias", hint: "Reportes con o sin árbol, origen, estados, detalle", route: "/projects/:id/incidencias", icon: "alert" },
    ],
  },
  {
    id: "analisis",
    label: "Análisis",
    icon: "chart",
    items: [
      { label: "Dashboard", hint: "Indicadores del proyecto, composición, riesgo, acceso a módulos", route: "/projects/:id/dashboard", icon: "chart" },
      { label: "Índices", hint: "Estructura, composición, riesgo e indicadores del modelo", route: "/projects/:id/indices", icon: "list" },
    ],
  },
  {
    id: "proyecto",
    label: "Proyecto",
    icon: "settings",
    items: [
      { label: "Ficha del proyecto", hint: "Nombre, institución, profesional responsable, fecha de creación", route: "/projects/:id", icon: "clipboard" },
      { label: "Miembros del proyecto", hint: "Listar, agregar y quitar miembros", route: "/projects/:id (sección)", icon: "settings", roles: ["admin"] },
      { label: "Proyectos", hint: "Cambiar de proyecto · Mis proyectos", route: "/projects", icon: "map" },
    ],
  },
];

/** Acciones de registro según rol (CC-022, tal como las aplica hoy el código). */
export const ACTIONS: { label: string; icon: IconName; roles: Role[]; where: string }[] = [
  { label: "Nuevo árbol", icon: "plus", roles: ["municipal"], where: "Inventario" },
  { label: "Nueva evaluación de riesgo", icon: "clipboard", roles: ["municipal"], where: "Inspección y Riesgo" },
  { label: "Nueva evaluación de infraestructura", icon: "building", roles: ["municipal"], where: "Infraestructura" },
  { label: "Nueva orden de trabajo", icon: "wrench", roles: ["municipal"], where: "Mantención" },
  { label: "Registrar incidencia", icon: "alert", roles: ["municipal"], where: "Incidencias" },
  { label: "Crear proyecto", icon: "plus", roles: ["admin"], where: "Proyectos" },
  { label: "Agregar miembro", icon: "settings", roles: ["admin"], where: "Miembros del proyecto" },
];
