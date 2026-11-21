import { lazy, Suspense, useState } from "react";
import type { FichaArbol } from "../../types/fichaArbol";
import type { SecuestroArbol } from "../../types/indicadores";
import { co2Anual, MOTIVO_SECUESTRO, nombreCientifico, num } from "./formato";
import type { Forma, Zona } from "./Arbol3D";

/**
 * Ficha biométrica del árbol (B2), como experiencia visual: el árbol 3D al
 * centro; a la izquierda la captura anual de CO₂ (indicador principal) y el
 * carbono almacenado; a la derecha las medidas y lo que aún no tiene método.
 * Los valores llegan de la API (CC-069 v1 y secuestro v1): el frontend no
 * calcula. Las advertencias metodológicas quedan en desplegables.
 * El árbol es un esquema ilustrativo, no a escala, y se carga aparte (three.js).
 */

const Arbol3D = lazy(() => import("./Arbol3D").then((m) => ({ default: m.Arbol3D })));
/** Nombre común; si falta o el registro dice «Sin identificar» pese a tener especie, el nombre científico. */
const tituloArbol = (comun: string | null, cientifico: string | null) =>
  comun && !(cientifico && comun.trim().toLowerCase() === "sin identificar") ? comun : nombreCientifico(cientifico) || (comun ?? "");
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
  araucaria: "araucaria en candelabro",
  araucaria_piramidal: "araucaria piramidal",
  palmera: "palmera",
};
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
/** «tallo, ramas, ramillas y hojas». */
const lista = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? "—") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

/** Rótulo del origen de una ecuación exploratoria (propuesta experimental incluida). */
function origenExploratorio(confianza: string | undefined, especieEcuacion: string | undefined): { corto: string; largo: string } {
  if (confianza === "generica_urbana") {
    return { corto: "ecuación general urbana", largo: `${especieEcuacion ?? "Ecuación general"} de la Urban Tree Database: no es de la especie ni de su género. No suma a los totales.` };
  }
  if (confianza === "propia_urbana") return { corto: "ecuación de la especie", largo: "Ecuación urbana de la propia especie, aún no revisada por el equipo para SIVU. No suma a los totales." };
  return { corto: "modelo sustituto", largo: `Ecuación de ${nombreCientifico(especieEcuacion)}, otra especie del mismo género. No suma a los totales.` };
}

function Captura({
  s: secuestro,
  variacion,
  onExplorar,
  conCarbonoTotal = false,
}: {
  s: SecuestroArbol | undefined;
  variacion?: SecuestroArbol;
  onExplorar: (v: boolean) => void;
  conCarbonoTotal?: boolean;
}) {
  // Propuesta experimental: sin secuestro leñoso, se muestra la variación anual del carbono aéreo total (con hojas).
  const sinLenoso = !!secuestro && secuestro.tipo !== "simulacion_exploratoria" && secuestro.tipo !== "estimacion_fundamentada";
  const usaVariacion = !!variacion && variacion.tipo === "simulacion_exploratoria" && sinLenoso;
  // Sin ninguna proyección: si la especie tiene carbono directo (motivo distinto de «sin_modelo»), manda su motivo.
  const motivoVariacion =
    sinLenoso && secuestro.motivo === "sin_modelo" && !!variacion && variacion.tipo !== "simulacion_exploratoria" && variacion.tipo !== "estimacion_fundamentada" && variacion.motivo !== "sin_modelo";
  const s = usaVariacion || motivoVariacion ? variacion : secuestro;
  const titulo = usaVariacion || motivoVariacion ? "Variación anual del carbono aéreo total" : "Secuestro anual de CO₂";
  const eventos = { onMouseEnter: () => onExplorar(true), onMouseLeave: () => onExplorar(false), onFocus: () => onExplorar(true), onBlur: () => onExplorar(false) };
  if (!s) return <article className="bio-card bx-captura">Sin datos de captura anual en esta API.</article>;

  if (s.tipo !== "simulacion_exploratoria" && s.tipo !== "estimacion_fundamentada") {
    return (
      <article className="bio-card bx-captura bx-captura--vacia" tabIndex={0} {...eventos}>
        <span className="bx-eyebrow">{titulo}</span>
        <strong className="bx-captura__estado">{s.tipo === "fuera_del_universo" ? "Fuera del cálculo" : "No estimable"}</strong>
        <p className="bx-captura__motivo">{MOTIVO_SECUESTRO[s.motivo] ?? s.detalle}</p>
        <p className="bx-captura__sub">
          {conCarbonoTotal
            ? "La especie tiene un modelo exploratorio de carbono aéreo total, pero todavía no un método de crecimiento aprobado para estimar la captura anual."
            : (s.detalle ?? "Se calcula cuando la especie tenga un modelo de biomasa y el árbol tenga sus datos completos.")}
        </p>
      </article>
    );
  }

  const valores = s.tipo === "simulacion_exploratoria" ? s.por_categoria : [s.valor];
  const max = Math.max(...valores.map((v) => v.co2_kg_anio), 0.1) * 1.15;
  const etiqueta = { lento: "Lento", moderado: "Moderado", rapido: "Rápido" } as const;
  const advertencias = s.advertencias ?? [];

  return (
    <article className="bio-card bx-captura" tabIndex={0} {...eventos}>
      <header className="bx-captura__head">
        <span className="bx-eyebrow">{titulo}</span>
        {usaVariacion ? (
          <span className="bio-tag bio-tag--simulacion">Simulación experimental</span>
        ) : s.tipo === "simulacion_exploratoria" ? (
          <span className="bio-tag bio-tag--simulacion">Simulación exploratoria</span>
        ) : (
          <span className="bio-tag bio-tag--resuelto">Estimación</span>
        )}
        {advertencias.some((t) => t.startsWith("Medición en revisión")) && (
          <span className="bio-tag bio-tag--pendiente" title="La medición vigente debe verificarse en terreno: el resultado no está validado.">
            Medición en revisión
          </span>
        )}
      </header>
      <div className="bx-captura__valor">
        {s.tipo === "simulacion_exploratoria" ? (
          <>
            <b>{co2Anual(s.rango.co2_kg_anio_min)}</b>
            <i>a</i>
            <b>{co2Anual(s.rango.co2_kg_anio_max)}</b>
          </>
        ) : (
          <b>{co2Anual(s.valor.co2_kg_anio)}</b>
        )}
        <span>kg de CO₂ al año</span>
      </div>
      <p className="bx-captura__sub">
        {usaVariacion
          ? "Aumento proyectado del carbono en tronco, ramas y hojas por el crecimiento de un año. Incluye hojas: no se compara ni se suma con el secuestro de la madera. No es la captura fotosintética."
          : s.tipo === "simulacion_exploratoria"
            ? "Aumento proyectado del carbono en la madera por el crecimiento de un año (no es la captura fotosintética). Depende de qué tan rápido crece la especie: mientras no tenga una tasa aprobada, se muestran los tres ritmos posibles."
            : "Aumento proyectado del carbono en la madera por el crecimiento de un año, según la categoría aprobada para la especie."}
      </p>
      <div className="bx-escala" role="img" aria-label={valores.map((v) => `${etiqueta[v.categoria]}: ${co2Anual(v.co2_kg_anio)} kg`).join(", ")}>
        <div className="bx-escala__pista">
          {s.tipo === "simulacion_exploratoria" && (
            <span className="bx-escala__rango" style={{ left: `${(s.rango.co2_kg_anio_min / max) * 100}%`, width: `${((s.rango.co2_kg_anio_max - s.rango.co2_kg_anio_min) / max) * 100}%` }} />
          )}
          {valores.map((v) => (
            <span key={v.categoria} className={`bx-escala__punto is-${v.categoria}`} style={{ left: `${(v.co2_kg_anio / max) * 100}%` }}>
              <em>{co2Anual(v.co2_kg_anio)}</em>
              <small>{etiqueta[v.categoria]}</small>
            </span>
          ))}
        </div>
        <span className="bx-escala__cero">0</span>
      </div>
      <details className="bx-detalle">
        <summary>
          Cómo se calcula{advertencias.length > 0 && <span className="bx-detalle__n">{advertencias.length} avisos</span>}
        </summary>
        {advertencias.length > 0 && (
          <ul className="bx-detalle__avisos">
            {advertencias.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <ul className="bx-detalle__lista">
          {s.supuestos.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="bx-detalle__formula">
          {usaVariacion ? "Variación" : "Secuestro"} = [C(DAP + ΔDAP) − C(DAP)] × 44/12, con ΔDAP = ritmo de crecimiento × factor de luz de copa ({num(s.factores.factor_cle, 2)}) × (1 − muerte
          regresiva) ({num(s.factores.factor_condicion, 2)}).
        </p>
        <p className="bx-detalle__pie">
          Modelo {s.modelo.id} · CLE {s.entradas.cle} · muerte regresiva {s.entradas.muerte_regresiva_pct} %
          {usaVariacion ? " · propuesta experimental" : ""}
        </p>
        <p className="bx-detalle__pie">Ecuación: {s.modelo.fuente}.</p>
        {s.metodo?.crecimiento?.fuente && <p className="bx-detalle__pie">Crecimiento: {s.metodo.crecimiento.fuente}.</p>}
      </details>
    </article>
  );
}

export function FichaBiometrica({ ficha, lugar = null }: { ficha: FichaArbol; lugar?: string | null }) {
  const [zona, setZona] = useState<Zona | null>(null);
  const [captura, setCaptura] = useState(false);
  const a = ficha.arbol;
  const dap = n(a.dap_cm);
  const altura = n(a.altura_total_m);
  const copa = n((a as Record<string, unknown>).diametro_copa_m);
  const area = n(a.area_proyectada_copa_m2);
  const carbono = ficha.estimacion_carbono_aereo_lenoso;
  const cv = carbono?.valor ?? null;
  const exploratorio = (cv?.estado_resultado ?? cv?.modelo.estado) === "exploratorio";
  const origen = !exploratorio
    ? null
    : cv?.tratamiento_multifustal
      ? {
          corto: "multifustal",
          largo: `Multifustal: DAP equivalente de ${num(cv.tratamiento_multifustal.dap_equivalente_cm, 1)} cm por área basal de los fustes, como en i-Tree Eco; su compatibilidad con la ecuación no está demostrada. No suma a los totales.`,
        }
      : origenExploratorio(cv?.modelo.confianza, cv?.modelo.especie_ecuacion);
  // Carbono aéreo total (con hojas): solo cuando la especie no tiene modelo leñoso; nunca se muestran ni suman juntos.
  const tv = cv ? null : (ficha.estimacion_carbono_aereo_total?.valor ?? null);
  // Sin carbono: si la especie tiene carbono directo, se muestra su motivo (p. ej., multifustal) en vez de «sin modelo».
  const total = ficha.estimacion_carbono_aereo_total;
  const detalleSinCarbono =
    carbono?.motivo === "sin_modelo" && total && total.valor === null && total.motivo !== "sin_modelo" ? total.detalle : carbono?.detalle;
  const clase = (a.clase_edad as { etiqueta?: string } | null | undefined)?.etiqueta ?? null;
  const ds = ficha.descriptivos ?? null;
  const forma = formaIlustracion(ficha.sobre_la_especie?.tipo_hoja?.codigo, a.especie_cientifica as string | null);
  const resalta = (z: Zona) => ({
    onMouseEnter: () => setZona(z),
    onMouseLeave: () => setZona(null),
    "data-zona": z,
  });
  const on = (z: Zona) => (zona === z ? "is-zona" : "");

  return (
    <div className={`bx-exp ${zona ? `bx-exp--${zona}` : ""}`}>
      <section className="bx-exp__escena" aria-label="Árbol interactivo">
        <header className="bx-exp__titulo">
          <h2>{tituloArbol(a.nombre_comun as string | null, a.especie_cientifica as string | null)}</h2>
          <p>
            <em>{nombreCientifico(a.especie_cientifica as string | null)}</em> · {a.tree_code as string}
            {lugar ? ` · ${lugar}` : ""}
          </p>
          {clase && <span className="bio-chip">{clase}</span>}
        </header>
        <Suspense fallback={<div className="a3d" aria-busy="true" />}>
          <Arbol3D key={a.id as string} semilla={a.tree_code as string} forma={forma} zona={zona} onZona={setZona} captura={captura || zona === "copa"} />
        </Suspense>
        <span className={`bx-exp__pin bx-exp__pin--copa ${on("copa")}`}>
          <b>Copa</b> {copa !== null ? `${num(copa, 1)} m` : "sin medición"}
          {area !== null && <small>{num(area, 1)} m² de sombra</small>}
        </span>
        <span className={`bx-exp__pin bx-exp__pin--tronco ${on("tronco")}`}>
          <b>Tronco</b> {dap !== null ? `DAP ${num(dap, 1)} cm` : "sin medición"}
          {cv && <small>{num(cv.carbono_kg, 0)} kg C en tronco y ramas</small>}
          {tv && <small>{num(tv.carbono_kg, 1)} kg C aéreos, con hojas</small>}
        </span>
        <span className={`bx-exp__pin bx-exp__pin--raices ${on("raices")}`}>
          <b>Raíces y suelo</b> método pendiente
        </span>
        <p className="bx-exp__pista">Arrastra para girar · toca la copa, el tronco o el suelo</p>
        <span className="bx-exp__nota">Ilustración por grupo morfológico ({NOMBRE_FORMA[forma]}), no a escala: no reconstruye el ejemplar</span>
      </section>

      <div className="bx-exp__izq">
        <Captura s={ficha.secuestro_anual} variacion={ficha.variacion_anual_carbono_aereo_total} onExplorar={setCaptura} conCarbonoTotal={tv !== null} />
        {tv ? (
          <article {...resalta("tronco")} className={`bio-card bx-kpi ${on("tronco")}`}>
            <header className="bx-kpi__head">
              <span className="bx-eyebrow">Carbono aéreo total</span>
              <span className="bio-tag bio-tag--simulacion">Exploratorio</span>
            </header>
            <strong>
              {num(tv.carbono_kg, 1)} <small>kg C</small>
            </strong>
            <span className="bx-kpi__sub">{num(tv.co2e_kg, 1)} kg de CO₂ equivalente almacenado</span>
            <dl className="bx-kpi__comp">
              <div>
                <dt>Incluye</dt>
                <dd>{lista(tv.componente.incluye)}</dd>
              </div>
              <div>
                <dt>Excluye</dt>
                <dd>{lista(tv.componente.excluye)}</dd>
              </div>
            </dl>
            <span className="bx-info" title="Ecuación de la misma especie ajustada en el bosque mediterráneo chileno, no en árboles urbanos. Incluye hojas: no es comparable con el carbono leñoso de otras especies ni suma a los totales.">
              Modelo de la especie, no urbano ⓘ
            </span>
          </article>
        ) : (
        <article {...resalta("tronco")} className={`bio-card bx-kpi ${on("tronco")}`}>
          <span className="bx-eyebrow">Carbono almacenado</span>
          <strong>
            {cv ? num(cv.carbono_kg, 0) : "—"} <small>kg C</small>
          </strong>
          <span className="bx-kpi__sub">{cv ? `${num(cv.co2e_kg, 0)} kg de CO₂ equivalente en madera` : (detalleSinCarbono ?? "Sin estimación")}</span>
          {exploratorio && (
            <span className="bx-info" title={origen?.largo}>
              Exploratorio · {origen?.corto} ⓘ
            </span>
          )}
        </article>
        )}
      </div>

      <aside className="bx-exp__der">
        <article className="bio-card bx-medidas">
          <h3>Medidas del árbol</h3>
          <dl>
            <div {...resalta("tronco")} className={on("tronco")}>
              <dt>Altura</dt>
              <dd>{altura !== null ? `${num(altura, 1)} m` : "—"}</dd>
            </div>
            <div {...resalta("tronco")} className={on("tronco")}>
              <dt>DAP</dt>
              <dd>{dap !== null ? `${num(dap, 1)} cm` : "—"}</dd>
            </div>
            <div {...resalta("copa")} className={on("copa")}>
              <dt>Diámetro de copa</dt>
              <dd>{copa !== null ? `${num(copa, 1)} m` : "—"}</dd>
            </div>
            <div {...resalta("copa")} className={on("copa")}>
              <dt>Área de copa</dt>
              <dd>{area !== null ? `${num(area, 1)} m²` : "—"}</dd>
            </div>
            {ds && (
              <>
                <div {...resalta("tronco")} className={on("tronco")}>
                  <dt>Fustes</dt>
                  <dd>{ds.numero_fustes === null ? "—" : ds.numero_fustes === 1 ? "1 (monofustal)" : `${ds.numero_fustes} (DAP equivalente)`}</dd>
                </div>
                <div {...resalta("tronco")} className={on("tronco")}>
                  <dt>Altura de primera rama</dt>
                  <dd>{ds.altura_primera_rama_m !== null ? `${num(ds.altura_primera_rama_m, 1)} m` : "—"}</dd>
                </div>
                <div {...resalta("copa")} className={on("copa")}>
                  <dt>Base de copa viva</dt>
                  <dd>{ds.altura_base_copa_viva_m !== null ? `${num(ds.altura_base_copa_viva_m, 1)} m` : "—"}</dd>
                </div>
                <div {...resalta("copa")} className={on("copa")} title="Altura total − base de la copa viva, y su proporción sobre la altura total">
                  <dt>Copa viva</dt>
                  <dd>
                    {ds.longitud_copa_viva_m !== null ? `${num(ds.longitud_copa_viva_m, 1)} m · ${num(ds.proporcion_copa_viva_pct, 0)} %` : "—"}
                  </dd>
                </div>
                <div {...resalta("copa")} className={on("copa")} title="Diámetro de copa dividido por la altura total">
                  <dt>Copa / altura</dt>
                  <dd>{ds.relacion_copa_altura !== null ? num(ds.relacion_copa_altura, 2) : "—"}</dd>
                </div>
              </>
            )}
          </dl>
          {ds && (
            <details className="bx-detalle bx-medidas__cond">
              <summary>Condición de copa registrada</summary>
              <dl className="bx-medidas__cond-dl">
                {(
                  [
                    ["Exposición lumínica (CLE)", ds.condicion_copa.cle, ""],
                    ["Muerte regresiva", ds.condicion_copa.muerte_regresiva_pct, " %"],
                    ["Defoliación estimada", ds.condicion_copa.defoliacion_pct, " %"],
                    ["Copa faltante", ds.condicion_copa.copa_faltante_pct, " %"],
                    ["Clorosis", ds.condicion_copa.clorosis_pct, " %"],
                    ["Necrosis", ds.condicion_copa.necrosis_pct, " %"],
                  ] as [string, number | null, string][]
                ).map(([k, v, u]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v === null ? "sin dato" : `${num(v)}${u}`}</dd>
                  </div>
                ))}
                <div>
                  <dt>Vitalidad</dt>
                  <dd>{ds.condicion_copa.vitalidad ? (ds.condicion_copa.vitalidad.etiqueta ?? ds.condicion_copa.vitalidad.codigo) : "sin dato"}</dd>
                </div>
              </dl>
              <p className="bx-detalle__pie">Valores registrados en la evaluación vigente. No es un índice de vitalidad ni de riesgo.</p>
            </details>
          )}
          <p className="bx-medidas__pie">Medición vigente desde {ficha.historial[0]?.vigente_desde ?? "—"}</p>
        </article>
        <article {...resalta("raices")} className={`bio-card bx-prox ${on("raices")}`}>
          <h3>Próximamente</h3>
          <ul>
            <li>Área y biomasa foliar</li>
            <li>Escorrentía evitada</li>
            <li>Proyección de crecimiento</li>
          </ul>
        </article>
        {tv && (
          <details className="bio-card bx-notas">
            <summary>Notas del modelo de carbono</summary>
            <p>{tv.modelo.id} · carbono aéreo total (con hojas), exploratorio para árboles urbanos; no suma a los totales.</p>
            <p className="bx-notas__fuente">
              {tv.modelo.fuente}.{" "}
              <a href={tv.modelo.doi} target="_blank" rel="noreferrer">
                {tv.modelo.doi.replace("https://doi.org/", "doi:")}
              </a>
            </p>
          </details>
        )}
        {cv && (
          <details className="bio-card bx-notas">
            <summary>Notas del modelo de carbono</summary>
            <p>
              {cv.modelo.id}
              {exploratorio ? ` · ${origen?.largo}` : "."}
            </p>
            <p className="bx-notas__fuente">{cv.modelo.fuente}</p>
          </details>
        )}
      </aside>
    </div>
  );
}
