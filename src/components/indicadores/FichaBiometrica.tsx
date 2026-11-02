import type { FichaArbol } from "../../types/fichaArbol";
import type { CodigoEtiqueta } from "../../types/diagnostico";
import { fechaChile } from "../../lib/dates";
import { num, MOTIVO_CARBONO } from "./formato";

/**
 * Ficha biométrica del árbol (maqueta «Ficha biométrica del árbol»), con
 * B2: medición vigente, área proyectada de copa (INDICES fila 13) y
 * carbono aéreo leñoso del árbol (CC-069 v1). Área y biomasa foliar,
 * escorrentía, captura anual y proyección de crecimiento no tienen método
 * aprobado (CC-016: filas «Pendiente»): se muestran sin número.
 */

const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function Fila({ etiqueta, valor, pendiente }: { etiqueta: string; valor: string; pendiente?: boolean }) {
  return (
    <div className={`bio-fila ${pendiente ? "bio-fila--pendiente" : ""}`}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

/** Esquema decorativo del árbol (no a escala). */
function Arbol() {
  return (
    <svg viewBox="0 0 320 300" className="bio-tree" aria-hidden="true">
      <defs>
        <radialGradient id="bio-crown" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="var(--bio-crown-hi)" />
          <stop offset="1" stopColor="var(--bio-crown-lo)" />
        </radialGradient>
        <radialGradient id="bio-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0" stopColor="var(--bio-glow)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="130" rx="150" ry="125" fill="url(#bio-glow)" />
      <path className="bio-tree__roots" d="M60 262 C110 248 130 246 160 246 C190 246 210 248 260 262 M128 248 C120 268 112 280 100 292 M192 248 C200 268 208 280 220 292 M160 248 V284" />
      <rect className="bio-tree__trunk" x="146" y="168" width="28" height="82" rx="6" />
      <rect className="bio-tree__core" x="154" y="190" width="12" height="40" rx="4" />
      <g className="bio-tree__crown">
        <circle cx="104" cy="128" r="54" fill="url(#bio-crown)" />
        <circle cx="216" cy="122" r="56" fill="url(#bio-crown)" />
        <circle cx="160" cy="80" r="62" fill="url(#bio-crown)" />
        <circle cx="160" cy="140" r="56" fill="url(#bio-crown)" />
      </g>
      {[
        [40, 110],
        [282, 96],
        [70, 210],
        [258, 214],
        [120, 30],
        [214, 36],
      ].map(([x, y], i) => (
        <circle key={i} className="bio-tree__spark" cx={x} cy={y} r="2.6" style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
    </svg>
  );
}

export function FichaBiometrica({ ficha }: { ficha: FichaArbol }) {
  const a = ficha.arbol;
  const dap = n(a.dap_cm);
  const altura = n(a.altura_total_m);
  const ns = n(a.diametro_copa_ns_m);
  const eo = n(a.diametro_copa_eo_m);
  const area = n(a.area_proyectada_copa_m2);
  const clase = (a.clase_edad as CodigoEtiqueta | null | undefined)?.etiqueta ?? null;
  const vigenteDesde = ficha.historial[0]?.vigente_desde ?? null;
  const carbono = ficha.estimacion_carbono_aereo_lenoso;
  const evaluado = ficha.evaluacion_completa_vigente;
  const motivoArea =
    evaluado === false ? "sin evaluación completa vigente" : a.copa_no_presenta === true ? "no presenta copa" : "sin medición de copa";

  return (
    <div className="bio-ficha">
      <article className="bio-card bio-ficha__stage">
        <header className="bio-ficha__id">
          <div>
            <code>{a.tree_code}</code>
            <h2>{a.nombre_comun ?? "Árbol sin nombre común"}</h2>
            <p>{a.especie_cientifica ? <em>{a.especie_cientifica}</em> : "Especie sin identificar"}</p>
          </div>
          <span className="bio-pill">
            <i />
            {vigenteDesde ? `Vigente desde ${fechaChile(vigenteDesde)}` : "Medición vigente"}
          </span>
        </header>

        <div className="bio-ficha__visual">
          <Arbol />

          <section className="bio-callout bio-callout--copa">
            <h3>Copa</h3>
            <Fila etiqueta="Área proyectada" valor={area !== null ? `${num(area, 1)} m²` : "—"} />
            {area === null && <span className="bio-callout__motivo">{motivoArea}</span>}
            <Fila etiqueta="Área foliar" valor="Método pendiente" pendiente />
            <Fila etiqueta="Biomasa foliar" valor="Método pendiente" pendiente />
          </section>

          <section className="bio-callout bio-callout--tronco">
            <h3>Tronco · depósito de carbono</h3>
            <Fila etiqueta="DAP" valor={dap !== null ? `${num(dap, 1)} cm` : "—"} />
            {carbono === undefined ? (
              <Fila etiqueta="Carbono almacenado" valor="Pendiente de publicar" pendiente />
            ) : carbono.valor ? (
              <>
                <Fila etiqueta="Carbono almacenado" valor={`${num(carbono.valor.carbono_kg, 0)} kg C`} />
                <Fila etiqueta="CO₂ equivalente" valor={`${num(carbono.valor.co2e_kg, 0)} kg`} />
              </>
            ) : (
              <>
                <Fila etiqueta="Carbono almacenado" valor="Sin estimación" />
                <span className="bio-callout__motivo">{MOTIVO_CARBONO[carbono.motivo] ?? carbono.detalle}</span>
              </>
            )}
          </section>

          <section className="bio-callout bio-callout--raices">
            <h3>Raíces y suelo</h3>
            <Fila etiqueta="Escorrentía evitada" valor="Método pendiente" pendiente />
          </section>

          <ul className="bio-legend" aria-label="Leyenda">
            <li>
              <i className="bio-legend__dot bio-legend__dot--ok" /> Medido o calculado
            </li>
            <li>
              <i className="bio-legend__dot bio-legend__dot--pend" /> Método pendiente
            </li>
          </ul>
        </div>
      </article>

      <aside className="bio-ficha__side">
        <article className={`bio-card bio-co2 ${carbono?.valor ? "" : "bio-co2--muted"}`}>
          <span className="bio-co2__lbl">CO₂ equivalente almacenado</span>
          <span className="bio-co2__val">
            {carbono?.valor ? num(carbono.valor.co2e_kg, 0) : "—"}
            {carbono?.valor && <small>kg CO₂</small>}
          </span>
          <span className="bio-co2__sub">
            {carbono === undefined
              ? "La estimación por árbol (CC-069) aún no está publicada en la API."
              : carbono.valor
                ? `Carbono aéreo leñoso ${num(carbono.valor.carbono_kg, 0)} kg C · modelo ${carbono.valor.modelo.id}`
                : carbono.detalle}
          </span>
          <span className="bio-tag bio-tag--pendiente">Captura anual: método en definición</span>
        </article>

        <article className="bio-card bio-crece">
          <header className="bio-panel__head">
            <h2>Si este árbol crece</h2>
            <span className="bio-tag bio-tag--pendiente">Próximamente</span>
          </header>
          <div className="bio-crece__track" aria-hidden="true">
            <i />
          </div>
          <p className="bio-panel__sub">La proyección de crecimiento todavía no tiene un método aprobado en la hoja INDICES.</p>
          <div className="bio-crece__tiles">
            <div>
              <span>Carbono acumulado hoy</span>
              <strong>
                {carbono?.valor ? num(carbono.valor.carbono_kg, 0) : "—"} <small>kg C</small>
              </strong>
            </div>
            <div>
              <span>CO₂ equivalente hoy</span>
              <strong>
                {carbono?.valor ? num(carbono.valor.co2e_kg, 0) : "—"} <small>kg</small>
              </strong>
            </div>
          </div>
        </article>

        <article className="bio-card bio-medicion">
          <h2>Medición vigente</h2>
          <Fila etiqueta="Altura total" valor={altura !== null ? `${num(altura, 1)} m` : "—"} />
          <Fila etiqueta="DAP" valor={dap !== null ? `${num(dap, 1)} cm` : "—"} />
          <Fila etiqueta="Copa N-S / E-O" valor={ns !== null || eo !== null ? `${num(ns, 1)} / ${num(eo, 1)} m` : a.copa_no_presenta === true ? "No presenta" : "—"} />
          <Fila etiqueta="Clase de edad" valor={clase ?? "—"} />
          {evaluado === false && <p className="bio-medicion__nota">Sin evaluación completa vigente: no entra en los indicadores biométricos del proyecto.</p>}
        </article>
      </aside>
    </div>
  );
}
