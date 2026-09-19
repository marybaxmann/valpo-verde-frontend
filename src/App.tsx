import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";

/**
 * F2 — solo demuestra que la autenticación real funciona:
 * loading -> sin sesión -> con sesión. Todavía NO decide rol (eso es
 * F4, vía GET /api/auth/me) ni construye routing/guards (eso es F5).
 */
export default function App() {
  const { session, user, loading, signOut } = useAuth();

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
          no implica que el usuario sea admin. El rol real llega en F4. */}
      <Sidebar items={[]} projectName="Sesión activa" institucion="Valpo Verde" onLogout={signOut} />
      <div className="main">
        <Topbar title="Autenticado" roleLabel="Sesión iniciada" roleTone="admin" />
        <div className="content">
          <div className="card card--pad">
            <h3 style={{ marginBottom: 10 }}>Autenticación real confirmada (F2)</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Sesión de Supabase Auth activa para <strong>{user?.email}</strong>.
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 10 }}>
              Todavía sin rol resuelto, sin cliente API y sin routing productivo —
              se construyen en F3, F4 y F5.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
