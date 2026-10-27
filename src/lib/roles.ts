import type { KnownRole } from "../types/authProfile";

/**
 * Prefijo de rutas de cada rol con interfaz (F5; CC-064 o: `/inspector`).
 * El rol lo confirma el backend (GET /api/auth/me); esto es solo navegación.
 */
export const BASE_PATH_BY_ROLE: Record<KnownRole, "/admin" | "/usuario" | "/inspector"> = {
  admin: "/admin",
  usuario_municipal: "/usuario",
  inspector: "/inspector",
};

export function basePathForRole(role: string | null | undefined): "/admin" | "/usuario" | "/inspector" {
  return role && role in BASE_PATH_BY_ROLE ? BASE_PATH_BY_ROLE[role as KnownRole] : "/usuario";
}
