import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, type NavItem } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { useAuth } from "../hooks/useAuth";
import { CurrentProjectProvider } from "../hooks/useCurrentProject";

// Solo los módulos territoriales (con mapa) usan el shell de workspace a
// pantalla completa. Mantención e Incidencias son gestión/listado, no
// territorio: se quedan en el layout normal con rail expandido + Topbar.
const WORKSPACE_SUFFIXES = ["/mapa", "/inspeccion", "/infraestructura"];

/**
 * Shell común de /admin y /usuario. Jerarquía: Mis proyectos → proyecto
 * (workspace) → Dashboard → módulos. Fuera de un proyecto el sidebar solo
 * ofrece "Mis proyectos"; dentro, solo los módulos del proyecto, y el
 * cambio de proyecto vive en el bloque "Proyecto actual" del pie.
 */
export function RoleLayout({ basePath, roleLabel, roleTone }: { basePath: "/admin" | "/usuario"; roleLabel: string; roleTone: "admin" | "user" }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const match = location.pathname.match(new RegExp(`^${basePath}/projects/([a-f0-9-]+)`));
  const currentProjectId = match ? match[1] : null;
  const isWorkspace = WORKSPACE_SUFFIXES.some((suffix) => location.pathname.endsWith(suffix));

  const projectsPath = `${basePath}/projects`;
  const base = currentProjectId ? `${projectsPath}/${currentProjectId}` : null;

  const navItems: NavItem[] = base
    ? [
        { to: `${base}/dashboard`, label: "Dashboard", icon: "chart" },
        { to: `${base}/mapa`, label: "Inventario", icon: "leaf" },
        { to: `${base}/inspeccion`, label: "Inspección y Riesgo", icon: "check-square" },
        { to: `${base}/infraestructura`, label: "Infraestructura", icon: "building" },
        { to: `${base}/mantencion`, label: "Mantención", icon: "wrench" },
        { to: `${base}/incidencias`, label: "Incidencias", icon: "alert" },
        { to: `${base}/indices`, label: "Índices", icon: "sort" },
      ]
    : [{ to: projectsPath, label: "Mis proyectos", icon: "list", end: true }];

  return (
    <CurrentProjectProvider projectId={currentProjectId}>
      <div className={`app-shell ${isWorkspace ? "app-shell--workspace" : ""}`}>
        <Sidebar
          items={navItems}
          userName={profile?.nombre ?? profile?.email ?? roleLabel}
          roleLabel={roleLabel}
          projectsPath={projectsPath}
          onLogout={signOut}
          compact={isWorkspace}
        />
        <div className="main">
          {!isWorkspace && <Topbar title="SIVU — Gestión Territorial" roleLabel={roleLabel} roleTone={roleTone} />}
          <div className={isWorkspace ? "content--workspace" : "content"}>
            <Suspense fallback={<p style={{ color: "var(--text-muted)", padding: 24 }}>Cargando…</p>}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </CurrentProjectProvider>
  );
}
