import { useState } from "react";
import type { IndicadoresProyecto } from "../../types/indicadores";
import { num } from "./formato";

/**
 * Resumen del arbolado (2026-11-23): cada indicador se da vuelta al tocarlo
 * y muestra su definición breve. Solo presenta valores de la API.
 */

type Clave = "presentes" | "riqueza" | "shannon" | "densidad" | "diametro" | "area" | "cobertura";

/** Definición breve de cada indicador (hoja INDICES; la cobertura arbórea es propuesta experimental). */
const DEFINICION: Record<Clave, string> = {
  presentes: "Árboles en pie del proyecto; cada árbol cuenta una vez.",
  riqueza: "Número de especies distintas entre los árboles presentes.",
  shannon: "Diversidad según cuántas especies hay y qué tan pareja es su abundancia.",
  densidad: "Árboles presentes por hectárea del sector.",
  diametro: "Ancho promedio de las copas de los árboles evaluados.",
  area: "Superficie de sombra que proyectan las copas sobre el suelo.",
  cobertura: "Porcentaje del sector cubierto por copas vistas desde arriba.",
};

export function ResumenArbolado({ d }: { d: IndicadoresProyecto }) {
  const [abierto, setAbierto] = useState<Clave | null>(null);
  const copa = d.diametro_medio_copa;
  const area = d.area_proyectada_copa;
  const ha = d.densidad_arborea.superficie_m2 ? d.densidad_arborea.superficie_m2 / 10000 : null;
  const cob = d.cobertura_arborea;
  const evaluados = d.cobertura.arboles_con_evaluacion_valida;

  const kpis: Array<{ clave: Clave; etiqueta: string; valor: string; unidad?: string; nota: string }> = [
    { clave: "presentes", etiqueta: "Árboles presentes", valor: num(d.numero_total_arboles.valor), nota: evaluados !== undefined ? `${num(evaluados)} con evaluación vigente` : "en el inventario" },
    {
      clave: "riqueza",
      etiqueta: "Riqueza de especies",
      valor: num(d.riqueza_especies.valor),
      nota: d.riqueza_especies.n_no_identificados > 0 ? `más ${num(d.riqueza_especies.n_no_identificados)} árboles sin especie` : "todas identificadas",
    },
    { clave: "shannon", etiqueta: "Diversidad (Shannon)", valor: num(d.diversidad_shannon.valor, 2), nota: `con ${num(d.diversidad_shannon.n_identificados)} árboles identificados` },
    {
      clave: "densidad",
      etiqueta: "Densidad arbórea",
      valor: num(d.densidad_arborea.valor, 1),
      unidad: "árb/ha",
      nota: d.densidad_arborea.valor === null ? (d.densidad_arborea.motivo ?? "sin superficie") : `sobre ${num(ha, 2)} ha del sector`,
    },
    { clave: "diametro", etiqueta: "Diámetro medio de copa", valor: num(copa.valor, 1), unidad: "m", nota: `${num(copa.n_validos)} árboles con copa medida` },
    { clave: "area", etiqueta: "Área de copa", valor: num(area.total_m2, 0), unidad: "m²", nota: `suma de ${num(area.n_con_area)} árboles` },
    cob
      ? { clave: "cobertura", etiqueta: "Cobertura arbórea", valor: num(cob.valor, 2), unidad: "%", nota: "copas superpuestas contadas una vez" }
      : {
          clave: "cobertura",
          etiqueta: "Cobertura de copa",
          valor: num(d.cobertura_copa?.valor, 2),
          unidad: "%",
          nota: d.cobertura_copa?.valor == null ? (d.cobertura_copa?.motivo ?? "sin dato") : "área de copa sobre el sector",
        },
  ];

  return (
    <div className="bio-ckpis ra-kpis">
      {kpis.map((k, i) => {
        const on = abierto === k.clave;
        return (
          <button
            key={k.clave}
            type="button"
            aria-pressed={on}
            aria-label={`${k.etiqueta}: ${k.valor}${k.unidad ? ` ${k.unidad}` : ""}. ${on ? DEFINICION[k.clave] : "Ver qué significa"}`}
            className={`bio-card bio-ckpi ra-kpi ${on ? "is-on" : ""}`}
            style={{ ["--i" as string]: i }}
            onClick={() => setAbierto(on ? null : k.clave)}
          >
            <span className="ra-kpi__cara ra-kpi__frente" aria-hidden={on}>
              <span className="bio-ckpi__lbl">{k.etiqueta}</span>
              <span className="bio-ckpi__val">
                {k.valor}
                {k.unidad && k.valor !== "—" && <small>{k.unidad}</small>}
              </span>
              <span className="bio-ckpi__note">{k.nota}</span>
            </span>
            <span className="ra-kpi__cara ra-kpi__dorso" aria-hidden={!on}>
              <span className="bio-ckpi__lbl">{k.etiqueta}</span>
              <span className="ra-kpi__def">{DEFINICION[k.clave]}</span>
            </span>
            <span className="ra-kpi__icono" aria-hidden>
              {on ? "×" : "?"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
