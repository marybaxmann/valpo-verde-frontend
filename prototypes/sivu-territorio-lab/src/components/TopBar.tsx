import { Icon } from "./Icon";
import { Glass, IconButton } from "./primitives";
import { NAV, type NavGroup, type Role } from "../data/nav";

export type Menu = NavGroup["id"] | "user" | "buscar" | null;

function Dropdown({ group, role, current }: { group: NavGroup; role: Role; current: string }) {
  const items = group.items.filter((i) => !i.roles || i.roles.includes(role));
  return (
    <Glass className={`dd dd--${group.id}`} aria-label={`Módulos de ${group.label}`}>
      <span className="dd__title">{group.label}</span>
      <ul>
        {items.map((i) => (
          <li key={i.label}>
            <a href="#" className={`dd__item ${i.label === current ? "is-current" : ""}`}>
              <span className="dd__icon">
                <Icon name={i.icon} size={17} />
              </span>
              <span className="dd__text">
                <strong>
                  {i.label}
                  {i.roles && <em>Solo Administrador</em>}
                </strong>
                <span>{i.hint}</span>
              </span>
              <code className="dd__route">{i.route}</code>
            </a>
          </li>
        ))}
      </ul>
    </Glass>
  );
}

export function TopBar({
  role,
  open,
  setOpen,
  current,
  dark,
  onTheme,
}: {
  role: Role;
  open: Menu;
  setOpen: (m: Menu) => void;
  current: string;
  dark: boolean;
  onTheme: () => void;
}) {
  const activeGroup = NAV.find((g) => g.items.some((i) => i.label === current))?.id;
  const toggle = (m: Menu) => setOpen(open === m ? null : m);

  return (
    <div className="topbar">
      <a href="#" className="brand" aria-label="SIVU · ir a Proyectos">
        <span className="brand__mark">
          <Icon name="leaf" size={18} stroke={2} />
        </span>
        <span className="brand__word">SIVU</span>
      </a>

      <div className="spaces-wrap">
        <Glass as="nav" className="spaces" aria-label="Espacios de trabajo">
          {NAV.filter((g) => g.id !== "proyecto").map((g) => (
            <button
              key={g.id}
              type="button"
              className={`spaces__item ${g.id === activeGroup ? "is-active" : ""} ${open === g.id ? "is-open" : ""}`}
              aria-expanded={open === g.id}
              aria-haspopup="menu"
              onClick={() => toggle(g.id)}
            >
              <Icon name={g.icon} size={16} />
              {g.label}
              <Icon name="chevronDown" size={13} />
            </button>
          ))}
          <span className="spaces__sep" aria-hidden="true" />
          <button
            type="button"
            className={`spaces__item spaces__item--icon ${open === "proyecto" ? "is-open" : ""}`}
            aria-label="Proyecto: ficha, miembros y cambio de proyecto"
            title="Proyecto"
            aria-expanded={open === "proyecto"}
            onClick={() => toggle("proyecto")}
          >
            <Icon name="settings" size={16} />
          </button>
        </Glass>
        {NAV.map((g) => open === g.id && <Dropdown key={g.id} group={g} role={role} current={current} />)}
      </div>

      <div className="topbar__right">
        <button type="button" className="search-pill" onClick={() => toggle("buscar")} aria-label="Buscar módulo, árbol o acción">
          <Icon name="search" size={16} />
          Buscar
          <kbd>Ctrl K</kbd>
        </button>
        <IconButton icon="moon" label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={onTheme} />
        <div className="user-wrap">
          <button type="button" className="glass glass--dark user" aria-expanded={open === "user"} onClick={() => toggle("user")}>
            <span className="user__avatar">M</span>
            <span className="user__text">
              <strong>[Usuario]</strong>
              <span>{role === "admin" ? "Administrador" : "Usuario municipal"}</span>
            </span>
            <Icon name="chevronDown" size={14} />
          </button>
          {open === "user" && (
            <Glass className="dd dd--user" aria-label="Cuenta">
              <div className="dd__who">
                <strong>[Usuario]</strong>
                <span>[correo@municipio.cl]</span>
                <span className="dd__role">{role === "admin" ? "Administrador" : "Usuario municipal"}</span>
              </div>
              <a href="#" className="dd__item dd__item--row" onClick={onTheme}>
                <Icon name="moon" size={16} />
                Modo claro / oscuro
              </a>
              <a href="#" className="dd__item dd__item--row">
                <Icon name="arrowRight" size={16} />
                Cerrar sesión
              </a>
            </Glass>
          )}
        </div>
      </div>
    </div>
  );
}
