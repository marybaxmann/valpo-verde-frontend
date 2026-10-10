import { useLocation } from "react-router-dom";

/**
 * Ruta base del proyecto actual (`/admin/projects/:id` o
 * `/usuario/projects/:id`), para navegar entre módulos con el árbol
 * preseleccionado: `${base}/mantencion?arbol=<id>&nuevo=1`.
 */
export function useProjectBase(): string | null {
  const { pathname } = useLocation();
  const m = pathname.match(/^\/(admin|usuario)\/projects\/[a-f0-9-]+/);
  return m ? m[0] : null;
}
