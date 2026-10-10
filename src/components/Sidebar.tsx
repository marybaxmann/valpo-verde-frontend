import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Icon, type IconName } from "./Icons";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { useTheme } from "../hooks/useTheme";

export interface NavItem {
  to?: string;
  label: string;
  icon: IconName;
  end?: boolean;
  disabled?: boolean;
}

export function Sidebar({
  items,
  userName,
  roleLabel,
  projectsPath,
  onLogout,
  compact: initialCompact = false,
}: {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  /** Ruta de "Mis proyectos" (destino de "Cambiar proyecto"). */
  projectsPath: string;
  onLogout?: () => void;
  compact?: boolean;
}) {
  const location = useLocation();
  const [compact, setCompact] = useState(initialCompact);
  const { projectId, project } = useCurrentProject();

  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  const userInitial = (userName || "U").charAt(0).toUpperCase();

  return (
    <aside
      className={`sivu-rail ${compact ? "sivu-rail--compact" : ""}`}
      aria-label="Módulos territoriales de SIVU"
    >
      {/* Brand institucional SIVU */}
      <div className="sivu-rail__brand">
        <div
          className="sivu-rail__brand-mark"
          onClick={() => setCompact(!compact)}
          style={{ cursor: "pointer" }}
          title={compact ? "Expandir barra de navegación" : "Colapsar a barra compacta"}
        >
          <Icon name="leaf" size={16} />
        </div>
        <div className="sivu-rail__brand-text">
          <span className="sivu-rail__brand-title">SIVU</span>
          <span className="sivu-rail__brand-sub">SIG Municipal</span>
        </div>
      </div>

      {/* Navegación por módulos territoriales */}
      <nav className="sivu-rail__nav">
        {items.map((item, idx) => {
          if (item.disabled || !item.to) {
            return (
              <div
                key={item.label + idx}
                className="sivu-rail__item sivu-rail__item--disabled"
                title={`${item.label} (Próximo módulo)`}
              >
                <Icon name={item.icon} size={15} />
                <span>{item.label}</span>
              </div>
            );
          }

          const isActive =
            item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`sivu-rail__item ${isActive ? "active" : ""}`}
              title={compact ? item.label : undefined}
            >
              <Icon name={item.icon} size={15} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Pie del rail: proyecto actual (si se está dentro de uno) y usuario */}
      <div className="sivu-rail__footer">
        {projectId && (
          <div className="sivu-rail__block">
            {!compact && (
              <div className="sivu-rail__context">
                <span className="sivu-rail__inst">Proyecto actual</span>
                <strong className="sivu-rail__user" title={project?.name}>
                  {project?.name ?? "Cargando…"}
                </strong>
                {project?.institution_name && (
                  <span className="sivu-rail__sub" title={project.institution_name}>
                    {project.institution_name}
                  </span>
                )}
              </div>
            )}
            <Link
              to={projectsPath}
              className="sivu-rail__logout"
              title="Cambiar proyecto — volver a Mis proyectos"
              style={{ textDecoration: "none" }}
            >
              <Icon name="grid" size={13} />
              <span>Cambiar proyecto</span>
            </Link>
          </div>
        )}

        <div className="sivu-rail__block">
          {compact ? (
            <div className="sivu-rail__user-avatar" title={`${userName} (${roleLabel})`}>
              {userInitial}
            </div>
          ) : (
            <div className="sivu-rail__context">
              <span className="sivu-rail__inst">Usuario</span>
              <strong className="sivu-rail__user" title={userName}>
                {userName}
              </strong>
              <span className="sivu-rail__sub">{roleLabel}</span>
            </div>
          )}

          <button
            type="button"
            className="sivu-rail__logout"
            onClick={toggleTheme}
            title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            <Icon name={dark ? "sun" : "moon"} size={13} />
            <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
          </button>

          {onLogout && (
            <button className="sivu-rail__logout" onClick={onLogout} title="Cerrar sesión">
              <Icon name="logout" size={13} />
              <span>Salir</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
