import { Icon } from "./Icon";
import { Glass } from "./primitives";
import { ACTIONS, NAV, type Role } from "../data/nav";

/** Buscador global (Ctrl K): llega a cualquier módulo, árbol o acción permitida sin recorrer menús. */
export function CommandPalette({ role, onClose }: { role: Role; onClose: () => void }) {
  const modules = NAV.flatMap((g) => g.items.filter((i) => !i.roles || i.roles.includes(role)).map((i) => ({ ...i, group: g.label })));
  const actions = ACTIONS.filter((a) => a.roles.includes(role));
  return (
    <div className="palette-scrim" onClick={onClose}>
      <Glass className="palette" aria-label="Buscar en SIVU">
        <div className="palette__input" onClick={(e) => e.stopPropagation()}>
          <Icon name="search" size={18} />
          <input id="palette-q" placeholder="Buscar módulo, árbol (código, especie, calle) o acción" aria-label="Buscar" />
          <kbd>Esc</kbd>
        </div>
        <div className="palette__body" onClick={(e) => e.stopPropagation()}>
          <section>
            <h3>Módulos</h3>
            <ul className="palette__grid">
              {modules.map((m) => (
                <li key={m.label}>
                  <a href="#" className="palette__item">
                    <span className="palette__icon">
                      <Icon name={m.icon} size={15} />
                    </span>
                    <span>
                      <strong>{m.label}</strong>
                      <small>{m.group}</small>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Acciones disponibles para {role === "admin" ? "Administrador" : "Usuario municipal"}</h3>
            <ul className="palette__list">
              {actions.map((a) => (
                <li key={a.label}>
                  <a href="#" className="palette__item palette__item--row">
                    <span className="palette__icon palette__icon--accent">
                      <Icon name={a.icon} size={15} />
                    </span>
                    <strong>{a.label}</strong>
                    <small>en {a.where}</small>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Árboles</h3>
            <ul className="palette__list">
              <li>
                <a href="#" className="palette__item palette__item--row">
                  <span className="palette__icon"><Icon name="leaf" size={15} /></span>
                  <strong>A-000124 · Plátano oriental</strong>
                  <small>Plaza Victoria</small>
                </a>
              </li>
              <li>
                <a href="#" className="palette__item palette__item--row">
                  <span className="palette__icon"><Icon name="leaf" size={15} /></span>
                  <strong>A-000206 · Palmera canaria</strong>
                  <small>Av. Brasil · bandejón central</small>
                </a>
              </li>
            </ul>
          </section>
        </div>
      </Glass>
    </div>
  );
}
