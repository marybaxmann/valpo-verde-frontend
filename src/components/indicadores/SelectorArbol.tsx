import { useEffect, useMemo, useRef, useState } from "react";
import { ESPECIE_NO_IDENTIFICADA, nombreCientifico, num, ORIGEN_SIN_DETERMINAR } from "./formato";

/**
 * Selector compacto de árboles de la ficha biométrica: busca por nombre común,
 * nombre científico o código, y muestra el código y la ubicación para
 * distinguir ejemplares de la misma especie. Las flechas cambian de árbol.
 */

export interface ArbolLista {
  id: string;
  codigo: string;
  comun: string | null;
  cientifico: string | null;
  lugar: string | null;
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function SelectorArbol({ arboles, sel, onSel }: { arboles: ArbolLista[]; sel: string | null; onSel: (id: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const actual = arboles.find((a) => a.id === sel) ?? null;
  const idx = arboles.findIndex((a) => a.id === sel);

  const filtrados = useMemo(() => {
    const t = sinTildes(q.trim());
    if (!t) return arboles;
    return arboles.filter((a) => sinTildes(`${a.comun ?? ""} ${a.cientifico ?? ESPECIE_NO_IDENTIFICADA} ${a.codigo} ${a.lugar ?? ""}`).includes(t));
  }, [q, arboles]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const elegir = (id: string) => {
    onSel(id);
    setAbierto(false);
    setQ("");
  };
  const paso = (d: number) => arboles.length && onSel(arboles[(idx + d + arboles.length) % arboles.length].id);

  return (
    <div className="bx-sel" ref={caja}>
      <button type="button" className="bx-sel__flecha" aria-label="Árbol anterior" onClick={() => paso(-1)}>
        ‹
      </button>
      <button type="button" className="bx-sel__actual" aria-haspopup="listbox" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <span className="bx-sel__lupa" aria-hidden="true">⌕</span>
        {actual ? (
          <span className="bx-sel__txt">
            <strong>{actual.cientifico ? (actual.comun ?? nombreCientifico(actual.cientifico)) : ESPECIE_NO_IDENTIFICADA}</strong>
            <small>
              {actual.codigo}
              {actual.lugar ? ` · ${actual.lugar}` : ""}
            </small>
          </span>
        ) : (
          <span className="bx-sel__txt">
            <strong>Elegir árbol</strong>
          </span>
        )}
        <span className="bx-sel__pos">
          {idx + 1}/{arboles.length}
        </span>
      </button>
      <button type="button" className="bx-sel__flecha" aria-label="Árbol siguiente" onClick={() => paso(1)}>
        ›
      </button>

      {abierto && (
        <div className="bx-sel__pop" role="dialog" aria-label="Buscar árbol">
          <input
            autoFocus
            className="bx-sel__buscar"
            placeholder="Buscar por nombre común, científico o código"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActivo(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActivo((v) => Math.min(v + 1, filtrados.length - 1));
              if (e.key === "ArrowUp") setActivo((v) => Math.max(v - 1, 0));
              if (e.key === "Enter" && filtrados[activo]) elegir(filtrados[activo].id);
              if (e.key === "Escape") setAbierto(false);
            }}
          />
          <ul role="listbox" className="bx-sel__lista">
            {filtrados.length === 0 && <li className="bx-sel__vacio">Ningún árbol coincide.</li>}
            {filtrados.map((a, i) => (
              <li
                key={a.id}
                role="option"
                aria-selected={a.id === sel}
                className={`${i === activo ? "is-activo" : ""} ${a.id === sel ? "is-sel" : ""}`}
                onMouseEnter={() => setActivo(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(a.id);
                }}
              >
                <span className="bx-sel__nom">
                  <strong>{a.cientifico ? (a.comun ?? "Sin nombre común") : ESPECIE_NO_IDENTIFICADA}</strong>
                  <em>{nombreCientifico(a.cientifico) || ORIGEN_SIN_DETERMINAR}</em>
                </span>
                <span className="bx-sel__cod">
                  <b>{a.codigo}</b>
                  {a.lugar && <small>{a.lugar}</small>}
                </span>
              </li>
            ))}
          </ul>
          <p className="bx-sel__pie">{num(filtrados.length)} de {num(arboles.length)} árboles con evaluación vigente</p>
        </div>
      )}
    </div>
  );
}
