import { supabase } from "../lib/supabase";

/**
 * Caché en memoria de lecturas de la API (60 s por defecto), para que
 * moverse entre módulos no vuelva a pedir el proyecto, los árboles o el
 * resumen de riesgo. Reglas:
 * - Peticiones simultáneas a la misma clave comparten una sola llamada.
 * - Una lectura fallida no se guarda.
 * - Cualquier escritura exitosa (POST/PATCH/DELETE, ver client.ts) y
 *   cualquier cambio de sesión vacían toda la caché: después de guardar,
 *   la siguiente lectura siempre trae datos frescos del backend.
 */
const store = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

export function cachedGet<T>(key: string, load: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.promise as Promise<T>;
  const promise = load().catch((err: unknown) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
}

export function clearApiCache(): void {
  store.clear();
}

// Otra cuenta o cierre de sesión: nunca reutilizar datos del usuario anterior.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") clearApiCache();
});
