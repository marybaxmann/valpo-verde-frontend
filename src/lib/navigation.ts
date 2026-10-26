import type { IconName } from "../components/Icons";

/**
 * Navegación del proyecto (CC-059) con los nombres visibles de CC-060.
 * Los grupos son solo visuales: no fusionan, renombran ni crean módulos,
 * y no cambian rutas ni permisos (la seguridad la decide el backend).
 * Inspección (CC-061) y Valpo Verde Conecta (CC-062) irán en Operación,
 * pero no aparecen hasta que existan sus endpoints (CC-059, punto 4).
 *
 * `path` es relativo a `/{admin|usuario}/projects/:projectId`.
 */
export interface NavModule {
  path: string;
  label: string;
  /** Qué se hace en el módulo, para el menú y el buscador. */
  hint: string;
  icon: IconName;
}

export interface NavGroup {
  id: "analisis" | "operacion" | "territorio";
  label: string;
  icon: IconName;
  modules: NavModule[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "analisis",
    label: "Análisis",
    icon: "chart",
    modules: [
      { path: "dashboard", label: "Dashboard", hint: "Resumen del proyecto", icon: "chart" },
      { path: "indices", label: "Indicadores biométricos", hint: "Composición y mediciones del inventario", icon: "sort" },
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    icon: "wrench",
    modules: [
      { path: "mantencion", label: "Mantención", hint: "Órdenes de trabajo", icon: "wrench" },
      { path: "incidencias", label: "Incidencias", hint: "Reportes y su estado", icon: "alert" },
    ],
  },
  {
    id: "territorio",
    label: "Territorio",
    icon: "leaf",
    modules: [
      { path: "mapa", label: "Inventario", hint: "Árboles del proyecto", icon: "leaf" },
      { path: "inspeccion", label: "Riesgo Arbóreo", hint: "Resultados de riesgo en el territorio", icon: "check-square" },
      { path: "infraestructura", label: "Infraestructura", hint: "Conflictos árbol–infraestructura", icon: "building" },
    ],
  },
];

/** Grupo y módulo de la pantalla actual (por el primer segmento tras el proyecto). */
export function findActiveModule(subpath: string): { group: NavGroup; module: NavModule } | null {
  const first = subpath.split("/")[0];
  // `/inventario` redirige a `/mapa` (App.tsx): mismo módulo.
  const key = first === "inventario" ? "mapa" : first;
  for (const group of NAV_GROUPS) {
    const module = group.modules.find((m) => m.path === key);
    if (module) return { group, module };
  }
  return null;
}
