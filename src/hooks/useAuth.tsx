import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { api } from "../api/client";
import type { AuthProfile } from "../types/authProfile";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: AuthProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Autenticación real vía Supabase Auth (F2) + perfil de aplicación real
 * vía GET /api/auth/me (F4). La sesión la administra supabase-js
 * internamente (storage propio del SDK) — este provider no persiste el
 * JWT por su cuenta ni lo expone salvo dentro de `session`.
 *
 * Todavía NO decide rol/navegación con `profile.role`: eso es F5.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Depende del user id (no del objeto `session` completo) para no
  // repetir la llamada en cada refresco silencioso del access_token —
  // solo cuando cambia de sesión/usuario real (login, logout, switch).
  const sessionUserId = session?.user.id;

  useEffect(() => {
    // Sin sesión: nada que buscar. El clear es inmediato porque `value`
    // deriva profile/profileLoading/profileError a partir de
    // `sessionUserId` en vez de depender de que este efecto corra.
    if (!sessionUserId) return;

    let cancelled = false;
    // Limpia el perfil del usuario anterior de inmediato (no solo al
    // resolver la respuesta nueva) para que un cambio de sesión sin
    // logout explícito (A -> B) no deje visibles los datos de A
    // mientras se espera la respuesta de B.
    setProfile(null);
    setProfileError(null);
    setProfileLoading(true);

    api
      .get<{ data: AuthProfile }>("/api/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data);
        setProfileLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProfile(null);
        setProfileError(err instanceof Error ? err.message : "No se pudo obtener el perfil.");
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profile: sessionUserId ? profile : null,
      profileLoading: sessionUserId ? profileLoading : false,
      profileError: sessionUserId ? profileError : null,
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { error: "No se pudo iniciar sesión. Revisa tu email y contraseña." };
        }
        return { error: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, profile, profileLoading, profileError, sessionUserId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
