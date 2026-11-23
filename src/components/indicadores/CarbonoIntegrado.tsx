import { useMemo, useState } from "react";
import type { CarbonoIntegrado, ComponenteCarbonoIntegrado } from "../../types/indicadores";
import { masa, nombreCientifico, num } from "./formato";

/**
 * Carbono almacenado del Piloto con el mejor modelo por árbol (propuesta
 * experimental, Valej 2026-11-22). Solo representa lo que entrega la API:
 * aéreo y total separados, aprobados y exploratorios separados, con el modelo,
 * la fuente y las advertencias de cada árbol. No es captura anual.
 */
const COMPONENTE: Record<ComponenteCarbonoIntegrado["componente"], string> = {
  aerea_lenosa: "aéreo leñoso (tronco y ramas)",
  aerea_total: "aéreo con hojas",
  total: "total con raíces",
};
const ESTADO: Record<string, string> = { aprobado: "Aprobado", exploratorio: "Exploratorio", no_estimable: "No estimable" };

function Celda({ c }: { c: ComponenteCarbonoIntegrado | null }) {
  if (!c) return <td className="bci__vacio">—</td>;
  return (
    <td>
      <b>{num(c.carbono_kg, 1)}</b> kg C
      <small>
        {COMPONENTE[c.componente]} · <span title={c.modelo.fuente}>{c.modelo.id}</span>
      </small>
    </td>
  );
}

export function CarbonoIntegradoPanel({ d }: { d: CarbonoIntegrado }) {
  const [filtro, setFiltro] = useState<"todos" | "aprobado" | "exploratorio" | "no_estimable">("todos");
  const filas = useMemo(() => d.arboles.filter((a) => filtro === "todos" || a.estado === filtro), [d.arboles, filtro]);
  const aereo = masa(d.aereo.carbono_kg / 1000);
  const co2 = masa(d.aereo.co2e_kg / 1000);
  const total = masa(d.total.carbono_kg / 1000);
  return (
    <section className="bio-card bci" aria-label="Carbono almacenado por árbol">
      <header className="bio-panel__head">
        <h2>Carbono almacenado por árbol</h2>
        <span className="bio-tag bio-tag--pendiente">Propuesta experimental</span>
      </header>
      <div className="bci__kpis">
        <div>
          <span>Con estimación</span>
          <b>
            {num(d.con_estimacion)} <small>de {num(d.arboles_presentes)}</small>
          </b>
          <small>
            {num(d.aprobados)} aprobados · {num(d.exploratorios)} exploratorios
          </small>
        </div>
        <div>
          <span>Carbono aéreo</span>
          <b>
            {aereo.valor} <small>{aereo.unidad} C</small>
          </b>
          <small>
            {num(d.aereo.arboles)} árboles · aprobado {num(d.aereo.carbono_kg_aprobado, 0)} kg
          </small>
        </div>
        <div>
          <span>CO₂ equivalente (aéreo)</span>
          <b>
            {co2.valor} <small>{co2.unidad} CO₂e</small>
          </b>
          <small>carbono almacenado × 44/12</small>
        </div>
        <div>
          <span>Carbono total con raíces</span>
          <b>
            {total.valor} <small>{total.unidad} C</small>
          </b>
          <small>{num(d.total.arboles)} árboles con modelo de árbol completo</small>
        </div>
      </div>
      <p className="bio-panel__foot">
        Aéreo: {num(d.aereo.por_componente.aerea_lenosa.arboles)} árboles solo tronco y ramas y{" "}
        {num(d.aereo.por_componente.aerea_total.arboles)} con hojas. El total con raíces es otro conjunto y no se suma al aéreo. Los
        exploratorios no suman a los indicadores oficiales.
      </p>
      <div className="bci__filtros" role="group" aria-label="Filtrar por estado">
        {(["todos", "aprobado", "exploratorio", "no_estimable"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : ESTADO[f]} ({f === "todos" ? d.arboles.length : d.arboles.filter((a) => a.estado === f).length})
          </button>
        ))}
      </div>
      <div className="bci__tabla">
        <table>
          <thead>
            <tr>
              <th>Árbol</th>
              <th>Especie</th>
              <th>Estado</th>
              <th>Carbono aéreo</th>
              <th>Carbono total</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((a) => (
              <tr key={a.tree_id} className={`is-${a.estado}`}>
                <td className="bci__cod">{a.tree_code}</td>
                <td>
                  <em>{a.especie ? nombreCientifico(a.especie) : "Especie no identificada"}</em>
                </td>
                <td>
                  <span className={`bci__estado is-${a.estado}`}>{ESTADO[a.estado]}</span>
                </td>
                <Celda c={a.aereo} />
                <Celda c={a.total} />
                <td className="bci__obs">
                  {a.motivo ??
                    (a.comparacion.length > 0
                      ? `Comparación: ${a.comparacion.map((c) => `${c.modelo.id} ${num(c.carbono_kg, 1)} kg C`).join("; ")}`
                      : "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
