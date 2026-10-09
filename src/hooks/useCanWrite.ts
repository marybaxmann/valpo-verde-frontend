import { useAuth } from "./useAuth";

/**
 * ¿El usuario actual puede registrar, editar o cambiar estados en los datos
 * del proyecto? Solo el Usuario municipal (PR-003 v6.0, CC-022); el
 * Administrador tiene acceso de solo lectura (PR-004 v5.0). Es solo UX: el
 * backend y RLS vuelven a exigirlo.
 */
export function useCanWrite(): boolean {
  const { profile } = useAuth();
  return profile?.role === "usuario_municipal";
}
