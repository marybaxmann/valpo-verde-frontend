import type React from "react";
import type { FichaArbol } from "../../types/fichaArbol";
import type { Contaminante } from "../../types/indicadores";
import { num } from "./formato";

/**
 * Aportes del árbol (CC-087, 2026-11-24): los aportes del marco de Nowak
 * (2024) en una sola tarjeta, una línea por aporte. Los valores llegan de la
 * API (B2); el frontend no calcula.
 */

const ORDEN: Array<{ p: Contaminante; color: string; etiqueta: string }> = [
  { p: "o3", color: "var(--ap-o3)", etiqueta: "O₃" },
  { p: "pm10", color: "var(--ap-pm)", etiqueta: "PM10" },
  { p: "so2", color: "var(--ap-so2)", etiqueta: "SO₂" },
  { p: "no2", color: "var(--ap-no2)", etiqueta: "NO₂" },
  { p: "co", color: "var(--ap-co)", etiqueta: "CO" },
];

const HORIZONTE = 10;

function Linea({ ico, clase, titulo, children }: { ico: string; clase: string; titulo: string; children: React.ReactNode }) {
  return (
    <li>
      <span className={`bx-aportes__ico ${clase}`} aria-hidden>
        {ico}
      </span>
      <span className="bx-aportes__txt">
        <span>{titulo}</span>
        {children}
      </span>
    </li>
  );
}

export function AportesArbol({ ficha, extra, clase }: { ficha: FichaArbol; extra?: React.HTMLAttributes<HTMLElement>; clase?: string }) {
  const f = ficha.aportes_foliares ?? null;
  const p = ficha.proyeccion_crecimiento ?? null;
  const c = ficha.carbono_integrado?.aereo ?? null;
  const s = ficha.secuestro_anual;
  const conFoliar = f !== null && f.area_foliar_m2 !== null;
  const esc = p?.valor?.escenarios ?? [];
  const en = (i: number) => esc[i]?.dap_cm.find((x) => x.anios === HORIZONTE)?.dap_cm ?? null;
  const dapHoy = p?.valor?.dap_actual_cm ?? null;
  const dapMin = en(0);
  const dapMax = en(esc.length - 1);

  if (ficha.evaluacion_completa_vigente === false) {
    return (
      <article {...extra} className={`bio-card bx-aportes ${clase ?? ""}`}>
        <h3>Aportes del árbol</h3>
        <p className="bx-aportes__vacio">Se estiman cuando el árbol tiene una evaluación completa vigente.</p>
      </article>
    );
  }

  return (
    <article {...extra} className={`bio-card bx-aportes ${clase ?? ""}`}>
      <h3>Aportes del árbol</h3>
      <ul className="bx-aportes__lista">
        <Linea ico="◆" clase="is-carbono" titulo="Carbono almacenado">
          {c ? (
            <b>
              {num(c.carbono_kg, 0)} kg C <small>· {num(c.co2e_kg, 0)} kg CO₂e</small>
            </b>
          ) : (
            <small>{ficha.carbono_integrado?.motivo ?? "Sin estimación."}</small>
          )}
        </Linea>
        <Linea ico="↻" clase="is-carbono" titulo="Secuestro al año">
          {s?.tipo === "estimacion_fundamentada" ? (
            <b>
              {num(s.valor.co2_kg_anio, 1)} kg CO₂ <small>al año</small>
            </b>
          ) : s?.tipo === "simulacion_exploratoria" ? (
            <b>
              {num(s.rango.co2_kg_anio_min, 1)}–{num(s.rango.co2_kg_anio_max, 1)} kg CO₂ <small>al año (según su crecimiento)</small>
            </b>
          ) : (
            <small>{s && "detalle" in s ? s.detalle : "Sin estimación."}</small>
          )}
        </Linea>
        {conFoliar && f.remocion_g && (
          <Linea ico="≋" clase="is-aire" titulo="Aire limpio">
            <b>
              {num(f.remocion_total_g, 0)} g <small>de contaminantes al año</small>
            </b>
            <span className="bx-aportes__pila" role="img" aria-label={ORDEN.map((o) => `${o.etiqueta} ${num(f.remocion_g![o.p], 0)} g`).join(", ")}>
              {ORDEN.map((o) => (
                <span key={o.p} style={{ flexGrow: f.remocion_g![o.p], background: o.color }} title={`${o.etiqueta}: ${num(f.remocion_g![o.p], 0)} g/año`} />
              ))}
            </span>
          </Linea>
        )}
        {conFoliar && f.intercepcion_m3 !== null && (
          <Linea ico="💧" clase="is-agua" titulo="Lluvia retenida">
            <b>
              {num(f.intercepcion_m3 * 1000, 0)} L <small>al año</small>
            </b>
          </Linea>
        )}
        {conFoliar && (
          <Linea ico="❦" clase="is-hoja" titulo="Hojas">
            <b>
              {num(f.area_foliar_m2, 0)} m² <small>de superficie foliar</small>
            </b>
          </Linea>
        )}
        <Linea ico="↗" clase="is-crece" titulo={`Crecimiento en ${HORIZONTE} años`}>
          {p?.valor && dapHoy !== null && dapMin !== null && dapMax !== null ? (
            <b>
              DAP {num(dapHoy, 1)} → {num(dapMin, 1)}–{num(dapMax, 1)} cm
            </b>
          ) : (
            <small>{p?.detalle_motivo ?? "Sin dato."}</small>
          )}
        </Linea>
      </ul>
    </article>
  );
}
