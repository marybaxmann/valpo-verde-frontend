import type { IconName } from "../components/Icons";
import type { KnownRole } from "../types/authProfile";

/**
 * Navegación del proyecto (CC-059) con los nombres visibles de CC-060.
 * Los grupos son solo visuales: no fusionan, renombran ni crean módulos,
 * y no cambian rutas ni permisos (la seguridad la decide el backend).
 * Inspección (CC-061) aparece desde que existen B3 y B4 (CC-065); Valpo
 * Verde Conecta (CC-062) irá en Operación cuando existan sus endpoints
 * (CC-059, punto 4).
 *
 * `path` es relativo a `/{admin|usuario|inspector}/projects/:projectId`.
 */
export interface NavModule {
  path: string;
  label: string;
  /** Qué se hace en el módulo, para el menú y el buscador. */
  hint: string;
  icon: IconName;
  /** Roles que no ven el módulo (la API les responde 403; CC-064). */
  hiddenFor?: KnownRole[];
}

export interface NavGroup {
  id: "dashboard" | "inventario" | "operacion" | "ciudadania";
  label: string;
  icon: IconName;
  modules: NavModule[];
}

// Orden y grupos de Valej (2026-11-02, CC-072), en lugar de los tres grupos
// de CC-059: Dashboard, Inventario, Operación y Ciudadanía, como las pestañas
// de un programa. Un grupo con un solo módulo se muestra como botón directo.
// Rutas, nombres de módulo (CC-060) y permisos sin cambios.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "chart",
    modules: [{ path: "dashboard", label: "Dashboard", hint: "Resumen del proyecto", icon: "chart" }],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: "leaf",
    modules: [
      { path: "mapa", label: "Inventario", hint: "Árboles del proyecto", icon: "leaf" },
      // /inspeccion es Riesgo Arbóreo (CC-059 mantuvo esa ruta).
      { path: "inspeccion", label: "Riesgo Arbóreo", hint: "Resultados de riesgo en el territorio", icon: "check-square" },
      { path: "infraestructura", label: "Infraestructura", hint: "Conflictos árbol–infraestructura", icon: "building" },
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    icon: "wrench",
    modules: [
      { path: "mantencion", label: "Mantención", hint: "Órdenes de trabajo de mantenimiento", icon: "wrench" },
      // El Encargado de mantención no ve el módulo Inspección (CC-064; B3 responde 403).
      { path: "ot-inspeccion", label: "Inspección", hint: "Órdenes de trabajo de inspección", icon: "check", hiddenFor: ["encargado_mantencion"] },
    ],
  },
  {
    id: "ciudadania",
    label: "Ciudadanía",
    icon: "alert",
    modules: [
      { path: "conecta", label: "Valpo Verde Conecta", hint: "Reportes ciudadanos, QR y ficha pública", icon: "leaf" },
      { path: "incidencias", label: "Incidencias", hint: "Reportes y su estado", icon: "alert" },
      { path: "indices", label: "Indicadores biométricos", hint: "Composición y mediciones del inventario", icon: "sort" },
    ],
  },
];

/** Grupo y módulo de la pantalla actual (por el primer segmento tras el proyecto). */
export function findActiveModule(subpath: string): { group: NavGroup; module: NavModule } | null {
  const first = subpath.split("/")[0];
  // `/inventario` redirige a `/mapa` (App.tsx): mismo módulo.
  const key = first === "inventario" || first === "arboles" ? "mapa" : first;
  for (const group of NAV_GROUPS) {
    const module = group.modules.find((m) => m.path === key);
    if (module) return { group, module };
  }
  return null;
}

/** Grupos con solo los módulos que el rol puede consultar. */
export function navGroupsForRole(role: string | null | undefined): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    modules: g.modules.filter((m) => !(role && m.hiddenFor?.includes(role as KnownRole))),
  })).filter((g) => g.modules.length > 0);
}

/**
 * Roles que trabajan en un solo módulo (decisión de la responsable,
 * 2026-11-01, que reemplaza «Mis OT» de CC-064 k/n/o): eligen proyecto,
 * entran a su módulo principal y consultan el resto en solo lectura. Las
 * acciones de registro las decide cada pantalla por rol y el backend.
 */
export const ROLES_SOLO_LECTURA: readonly string[] = ["inspector", "encargado_mantencion"];

/** Módulo donde entra cada rol al abrir un proyecto (`path` de NAV_GROUPS). */
export function moduloPrincipal(role: string | null | undefined): string {
  if (role === "inspector") return "ot-inspeccion";
  if (role === "encargado_mantencion") return "mantencion";
  return "dashboard";
}
