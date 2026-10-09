import { useEffect, useState } from "react";
import type { SpeciesItem } from "../types/tree";

function speciesLabel(sp: SpeciesItem): string {
  return sp.nombre_comun ? `${sp.nombre_cientifico} (${sp.nombre_comun})` : sp.nombre_cientifico;
}

/**
 * Combobox buscable sobre el catálogo real de especies (listSpeciesCatalog).
 * No inventa especies ni contenido: solo filtra, en el cliente, la lista ya
 * recibida del catálogo real por nombre científico o nombre común.
 */
export function SpeciesCombobox({
  species,
  loading,
  error,
  value,
  onChange,
}: {
  species: SpeciesItem[];
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = species.find((sp) => sp.id === value) ?? null;

  // Mientras el usuario no tiene el combobox abierto/escribiendo, el texto
  // visible refleja la especie realmente seleccionada.
  useEffect(() => {
    if (!open) {
      setQuery(selected ? speciesLabel(selected) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, species.length]);

  if (loading) {
    return <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cargando catálogo…</p>;
  }
  if (error) {
    return <p style={{ fontSize: 12, color: "var(--classification-critical)" }}>{error}</p>;
  }
  if (species.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>No hay especies en el catálogo.</p>
    );
  }

  const isShowingSelectedLabel = selected !== null && query === speciesLabel(selected);
  const filtered =
    query.trim() === "" || isShowingSelectedLabel
      ? species
      : species.filter((sp) => {
          const q = query.trim().toLowerCase();
          return (
            sp.nombre_cientifico.toLowerCase().includes(q) ||
            (sp.nombre_comun ?? "").toLowerCase().includes(q)
          );
        });

  function handleSelect(sp: SpeciesItem) {
    onChange(sp.id);
    setQuery(speciesLabel(sp));
    setOpen(false);
  }

  function handleBlur() {
    // Delay corto para que el click en una opción (onMouseDown) se procese
    // antes de cerrar y revertir el texto a la especie realmente seleccionada.
    window.setTimeout(() => {
      setOpen(false);
      setQuery(selected ? speciesLabel(selected) : "");
    }, 120);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        className="sivu-sig-controls-input"
        style={{ width: "100%" }}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Buscar especie por nombre científico o común…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={handleBlur}
        required
      />
      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            zIndex: 30,
            maxHeight: 220,
            overflowY: "auto",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--surface-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {filtered.length === 0 ? (
            <li style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-secondary)" }}>
              Sin coincidencias.
            </li>
          ) : (
            filtered.map((sp) => (
              <li
                key={sp.id}
                role="option"
                aria-selected={sp.id === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(sp);
                }}
                style={{
                  padding: "7px 10px",
                  fontSize: 12.5,
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  background: sp.id === value ? "var(--sivu-primary-surface)" : "transparent",
                }}
              >
                <div style={{ fontStyle: "italic" }}>{sp.nombre_cientifico}</div>
                {sp.nombre_comun && (
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sp.nombre_comun}</div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
