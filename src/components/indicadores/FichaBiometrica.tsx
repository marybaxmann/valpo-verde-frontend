import { lazy, Suspense, useState } from "react";
import type { FichaArbol } from "../../types/fichaArbol";
import { nombreCientifico, nombreVisible, num, ORIGEN_SIN_DETERMINAR } from "./formato";
import type { Forma, Zona } from "./Arbol3D";
import { AportesArbol } from "./AportesArbol";

/**
 * Ficha biométrica del árbol (B2), versión esencial (2026-11-24): el árbol 3D
 * y, a su lado, las variables básicas (especie, diámetro, altura, copa y
 * condición) y los aportes del árbol en una sola tarjeta (Nowak 2024). Los
 * valores llegan de la API: el frontend no calcula. El árbol es un esquema
 * ilustrativo, no a escala, y se carga aparte (three.js).
 */

const Arbol3D = lazy(() => import("./Arbol3D").then((m) => ({ default: m.Arbol3D })));
/**
 * Grupo morfológico SOLO para la ilustración: tipo de hoja del catálogo y, si
 * la especie no está vinculada, el género. No interviene en ningún cálculo.
 */
function formaIlustracion(tipoHoja: string | null | undefined, especie: string | null | undefined): Forma {
  const e = (especie ?? "").trim().toLowerCase();
  if (tipoHoja === "palmera" || /^(phoenix|washingtonia|syagrus|butia|jubaea|trachycarpus|archontophoenix)\b/.test(e)) return "palmera";
  // Modelo de araucaria solo para el género Araucaria.
  if (/^araucaria (angustifolia|araucana)\b/.test(e)) return "araucaria";
  if (/^araucaria\b/.test(e)) return "araucaria_piramidal";
  return "latifoliada";
}
const NOMBRE_FORMA: Record<Forma, string> = {
  latifoliada: "latifoliada",
  araucaria: "araucaria",
  araucaria_piramidal: "araucaria piramidal",
  palmera: "palmera",
};
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
export function FichaBiometrica({ ficha, lugar = null }: { ficha: FichaArbol; lugar?: string | null }) {
  const [zona, setZona] = useState<Zona | null>(null);
  const a = ficha.arbol;
  const dap = n(a.dap_cm);
  const altura = n(a.altura_total_m);
  const copa = n((a as Record<string, unknown>).diametro_copa_m);
  const area = n(a.area_proyectada_copa_m2);
  const clase = (a.clase_edad as { etiqueta?: string } | null | undefined)?.etiqueta ?? null;
  const ds = ficha.descriptivos ?? null;
  const cond = ds?.condicion_copa ?? null;
  const forma = formaIlustracion(ficha.sobre_la_especie?.tipo_hoja?.codigo, a.especie_cientifica as string | null);
  const resalta = (z: Zona) => ({
    onMouseEnter: () => setZona(z),
    onMouseLeave: () => setZona(null),
    "data-zona": z,
  });
  const on = (z: Zona) => (zona === z ? "is-zona" : "");
  const carbonoKg = ficha.carbono_integrado?.aereo?.carbono_kg ?? null;

  return (
    <div className={`bx-exp bx-exp--esencial ${zona ? `bx-exp--${zona}` : ""}`}>
      <section className="bx-exp__escena" aria-label="Árbol interactivo">
        <header className="bx-exp__titulo">
          <h2>{nombreVisible(a.nombre_comun as string | null, a.especie_cientifica as string | null)}</h2>
          <p>
            <em>{nombreCientifico(a.especie_cientifica as string | null) || ORIGEN_SIN_DETERMINAR}</em> · {a.tree_code as string}
            {lugar ? ` · ${lugar}` : ""}
          </p>
          {clase && <span className="bio-chip">{clase}</span>}
        </header>
        <Suspense fallback={<div className="a3d" aria-busy="true" />}>
          <Arbol3D key={a.id as string} semilla={a.tree_code as string} forma={forma} zona={zona} onZona={setZona} captura={zona === "copa"} />
        </Suspense>
        <span className={`bx-exp__pin bx-exp__pin--copa ${on("copa")}`}>
          <b>Copa</b> {copa !== null ? `${num(copa, 1)} m` : "sin medición"}
          {area !== null && <small>{num(area, 1)} m² de sombra</small>}
        </span>
        <span className={`bx-exp__pin bx-exp__pin--tronco ${on("tronco")}`}>
          <b>Tronco</b> {dap !== null ? `DAP ${num(dap, 1)} cm` : "sin medición"}
          {carbonoKg !== null && <small>{num(carbonoKg, 0)} kg C almacenados</small>}
        </span>
        <p className="bx-exp__pista">Arrastra para girar · toca la copa o el tronco</p>
        <span className="bx-exp__nota">Ilustración por grupo morfológico ({NOMBRE_FORMA[forma]}), no a escala</span>
      </section>

      <aside className="bx-exp__der">
        <article className="bio-card bx-medidas">
          <h3>Variables del árbol</h3>
          <dl>
            <div {...resalta("tronco")} className={on("tronco")}>
              <dt>Diámetro (DAP)</dt>
              <dd>{dap !== null ? `${num(dap, 1)} cm` : "—"}</dd>
            </div>
            <div {...resalta("tronco")} className={on("tronco")}>
              <dt>Altura</dt>
              <dd>{altura !== null ? `${num(altura, 1)} m` : "—"}</dd>
            </div>
            <div {...resalta("copa")} className={on("copa")}>
              <dt>Copa</dt>
              <dd>{copa !== null ? `${num(copa, 1)} m · ${num(area, 0)} m²` : "—"}</dd>
            </div>
            <div {...resalta("copa")} className={on("copa")} title="Copa faltante y muerte regresiva registradas en la evaluación vigente">
              <dt>Condición de copa</dt>
              <dd>
                {cond && (cond.copa_faltante_pct !== null || cond.muerte_regresiva_pct !== null)
                  ? `${num(cond.copa_faltante_pct ?? 0)} % faltante · ${num(cond.muerte_regresiva_pct ?? 0)} % seca`
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="bx-medidas__pie">Medición vigente desde {ficha.historial[0]?.vigente_desde ?? "—"}</p>
        </article>
        <AportesArbol ficha={ficha} extra={{ ...resalta("copa") }} clase={on("copa")} />
      </aside>
    </div>
  );
}
