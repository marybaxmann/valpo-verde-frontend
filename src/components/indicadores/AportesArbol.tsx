import type React from "react";
import type { FichaArbol } from "../../types/fichaArbol";
import type { Contaminante } from "../../types/indicadores";
import { num } from "./formato";

/**
 * Aportes del árbol (propuesta experimental, 2026-11-23): área foliar, aire
 * limpio, lluvia retenida y crecimiento proyectado. Compacto: una línea por
 * aporte con una mini figura. Los valores llegan de la API (B2).
 */

const ORDEN: Array<{ p: Contaminante; color: string; etiqueta: string }> = [
  { p: "o3", color: "var(--ap-o3)", etiqueta: "O₃" },
  { p: "pm10", color: "var(--ap-pm)", etiqueta: "PM10" },
  { p: "so2", color: "var(--ap-so2)", etiqueta: "SO₂" },
  { p: "no2", color: "var(--ap-no2)", etiqueta: "NO₂" },
  { p: "co", color: "var(--ap-co)", etiqueta: "CO" },
];

const HORIZONTE = 10;

export function AportesArbol({ ficha, extra, clase }: { ficha: FichaArbol; extra?: React.HTMLAttributes<HTMLElement>; clase?: string }) {
  const f = ficha.aportes_foliares ?? null;
  const p = ficha.proyeccion_crecimiento ?? null;
  const conFoliar = f && f.area_foliar_m2 !== null;
  const esc = p?.valor?.escenarios ?? [];
  const en = (i: number) => esc[i]?.dap_cm.find((x) => x.anios === HORIZONTE)?.dap_cm ?? null;
  const dapHoy = p?.valor?.dap_actual_cm ?? null;
  const dapMin = en(0);
  const dapMax = en(esc.length - 1);

  return (
    <article {...extra} className={`bio-card bx-aportes ${clase ?? ""}`}>
      <header className="bx-aportes__head">
        <h3>Aportes del árbol</h3>
      </header>

      {!f && !p ? (
        <p className="bx-aportes__vacio">Se estiman cuando el árbol tiene una evaluación completa vigente.</p>
      ) : (
        <ul className="bx-aportes__lista">
          <li>
            <span className="bx-aportes__ico is-hoja" aria-hidden>
              ❦
            </span>
            <span className="bx-aportes__txt">
              <span>Área foliar</span>
              {conFoliar ? (
                <b>
                  {num(f!.area_foliar_m2, 0)} m² <small>de hojas · LAI {num(f!.lai, 1)}</small>
                </b>
              ) : (
                <small>{f?.motivo ? motivoFoliar(f.motivo) : "Sin dato."}</small>
              )}
            </span>
          </li>
          {conFoliar && f!.remocion_g && (
            <li>
              <span className="bx-aportes__ico is-aire" aria-hidden>
                ≋
              </span>
              <span className="bx-aportes__txt">
                <span>Aire limpio</span>
                <b>
                  {num(f!.remocion_total_g, 0)} g <small>de contaminantes al año</small>
                </b>
                <span className="bx-aportes__pila" role="img" aria-label={ORDEN.map((o) => `${o.etiqueta} ${num(f!.remocion_g![o.p], 0)} g`).join(", ")}>
                  {ORDEN.map((o) => (
                    <span key={o.p} style={{ flexGrow: f!.remocion_g![o.p], background: o.color }} title={`${o.etiqueta}: ${num(f!.remocion_g![o.p], 0)} g/año`} />
                  ))}
                </span>
              </span>
            </li>
          )}
          {conFoliar && f!.intercepcion_m3 !== null && (
            <li>
              <span className="bx-aportes__ico is-agua" aria-hidden>
                💧
              </span>
              <span className="bx-aportes__txt">
                <span>Lluvia retenida</span>
                <b>
                  {num(f!.intercepcion_m3 * 1000, 0)} L <small>al año</small>
                </b>
                <small>
                  {num(f!.lluvia_sobre_copa_m3 ? (f!.intercepcion_m3 / f!.lluvia_sobre_copa_m3) * 100 : null, 0)} % de la lluvia sobre su copa; no llega al suelo
                </small>
              </span>
            </li>
          )}
          <li>
            <span className="bx-aportes__ico is-crece" aria-hidden>
              ↗
            </span>
            <span className="bx-aportes__txt">
              <span>Crecimiento en {HORIZONTE} años</span>
              {p?.valor && dapHoy !== null && dapMin !== null && dapMax !== null ? (
                <>
                  <b>
                    DAP {num(dapHoy, 1)} → {num(dapMin, 1)}–{num(dapMax, 1)} cm
                  </b>
                  <span className="bx-aportes__rango" aria-hidden>
                    <span className="bx-aportes__hoy" style={{ width: `${(dapHoy / dapMax) * 100}%` }} />
                    <span className="bx-aportes__mas" style={{ left: `${(dapMin / dapMax) * 100}%` }} />
                  </span>
                  <small>escenarios lento a rápido de i-Tree Eco</small>
                </>
              ) : (
                <small>{p?.detalle_motivo ?? "Sin dato."}</small>
              )}
            </span>
          </li>
        </ul>
      )}
      <p className="bx-aportes__pie">Biomasa foliar y escorrentía evitada: pendientes (masa foliar por especie y superficie bajo la copa).</p>
    </article>
  );
}

function motivoFoliar(m: string) {
  const t: Record<string, string> = {
    palmera: "Palmera: la ecuación de copa no se aplica.",
    sin_copa: "El árbol no presenta copa.",
    falta_copa: "Faltan los diámetros de copa.",
    falta_altura_copa: "Falta la altura o la base de copa viva.",
    copa_invalida: "La altura de copa no es válida.",
  };
  return t[m] ?? m;
}
