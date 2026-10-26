import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "./Icons";
import { SivuLogo } from "./SivuLogo";
import { useAuth } from "../hooks/useAuth";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { useTheme } from "../hooks/useTheme";
import { NAV_GROUPS, findActiveModule, type NavGroup } from "../lib/navigation";

type Menu = NavGroup["id"] | "proyecto" | "cuenta" | null;

/**
 * Barra superior de SIVU (Fase 7, Paso 2; CC-057 y CC-059): logotipo,
 * proyecto actual con su menú, los tres grupos de módulos, buscador,
 * tema y cuenta. Reescrita sobre la arquitectura productiva (CC-058): no
 * importa nada de la maqueta. El rol que muestra es el que confirma el
 * backend (GET /api/auth/me); los guards de App.tsx siguen decidiendo el
 * acceso y el backend la seguridad.
 */
export function AppTopBar({
  basePath,
  roleLabel,
  onOpenSearch,
}: {
  basePath: "/admin" | "/usuario";
  roleLabel: string;
  onOpenSearch: () => void;
}) {
  const { profile, signOut } = useAuth();
  const { projectId, project } = useCurrentProject();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  // El menú abierto se recuerda junto con la ruta: al navegar queda cerrado.
  const [openState, setOpenState] = useState<{ menu: Menu; path: string }>({ menu: null, path: "" });
  const open = openState.path === location.pathname ? openState.menu : null;
  const setOpen = (menu: Menu) => setOpenState({ menu, path: location.pathname });
  const barRef = useRef<HTMLElement>(null);

  const projectsPath = `${basePath}/projects`;
  const projectBase = projectId ? `${projectsPath}/${projectId}` : null;
  const subpath = projectBase && location.pathname.startsWith(`${projectBase}/`)
    ? location.pathname.slice(projectBase.length + 1)
    : "";
  const active = findActiveModule(subpath);
  const isAdmin = profile?.role === "admin";
  const userName = profile?.nombre ?? profile?.email ?? roleLabel;

  // Clic fuera de la barra o Escape cierran el menú.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenState({ menu: null, path: "" });
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenState({ menu: null, path: "" });
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (m: Exclude<Menu, null>) => setOpen(open === m ? null : m);

  return (
    <header className="sivu-topbar" ref={barRef}>
      <div className="sivu-topbar__left">
        <Link
          to={projectBase ? `${projectBase}/dashboard` : projectsPath}
          className="sivu-topbar__brand"
          aria-label={projectBase ? "SIVU · ir al Dashboard" : "SIVU · mis proyectos"}
        >
          <SivuLogo height={28} />
        </Link>

        {projectBase && (
          <div className="sivu-topbar__menu-wrap">
            <button
              type="button"
              className={`sivu-topbar__project ${open === "proyecto" ? "is-open" : ""}`}
              aria-haspopup="menu"
              aria-expanded={open === "proyecto"}
              onClick={() => toggle("proyecto")}
              title={project?.nombre_proyecto}
            >
              <span className="sivu-topbar__project-name">{project?.nombre_proyecto ?? "Cargando proyecto…"}</span>
              <Icon name="chevron-down" size={14} />
            </button>
            {open === "proyecto" && (
              <div className="sivu-dd" role="menu" aria-label="Proyecto">
                <Link role="menuitem" className="sivu-dd__item" to={projectBase}>
                  <span className="sivu-dd__icon"><Icon name="list" size={15} /></span>
                  <span className="sivu-dd__text">
                    <strong>Ficha del proyecto</strong>
                    <small>Estado, sector y fechas</small>
                  </span>
                </Link>
                {isAdmin && (
                  <Link role="menuitem" className="sivu-dd__item" to={`${projectBase}#miembros`}>
                    <span className="sivu-dd__icon"><Icon name="user" size={15} /></span>
                    <span className="sivu-dd__text">
                      <strong>Miembros del proyecto</strong>
                      <small>Agregar y quitar miembros</small>
                    </span>
                  </Link>
                )}
                <Link role="menuitem" className="sivu-dd__item" to={projectsPath}>
                  <span className="sivu-dd__icon"><Icon name="arrow-left" size={15} /></span>
                  <span className="sivu-dd__text">
                    <strong>Cambiar de proyecto</strong>
                    <small>{isAdmin ? "Todos los proyectos" : "Mis proyectos"}</small>
                  </span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {projectBase && (
        <nav className="sivu-topbar__spaces" aria-label="Módulos del proyecto">
          {NAV_GROUPS.map((g) => (
            <div key={g.id} className="sivu-topbar__menu-wrap">
              <button
                type="button"
                className={`sivu-topbar__space ${active?.group.id === g.id ? "is-active" : ""} ${open === g.id ? "is-open" : ""}`}
                aria-haspopup="menu"
                aria-expanded={open === g.id}
                onClick={() => toggle(g.id)}
              >
                <Icon name={g.icon} size={15} />
                {g.label}
                <Icon name="chevron-down" size={13} />
              </button>
              {open === g.id && (
                <div className="sivu-dd" role="menu" aria-label={g.label}>
                  {g.modules.map((m) => (
                    <Link
                      key={m.path}
                      role="menuitem"
                      className={`sivu-dd__item ${active?.module.path === m.path ? "is-current" : ""}`}
                      to={`${projectBase}/${m.path}`}
                      aria-current={active?.module.path === m.path ? "page" : undefined}
                    >
                      <span className="sivu-dd__icon"><Icon name={m.icon} size={15} /></span>
                      <span className="sivu-dd__text">
                        <strong>{m.label}</strong>
                        <small>{m.hint}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="sivu-topbar__right">
        {projectBase && (
          <button type="button" className="sivu-topbar__search" onClick={onOpenSearch} aria-label="Buscar módulo (Ctrl K)">
            <Icon name="search" size={15} />
            <span>Buscar</span>
            <kbd>Ctrl K</kbd>
          </button>
        )}
        <button
          type="button"
          className="sivu-topbar__icon-btn"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </button>
        <div className="sivu-topbar__menu-wrap">
          <button
            type="button"
            className={`sivu-topbar__user ${open === "cuenta" ? "is-open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={open === "cuenta"}
            onClick={() => toggle("cuenta")}
          >
            <span className="sivu-topbar__avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
            <span className="sivu-topbar__user-text">
              <strong>{userName}</strong>
              <span>{roleLabel}</span>
            </span>
            <Icon name="chevron-down" size={13} />
          </button>
          {open === "cuenta" && (
            <div className="sivu-dd sivu-dd--right" role="menu" aria-label="Cuenta">
              <div className="sivu-dd__who">
                <strong>{userName}</strong>
                {profile?.email && <span>{profile.email}</span>}
                <span className="sivu-dd__role">{roleLabel}</span>
              </div>
              <button type="button" role="menuitem" className="sivu-dd__item sivu-dd__item--row" onClick={toggleTheme}>
                <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </button>
              <button type="button" role="menuitem" className="sivu-dd__item sivu-dd__item--row" onClick={signOut}>
                <Icon name="logout" size={15} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
