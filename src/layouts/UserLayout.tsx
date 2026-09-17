import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";

/**
 * Esqueleto visual únicamente (F0). Ver nota en AdminLayout.tsx.
 */
const navItems: NavItem[] = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
  { to: "inventario", label: "Inventario", icon: "list" },
  { to: "registrar", label: "Registrar árbol", icon: "plus" },
  { to: "incidencias", label: "Incidencias", icon: "alert" },
  { to: "mantenimiento", label: "Mantenimiento", icon: "wrench" },
  { to: "indicadores", label: "Indicadores", icon: "chart" },
];

export default function UserLayout({
  project,
  children,
}: {
  project: { nombre: string; institucion: string };
  children?: ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar items={navItems} projectName={project.nombre} institucion={project.institucion} />
      <div className="main">
        <Topbar title={project.institucion} roleLabel="Usuario municipal" roleTone="user" />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
