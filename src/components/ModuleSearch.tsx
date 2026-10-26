import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, type IconName } from "./Icons";
import { NAV_GROUPS } from "../lib/navigation";

interface Entry {
  to: string;
  label: string;
  hint: string;
  icon: IconName;
}

/** Sin tildes ni mayúsculas, para comparar lo que se escribe con los nombres. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Buscador (Ctrl K) de la barra superior (Fase 7, Paso 2): por ahora solo
 * lleva a los módulos del proyecto y a su ficha. La búsqueda de árboles
 * espera el listado de árboles de la API de la Fase 6 (B1 en
 * docs/propuestas-cc/pendientes-backend.md).
 */
export function ModuleSearch({
  projectBase,
  projectsPath,
  onClose,
}: {
  projectBase: string;
  projectsPath: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const entries = useMemo<Entry[]>(
    () => [
      ...NAV_GROUPS.flatMap((g) =>
        g.modules.map((m) => ({ to: `${projectBase}/${m.path}`, label: m.label, hint: `${g.label} · ${m.hint}`, icon: m.icon }))
      ),
      { to: projectBase, label: "Ficha del proyecto", hint: "Proyecto · estado, sector y fechas", icon: "list" },
      { to: projectsPath, label: "Cambiar de proyecto", hint: "Proyecto · lista de proyectos", icon: "arrow-left" },
    ],
    [projectBase, projectsPath]
  );

  const q = normalize(query.trim());
  const results = q ? entries.filter((e) => normalize(`${e.label} ${e.hint}`).includes(q)) : entries;
  const selected = Math.min(index, Math.max(results.length - 1, 0));

  function go(entry: Entry | undefined) {
    if (!entry) return;
    onClose();
    navigate(entry.to);
  }

  return (
    <div className="sivu-search-overlay" onPointerDown={onClose}>
      <div
        className="sivu-search"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar en SIVU"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="sivu-search__input">
          <Icon name="search" size={16} />
          <input
            autoFocus
            value={query}
            placeholder="Buscar módulo"
            aria-label="Buscar módulo"
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex(Math.min(selected + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex(Math.max(selected - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[selected]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        {results.length === 0 ? (
          <p className="sivu-search__empty">Ningún módulo coincide con «{query}».</p>
        ) : (
          <ul className="sivu-search__list" role="listbox" aria-label="Módulos">
            {results.map((e, i) => (
              <li key={e.to} role="option" aria-selected={i === selected}>
                <button
                  type="button"
                  className={`sivu-search__item ${i === selected ? "is-selected" : ""}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(e)}
                >
                  <span className="sivu-dd__icon"><Icon name={e.icon} size={15} /></span>
                  <span className="sivu-dd__text">
                    <strong>{e.label}</strong>
                    <small>{e.hint}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="sivu-search__note">La búsqueda de árboles llegará cuando la API entregue el listado de árboles.</p>
      </div>
    </div>
  );
}
