import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import { SivuLogo } from "./components/SivuLogo";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import InspectorLayout from "./layouts/InspectorLayout";
import type { KnownRole } from "./types/authProfile";

/**
 * Cada pantalla se descarga recién cuando se abre (carga diferida): el
 * primer ingreso no baja el código de todos los módulos. El indicador de
 * carga vive en RoleLayout (<Suspense> alrededor del <Outlet>), así el
 * menú lateral se mantiene visible al cambiar de pantalla.
 * SIG-1: la página del mapa (y el SDK de ArcGIS) ya se cargaba así.
 */
const ProjectsList = lazy(() => import("./pages/ProjectsList"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ProjectDashboard = lazy(() => import("./pages/ProjectDashboard"));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage"));
const IncidentsPage = lazy(() => import("./pages/IncidentsPage"));
const IndicesPage = lazy(() => import("./pages/IndicesPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const RiskPage = lazy(() => import("./pages/RiskPage"));
const InfrastructurePage = lazy(() => import("./pages/InfrastructurePage"));
const InspectionOrdersPage = lazy(() => import("./pages/InspectionOrdersPage"));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage"));
const InspectionFormPage = lazy(() => import("./pages/InspectionFormPage"));

// Inventario (Fase 7): tabla protagonista; ruta /mapa sin cambios (CC-059).
function InventoryRoute() {
  return (
    <Suspense fallback={<p style={{ color: "var(--text-muted)" }}>Cargando inventario…</p>}>
      <InventoryPage />
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
 * Rutas: "/" (resuelve destino) y, por rol, "/admin", "/usuario" e
 * "/inspector" (CC-064), cada uno con las mismas rutas de proyecto
 * (`projectRoutes`); el Inspector entra a "/inspector/mis-ot".
 */
/**
 * Rutas de proyecto, iguales para todos los roles con interfaz: cada
 * pantalla adapta sus acciones al rol que confirma el backend.
 */
function projectRoutes() {
  return (
    <>
      <Route path="projects" element={<ProjectsList />} />
      <Route path="projects/:projectId" element={<ProjectDetail />} />
      <Route path="projects/:projectId/dashboard" element={<ProjectDashboard />} />
      <Route path="projects/:projectId/mapa" element={<InventoryRoute />} />
      <Route path="projects/:projectId/inventario" element={<Navigate to="../mapa" replace />} />
      <Route path="projects/:projectId/inspeccion" element={<RiskPage />} />
      <Route path="projects/:projectId/infraestructura" element={<InfrastructurePage />} />
      <Route path="projects/:projectId/mantencion" element={<MaintenancePage />} />
      <Route path="projects/:projectId/ot-inspeccion" element={<InspectionOrdersPage />} />
      <Route path="projects/:projectId/incidencias" element={<IncidentsPage />} />
      <Route path="projects/:projectId/indices" element={<IndicesPage />} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />

      <Route element={<RequireRole role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="projects" replace />} />
          {projectRoutes()}
        </Route>
      </Route>

      <Route element={<RequireRole role="usuario_municipal" />}>
        <Route path="/usuario" element={<UserLayout />}>
          <Route index element={<Navigate to="projects" replace />} />
          {projectRoutes()}
        </Route>
      </Route>

      {/* Inspector (CC-064): entra a «Mis OT»; consulta los módulos en solo lectura. */}
      <Route element={<RequireRole role="inspector" />}>
        <Route path="/inspector" element={<InspectorLayout />}>
          <Route index element={<Navigate to="mis-ot" replace />} />
          <Route path="mis-ot" element={<MyOrdersPage />} />
          <Route path="ot/:workOrderId/inspeccion" element={<InspectionFormPage />} />
          {projectRoutes()}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Etiquetas de interfaz de PR-019 v1.2 y PR-020 v1.1, por identificador (CC-032). */
const ROLES_SIN_INTERFAZ: Record<string, string> = {
  // El Inspector tiene interfaz desde CC-064 (ruta /inspector). El Encargado
  // de mantención la tendrá con el #61 (CC-064 c).
  encargado_mantencion: "Encargado de mantención",
};

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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <SivuLogo height={34} />
        </div>
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
  if (profile?.role === "inspector") return <Navigate to="/inspector" replace />;

  // CC-059, punto 5: roles vigentes (CC-026, CC-032) que todavía no tienen
  // interfaz. Un mensaje que nombra el rol; nunca un shell de otro rol.
  const pendingRoleLabel = profile?.role ? ROLES_SIN_INTERFAZ[profile.role] : undefined;
  if (pendingRoleLabel) {
    return (
      <ControlledMessage
        title={`Tu rol (${pendingRoleLabel}) todavía no tiene interfaz en SIVU`}
        description="Tu cuenta está activa y tu rol es válido. La interfaz para este rol está pendiente: se habilitará cuando el sistema entregue sus datos."
      />
    );
  }

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
