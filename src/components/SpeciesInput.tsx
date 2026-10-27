import { useEffect, useId, useState } from "react";
import { buscarEspeciesCatalogo } from "../api/species";

/**
 * Nombre científico con sugerencias del catálogo (CC-053 punto 2): el
 * Inspector elige de la lista o escribe una especie nueva, que el backend
 * incorpora al finalizar. Si la búsqueda falla, el campo sigue siendo
 * texto libre y se avisa.
 */
export function SpeciesInput({
  id,
  projectId,
  value,
  onChange,
  disabled,
}: {
  id: string;
  projectId: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const listId = useId();
  const q = value.trim();
  const [sugerencias, setSugerencias] = useState<{ q: string; nombres: string[] } | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  useEffect(() => {
    if (disabled || q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      buscarEspeciesCatalogo(projectId, q)
        .then((data) => {
          if (cancelled) return;
          setSugerencias({ q, nombres: data.map((e) => e.especie_cientifica) });
          setFallo(null);
        })
        .catch(() => {
          if (!cancelled) setFallo(q);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [projectId, q, disabled]);

  const nombres = sugerencias?.q === q ? sugerencias.nombres : [];
  const enCatalogo = nombres.some((n) => n.toLowerCase() === q.toLowerCase());

  return (
    <>
      <input
        id={id}
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={listId}>
        {nombres.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {!disabled && sugerencias?.q === q && q.length >= 2 && (
        <small className="sivu-insp-field__hint">
          {enCatalogo
            ? "Especie del catálogo."
            : nombres.length > 0
              ? `${nombres.length} coincidencia(s) en el catálogo; elige una o deja el nombre escrito.`
              : "No está en el catálogo: se incorporará al finalizar la inspección."}
        </small>
      )}
      {!disabled && fallo === q && <small className="sivu-insp-field__error">No se pudo consultar el catálogo de especies.</small>}
    </>
  );
}
