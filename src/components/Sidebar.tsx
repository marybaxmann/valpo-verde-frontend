import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "./Icons";

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

export function Sidebar({
  items,
  projectName,
  institucion,
  onLogout,
}: {
  items: NavItem[];
  projectName: string;
  institucion: string;
  onLogout?: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          <Icon name="leaf" size={17} />
        </div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-title">Arbolado Urbano</span>
          <span className="sidebar__brand-sub">Valpo Verde</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar__link ${isActive ? "active" : ""}`}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__project">
          {institucion}
          <strong>{projectName}</strong>
        </div>
        {onLogout && (
          <button className="sidebar__logout" onClick={onLogout}>
            <Icon name="logout" size={13} /> Cerrar sesión
          </button>
        )}
      </div>
    </aside>
  );
}
