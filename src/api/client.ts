import { supabase } from "../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Error HTTP devuelto por el backend (4xx/5xx), con el status original. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** No hay sesión de Supabase vigente para autenticar la petición. */
export class NoSessionError extends Error {
  constructor() {
    super("No hay una sesión activa. Inicia sesión para continuar.");
    this.name = "NoSessionError";
  }
}

/**
 * Lee el access_token vigente directamente desde Supabase en cada
 * llamada — nunca se cachea en una variable de módulo ni se persiste
 * por cuenta propia. supabase-js sigue siendo el único responsable de
 * guardar/refrescar la sesión.
 */
async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new NoSessionError();
  }
  return data.session.access_token;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Vuelve a iniciar sesión para continuar.";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Falta VITE_API_BASE_URL. Revisa tu .env (ver .env.example).");
  }

  const send = (token: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send(await getAccessToken());

  // getSession() puede devolver un access_token ya vencido si el refresco
  // automático de supabase-js no alcanzó a ejecutarse (pestaña en segundo
  // plano, equipo suspendido, desfase de reloj). Ante un 401 se fuerza un
  // refresco con el refresh_token y se reintenta UNA sola vez; la
  // autorización la sigue decidiendo el backend.
  if (res.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      throw new ApiError(401, SESSION_EXPIRED_MESSAGE);
    }
    res = await send(data.session.access_token);
    if (res.status === 401) {
      throw new ApiError(401, SESSION_EXPIRED_MESSAGE);
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const payload: unknown = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : res.statusText || "Error al comunicarse con el backend";
    throw new ApiError(res.status, message);
  }

  return payload as T;
}

/**
 * Cliente HTTP mínimo hacia el backend (valpo-verde-backend). Cada
 * llamada adjunta `Authorization: Bearer <access_token>` con el JWT
 * vigente de Supabase Auth. No decide identidad ni permisos — el
 * backend es quien autoriza (ver ADR-014).
 */
export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};
