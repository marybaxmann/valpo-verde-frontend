import { Outlet } from "react-router-dom";
import { Sidebar, type NavItem } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { useAuth } from "../hooks/useAuth";

/**
 * Shell del rol admin (F5/F6). Solo se monta detrás de `RequireRole`
 * (ver App.tsx), que ya garantizó `profile.role === "admin"` — este
 * layout no repite esa verificación, solo presenta.
 *
 * Sidebar con solo "Proyectos" (F6) — el resto de módulos son fases
 * posteriores, sin rutas reales todavía.
 */
const navItems: NavItem[] = [{ to: "/admin/projects", label: "Proyectos", icon: "list" }];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar
        items={navItems}
        projectName={profile?.nombre ?? profile?.email ?? "Administrador"}
        institucion="Valpo Verde"
        onLogout={signOut}
      />
      <div className="main">
        <Topbar title="Panel administrador" roleLabel="Administrador" roleTone="admin" />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
