import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppTopBar } from "../components/AppTopBar";
import { ModuleSearch } from "../components/ModuleSearch";
import { CurrentProjectProvider } from "../hooks/useCurrentProject";

// Los módulos territoriales (con mapa) ocupan todo el espacio bajo la
// barra; el resto usa el contenido centrado con márgenes.
const WORKSPACE_SUFFIXES = ["/inspeccion", "/infraestructura"];

/**
 * Shell común de /admin y /usuario (Fase 7, Paso 2; CC-059): barra
 * superior con el proyecto actual y los grupos Análisis / Operación /
 * Territorio. Jerarquía: Mis proyectos → proyecto → Dashboard → módulos.
 * Fuera de un proyecto la barra solo ofrece el logotipo, el tema y la
 * cuenta. Mismas rutas y mismos guards que antes (App.tsx).
 */
export function RoleLayout({ basePath, roleLabel }: { basePath: "/admin" | "/usuario" | "/inspector"; roleLabel: string }) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const match = location.pathname.match(new RegExp(`^${basePath}/projects/([a-f0-9-]+)`));
  const currentProjectId = match ? match[1] : null;
  const isWorkspace = WORKSPACE_SUFFIXES.some((suffix) => location.pathname.endsWith(suffix));
  const projectsPath = `${basePath}/projects`;

  // Ctrl K / ⌘ K abre el buscador, solo dentro de un proyecto.
  useEffect(() => {
    if (!currentProjectId) return;
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [currentProjectId]);

  return (
    <CurrentProjectProvider projectId={currentProjectId}>
      <div className={`sivu-shell ${isWorkspace ? "sivu-shell--workspace" : ""}`}>
        <AppTopBar
          basePath={basePath}
          roleLabel={roleLabel}
          onOpenSearch={() => setSearchOpen(true)}
          workspace={basePath === "/inspector" ? { to: "/inspector/mis-ot", label: "Mis OT" } : undefined}
        />
        <main className={isWorkspace ? "content--workspace" : "content"}>
          <Suspense fallback={<p style={{ color: "var(--text-muted)", padding: 24 }}>Cargando…</p>}>
            <Outlet />
          </Suspense>
        </main>
        {searchOpen && currentProjectId && (
          <ModuleSearch
            projectBase={`${projectsPath}/${currentProjectId}`}
            projectsPath={projectsPath}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </div>
    </CurrentProjectProvider>
  );
}
