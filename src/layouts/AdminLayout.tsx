import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { useAuth } from "../hooks/useAuth";

/**
 * Shell del rol admin (F5). Solo se monta detrás de `RequireRole`
 * (ver App.tsx), que ya garantizó `profile.role === "admin"` — este
 * layout no repite esa verificación, solo presenta.
 *
 * Sin navegación funcional todavía (proyectos/inventario/etc. son fases
 * posteriores): el Sidebar no lleva items hasta que existan rutas reales.
 */
export default function AdminLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar
        items={[]}
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
