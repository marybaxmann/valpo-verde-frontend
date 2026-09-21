import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { useAuth } from "../hooks/useAuth";

/**
 * Shell del rol usuario_municipal (F5). Ver nota en AdminLayout.tsx —
 * solo se monta detrás de `RequireRole`, que ya garantizó el rol.
 */
export default function UserLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar
        items={[]}
        projectName={profile?.nombre ?? profile?.email ?? "Usuario municipal"}
        institucion="Valpo Verde"
        onLogout={signOut}
      />
      <div className="main">
        <Topbar title="Panel municipal" roleLabel="Usuario municipal" roleTone="user" />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
