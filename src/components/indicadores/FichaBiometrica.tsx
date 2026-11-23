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

function Captura({ s, onExplorar }: { s: SecuestroArbol | undefined; onExplorar: (v: boolean) => void }) {
  const eventos = { onMouseEnter: () => onExplorar(true), onMouseLeave: () => onExplorar(false), onFocus: () => onExplorar(true), onBlur: () => onExplorar(false) };
  if (!s) return <article className="bio-card bx-captura">Sin datos de captura anual en esta API.</article>;

  if (s.tipo !== "simulacion_exploratoria" && s.tipo !== "estimacion_fundamentada") {
    return (
      <article className="bio-card bx-captura bx-captura--vacia" tabIndex={0} {...eventos}>
        <span className="bx-eyebrow">Captura anual de CO₂</span>
        <strong className="bx-captura__estado">No estimable</strong>
        <p className="bx-captura__motivo">{MOTIVO_SECUESTRO[s.motivo] ?? s.detalle}</p>
        <p className="bx-captura__sub">Se calcula cuando la especie tenga un modelo de biomasa y el árbol tenga sus datos completos.</p>
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
        <span className="bx-eyebrow">Captura anual de CO₂</span>
        {s.tipo === "simulacion_exploratoria" ? (
          <span className="bio-tag bio-tag--simulacion">Simulación exploratoria</span>
        ) : (
          <span className="bio-tag bio-tag--resuelto">Estimación</span>
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
        {s.tipo === "simulacion_exploratoria"
          ? "Depende de qué tan rápido crece la especie. Mientras no tenga una tasa aprobada, se muestran los tres ritmos posibles."
          : "Según la categoría de crecimiento aprobada para la especie."}
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
        <p className="bx-detalle__pie">
          Modelo {s.modelo.id} · CLE {s.entradas.cle} · muerte regresiva {s.entradas.muerte_regresiva_pct} %
        </p>
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
  const exploratorio = cv?.modelo.estado === "exploratorio";
  const clase = (a.clase_edad as { etiqueta?: string } | null | undefined)?.etiqueta ?? null;
  const resalta = (z: Zona) => ({
    onMouseEnter: () => setZona(z),
    onMouseLeave: () => setZona(null),
    "data-zona": z,
  });
  const on = (z: Zona) => (zona === z ? "is-zona" : "");
  const forma = formaIlustracion(ficha.sobre_la_especie?.tipo_hoja?.codigo, a.especie_cientifica as string | null);

  return (
    <div className={`bx-exp ${zona ? `bx-exp--${zona}` : ""}`}>
      <section className="bx-exp__escena" aria-label="Árbol interactivo">
        <header className="bx-exp__titulo">
          <h2>{(a.nombre_comun as string | null) ?? nombreCientifico(a.especie_cientifica as string | null)}</h2>
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
          {cv && <small>{num(cv.carbono_kg, 0)} kg C almacenados</small>}
        </span>
        <span className={`bx-exp__pin bx-exp__pin--raices ${on("raices")}`}>
          <b>Raíces y suelo</b> método pendiente
        </span>
        <p className="bx-exp__pista">Arrastra para girar · toca la copa, el tronco o el suelo</p>
        <span className="bx-exp__nota">Ilustración por grupo morfológico ({NOMBRE_FORMA[forma]}), no a escala: no reconstruye el ejemplar</span>
      </section>

      <div className="bx-exp__izq">
        <Captura s={ficha.secuestro_anual} onExplorar={setCaptura} />
        <article {...resalta("tronco")} className={`bio-card bx-kpi ${on("tronco")}`}>
          <span className="bx-eyebrow">Carbono almacenado</span>
          <strong>
            {cv ? num(cv.carbono_kg, 0) : "—"} <small>kg C</small>
          </strong>
          <span className="bx-kpi__sub">{cv ? `${num(cv.co2e_kg, 0)} kg de CO₂ equivalente en madera` : (carbono?.detalle ?? "Sin estimación")}</span>
          {exploratorio && (
            <span className="bx-info" title={`Ecuación de ${nombreCientifico(cv?.modelo.especie_ecuacion)}, otra especie del mismo género. No suma a los totales.`}>
              Exploratorio · modelo sustituto ⓘ
            </span>
          )}
        </article>
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
          </dl>
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
        {cv && (
          <details className="bio-card bx-notas">
            <summary>Notas del modelo de carbono</summary>
            <p>
              {cv.modelo.id}
              {exploratorio ? ` · ecuación de ${nombreCientifico(cv.modelo.especie_ecuacion)}, otra especie del mismo género; no suma a los totales.` : "."}
            </p>
            <p className="bx-notas__fuente">{cv.modelo.fuente}</p>
          </details>
        )}
      </aside>
    </div>
  );
}
