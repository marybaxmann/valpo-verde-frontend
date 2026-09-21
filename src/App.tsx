import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";

/**
 * F4 — solo demuestra que GET /api/auth/me está integrado: loading de
 * sesión -> sin sesión -> con sesión -> perfil real del backend.
 * Todavía NO usa `profile.role` para decidir navegación/UI (eso es F5)
 * ni construye routing/guards.
 */
export default function App() {
  const { session, loading, signOut, profile, profileLoading, profileError } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <p style={{ color: "var(--text-muted)" }}>Cargando sesión…</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      {/* roleTone="admin" aquí es solo el estilo por defecto del pill —
          no implica que el usuario sea admin. Navegación por rol: F5. */}
      <Sidebar items={[]} projectName="Sesión activa" institucion="Valpo Verde" onLogout={signOut} />
      <div className="main">
        <Topbar title="Autenticado" roleLabel="Sesión iniciada" roleTone="admin" />
        <div className="content">
          <div className="card card--pad">
            <h3 style={{ marginBottom: 10 }}>Perfil real confirmado (F4)</h3>

            {profileLoading && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando perfil…</p>
            )}

            {profileError && (
              <p style={{ fontSize: 13, color: "var(--red-500)" }}>
                No se pudo obtener el perfil: {profileError}
              </p>
            )}

            {profile && (
              <div className="info-list">
                <div className="info-list__item">
                  <span>Nombre</span>
                  {profile.nombre ?? "—"}
                </div>
                <div className="info-list__item">
                  <span>Email</span>
                  {profile.email ?? "—"}
                </div>
                <div className="info-list__item">
                  <span>Rol (backend)</span>
                  {profile.role ?? "—"}
                </div>
                <div className="info-list__item">
                  <span>Activo</span>
                  {profile.activo ? "Sí" : "No"}
                </div>
              </div>
            )}

            <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 14 }}>
              Todavía sin guards, sin navegación por rol y sin routing productivo —
              se construyen en F5.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
