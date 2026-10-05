import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import ProjectsList from "./pages/ProjectsList";
import ProjectDetail from "./pages/ProjectDetail";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import type { KnownRole } from "./types/authProfile";

/** SIG-1: la página del mapa (y el SDK de ArcGIS) se carga de forma diferida. */
const ProjectInventoryMap = lazy(() => import("./pages/ProjectInventoryMap"));

function InventoryMapRoute() {
  return (
    <Suspense fallback={<p style={{ color: "var(--text-muted)" }}>Cargando mapa…</p>}>
      <ProjectInventoryMap />
    </Suspense>
  );
}

/**
 * F5 — routing protegido por autenticación + rol real (`profile.role`,
 * GET /api/auth/me). Esto es control de navegación/UX, no la frontera
 * de seguridad: el backend sigue siendo quien autoriza de verdad (ver
 * README, contrato PR-018/ADR-014). Un guard que falla aquí solo
 * redirige; nunca es la razón por la que algo es o no accesible.
 *
 * Rutas: "/" (resuelve destino), "/admin/projects(/:projectId)",
 * "/usuario/projects(/:projectId)" (F6) y ".../projects/:projectId/mapa"
 * (SIG-1, mapa de inventario). Dashboard/etc. son fases posteriores.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />

      <Route element={<RequireRole role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/:projectId" element={<ProjectDetail />} />
          <Route path="projects/:projectId/mapa" element={<InventoryMapRoute />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="usuario_municipal" />}>
        <Route path="/usuario" element={<UserLayout />}>
          <Route index element={<Navigate to="projects" replace />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/:projectId" element={<ProjectDetail />} />
          <Route path="projects/:projectId/mapa" element={<InventoryMapRoute />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LoadingScreen({ message = "Cargando sesión…" }: { message?: string }) {
  return (
    <div className="login-screen">
      <p style={{ color: "var(--text-muted)" }}>{message}</p>
    </div>
  );
}

/** Estado controlado para profileError y para rol null/desconocido — nunca un shell operativo. */
function ControlledMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { signOut } = useAuth();
  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>{title}</h1>
        <p>{description}</p>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/**
 * Único lugar que decide "a dónde va este usuario". Los guards de rol
 * nunca deciden el destino correcto por sí mismos: si algo no encaja,
 * redirigen aquí, y esta ruta resuelve según `profile.role` real.
 */
function RootRoute() {
  const { loading, session, profile, profileLoading, profileError } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Login />;
  if (profileLoading) return <LoadingScreen message="Cargando perfil…" />;

  if (profileError) {
    return (
      <ControlledMessage
        title="No se pudo cargar tu perfil"
        description={profileError}
      />
    );
  }

  if (profile?.role === "admin") return <Navigate to="/admin" replace />;
  if (profile?.role === "usuario_municipal") return <Navigate to="/usuario" replace />;

  // Rol null o desconocido: nunca se asume admin ni se muestra un shell operativo.
  return (
    <ControlledMessage
      title="Rol no reconocido"
      description={
        profile
          ? `Tu cuenta no tiene un rol válido asignado (recibido: ${profile.role ?? "ninguno"}). Contacta al administrador.`
          : "No se pudo determinar tu rol."
      }
    />
  );
}

/**
 * Layout-route: exige sesión + perfil cargado + `profile.role === role`.
 * Si no se cumple, redirige a "/" (que resuelve el destino correcto) —
 * nunca deja pasar ni renderiza el shell del rol equivocado.
 */
function RequireRole({ role }: { role: KnownRole }) {
  const { loading, session, profile, profileLoading, profileError } = useAuth();

  if (loading || profileLoading) return <LoadingScreen />;
  if (!session || profileError || profile?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
