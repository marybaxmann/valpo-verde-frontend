import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";

/**
 * Esqueleto visual únicamente (F0). Ya no resuelve el proyecto desde
 * mock/data.ts: recibe `project` y `children` como props. El routing
 * real (rutas anidadas, useParams, Outlet) y los guards de rol se
 * construyen en F5.
 */
const navItems: NavItem[] = [
  { to: "dashboard", label: "Dashboard", icon: "grid" },
  { to: "inventario", label: "Inventario", icon: "list" },
  { to: "inspeccion", label: "Inspección y riesgo", icon: "check-square" },
  { to: "infraestructura", label: "Infraestructura", icon: "link" },
  { to: "incidencias", label: "Incidencias", icon: "alert" },
  { to: "priorizacion", label: "Priorización", icon: "sort" },
  { to: "mantenimiento", label: "Mantenimiento", icon: "wrench" },
  { to: "indicadores", label: "Indicadores y análisis", icon: "chart" },
];

export default function AdminLayout({
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
        <Topbar title={project.nombre} roleLabel="Administrador" roleTone="admin" />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
