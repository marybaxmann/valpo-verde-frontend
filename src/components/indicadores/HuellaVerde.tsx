import { useState } from "react";
import type React from "react";
import { AportesAmbientales } from "./AportesAmbientales";
import { ResumenArbolado } from "./ResumenArbolado";
import { CarbonoIntegradoPanel } from "./CarbonoIntegrado";
import { DiagnosticoArbolado } from "./DiagnosticoArbolado";
import type { IndicadoresProyecto, NivelTaxonomico } from "../../types/indicadores";
import { co2Anual, masa, MOTIVO_SECUESTRO, num, pct } from "./formato";

/**
 * Vista del proyecto de Indicadores biométricos, compacta como el Dashboard
 * (pedido de la responsable, 2026-11-19): los indicadores principales de B19
 * (hoja INDICES, filas 3 a 13; CC-016) en una franja, tres paneles cortos y
 * una línea con lo que todavía no tiene método. No se listan todas las
 * especies ni se ordena el carbono por árbol.
 *
 * Reglas de veracidad:
 * - Las medidas de copa son de los árboles con evaluación completa vigente
 *   (CC-016): siempre dicen cuántos árboles cubren.
 * - El carbono (fila 14) sigue «Pendiente» en el Excel: no es protagonista,
 *   va como estimación en validación con su cobertura (auditoría 2026-11-16).
 * - Origen: «Sin determinar» es una categoría válida del indicador (árboles de
 *   especie no identificada o sin origen en el catálogo), no un dato incompleto
 *   (Valej, 2026-11-22).
 * - Cobertura de copa: área de copa / superficie del sector, calculada por la API.
 */

/** Sección con título: ordena la vista en resumen, composición y carbono (2026-11-23). */
function Seccion({ id, titulo, bajada, etiqueta, children }: { id: string; titulo: string; bajada: string; etiqueta?: string; children: React.ReactNode }) {
  return (
    <section className="bio-seccion" aria-labelledby={`bio-sec-${id}`}>
      <header className="bio-seccion__head">
        <div>
          <h2 id={`bio-sec-${id}`}>{titulo}</h2>
          <p>{bajada}</p>
        </div>
        {etiqueta && <span className="bio-tag bio-tag--pendiente">{etiqueta}</span>}
      </header>
      {children}
    </section>
  );
}

/** 10-20-30: por nivel, solo el taxón dominante frente a su máximo recomendado. */
function Diversidad({ d }: { d: IndicadoresProyecto }) {
  const r = d.diversidad_taxonomica_10_20_30;
  const niveles: [string, NivelTaxonomico, boolean][] = [
    ["Especie", r.especie, true],
    ["Género", r.genero, false],
    ["Familia", r.familia, false],
  ];
  const sinDatoCatalogo = Math.max(r.genero.sin_dato.arboles, r.familia.sin_dato.arboles);
  return (
    <article className="bio-card bio-panel bio-cpanel">
      <header className="bio-panel__head">
        <h2>Diversidad (regla 10-20-30)</h2>
        <span className="bio-panel__hint">taxón dominante · línea = máximo</span>
      </header>
      {r.denominador === 0 ? (
        <p className="bio-empty">Sin árboles presentes en este ámbito.</p>
      ) : (
        <ul className="bio-dom">
          {niveles.map(([nombre, n, cursiva]) => {
            const top = n.taxones[0];
            return (
              <li key={nombre} className={top?.supera_umbral ? "is-over" : ""}>
                <span className="bio-dom__nivel">{nombre}</span>
                <span className={`bio-dom__taxon ${cursiva ? "is-it" : ""}`}>{top ? top.taxon : "Sin dato"}</span>
                <span className="bio-bar" style={{ ["--valor" as string]: `${Math.min(100, top?.porcentaje ?? 0)}%`, ["--umbral" as string]: `${n.umbral_porcentaje}%` }}>
                  <i />
                  <b aria-hidden="true" />
                </span>
                <span className="bio-dom__pct">{pct(top?.porcentaje ?? null)}</span>
                <span className={`bio-dom__estado ${n.cumple === false ? "is-no" : n.cumple ? "is-si" : ""}`}>
                  {n.cumple === null ? "Sin dato" : n.cumple ? "Cumple" : `Supera ${n.umbral_porcentaje} %`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {sinDatoCatalogo > 0 && (
        <p className="bio-panel__foot">
          {num(sinDatoCatalogo)} árboles no tienen género o familia en el catálogo de especies: no entran en esos niveles.
        </p>
      )}
    </article>
  );
}

function PerfilTamanos({ d }: { d: IndicadoresProyecto }) {
  const cd = d.clases_diametricas;
  const evaluados = cd.denominador_evaluados ?? cd.denominador ?? 0;
  const sinEvaluacion = d.cobertura.arboles_sin_evaluacion_valida;
  const ultima = cd.clases.reduce((m, c, i) => (c.arboles > 0 ? i : m), -1);
  const visibles = cd.clases.slice(0, Math.max(4, ultima + 1));
  const max = Math.max(1, ...visibles.map((c) => c.arboles));
  return (
    <article className="bio-card bio-panel bio-cpanel">
      <header className="bio-panel__head">
        <h2>Perfil de tamaños</h2>
        <span className="bio-panel__hint">árboles por DAP (cm)</span>
      </header>
      <div className="bio-cperfil" role="img" aria-label={visibles.map((c) => `${c.etiqueta}: ${c.arboles}`).join(", ")}>
        {visibles.map((c) => (
          <div key={c.codigo} className="bio-cperfil__col">
            <span className="bio-cperfil__n">{c.arboles > 0 ? c.arboles : ""}</span>
            <span className="bio-cperfil__bar" style={{ height: `${(c.arboles / max) * 100}%` }} />
            <span className="bio-cperfil__lbl">{c.desde_cm}</span>
          </div>
        ))}
      </div>
      <p className="bio-panel__foot">
        {num(evaluados)} árboles con evaluación completa vigente
        {sinEvaluacion ? ` · ${num(sinEvaluacion)} se suman al evaluarse` : ""}.
      </p>
    </article>
  );
}

function Origen({ d }: { d: IndicadoresProyecto }) {
  const o = d.proporcion_origen;
  const sinDeterminar = o.origen_no_determinado.arboles;
  const filas: [string, number | null, number, string][] = [
    ["Introducidos", o.introducidos.porcentaje, o.introducidos.arboles, "intro"],
    ["Nativos", o.nativos.porcentaje, o.nativos.arboles, "nat"],
    ["Sin determinar", o.origen_no_determinado.porcentaje, o.origen_no_determinado.arboles, "nd"],
  ];
  return (
    <article className="bio-card bio-panel bio-cpanel">
      <header className="bio-panel__head">
        <h2>Origen de las especies</h2>
        <span className="bio-panel__hint">{num(o.denominador)} árboles presentes</span>
      </header>
      <ul className="bio-corigen">
        {filas.map(([nombre, p, n, clase]) => (
          <li key={clase} className={`is-${clase}`}>
            <span>{nombre}</span>
            <span className="bio-corigen__bar">
              <i style={{ width: `${Math.min(100, p ?? 0)}%` }} />
            </span>
            <strong>{pct(p)}</strong>
            <small>{num(n)}</small>
          </li>
        ))}
      </ul>
      {sinDeterminar > 0 && (
        <p className="bio-panel__foot">
          «Sin determinar» es una categoría del indicador: {num(sinDeterminar)} árboles de especie no identificada o sin origen en el catálogo. Conservan sus mediciones.
        </p>
      )}
    </article>
  );
}

function Barra({ partes }: { partes: { n: number; clase: string; etiqueta: string }[] }) {
  const total = Math.max(1, partes.reduce((s, p) => s + p.n, 0));
  return (
    <div className="bx-barra">
      <div className="bx-barra__pista" role="img" aria-label={partes.map((p) => `${p.etiqueta}: ${p.n}`).join(", ")}>
        {partes.map((p) => p.n > 0 && <span key={p.clase} className={`bx-barra__seg is-${p.clase}`} style={{ flexGrow: p.n / total }} />)}
      </div>
      <ul className="bx-barra__ley">
        {partes.map((p) => (
          <li key={p.clase}>
            <i className={`is-${p.clase}`} />
            <b>{num(p.n)}</b> {p.etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Carbono y secuestro anual con jerarquía, bajo los indicadores principales.
 * El total oficial suma solo estimaciones fundamentadas; las simulaciones se
 * cuentan y se ven en la ficha de cada árbol, nunca se suman.
 */
/**
 * Motivos de los árboles evaluados sin resultado, por indicador: cada total
 * coincide con el «no estimables» / «sin estimación» de su tarjeta.
 */
function MotivosCarbono({
  proyeccion,
  almacenado,
  fuera,
}: {
  proyeccion: { total: number; motivos: [string, number][] };
  almacenado: { total: number; motivos: [string, number][] };
  fuera: number;
}) {
  const [vista, setVista] = useState<"proyeccion" | "almacenado">("proyeccion");
  const actual = vista === "proyeccion" ? proyeccion : almacenado;
  const max = Math.max(1, ...actual.motivos.map(([, v]) => v));
  return (
    <article className="bio-card bx-carbono__motivos">
      <span className="bx-eyebrow">Por qué no se estiman</span>
      <div className="sivu-seg bx-motivos__seg" role="tablist" aria-label="Indicador">
        <button type="button" role="tab" aria-selected={vista === "proyeccion"} className={`sivu-seg__opt ${vista === "proyeccion" ? "is-on" : ""}`} onClick={() => setVista("proyeccion")}>
          Proyección anual · {num(proyeccion.total)}
        </button>
        <button type="button" role="tab" aria-selected={vista === "almacenado"} className={`sivu-seg__opt ${vista === "almacenado" ? "is-on" : ""}`} onClick={() => setVista("almacenado")}>
          Carbono almacenado · {num(almacenado.total)}
        </button>
      </div>
      <ul key={vista}>
        {actual.motivos.map(([m, v]) => (
          <li key={m}>
            <span>{MOTIVO_SECUESTRO[m] ?? m}</span>
            <b>{num(v)}</b>
            <i className="bx-motivos__barra" style={{ width: `${(v / max) * 100}%` }} aria-hidden />
          </li>
        ))}
        {actual.motivos.length === 0 && <li><span>Todos los árboles evaluados tienen resultado.</span></li>}
      </ul>
      <p className="bx-carbono__nota">{num(fuera)} árboles más están fuera del cálculo: aún no tienen evaluación completa vigente.</p>
    </article>
  );
}

function CarbonoProyecto({ d, onVerArboles }: { d: IndicadoresProyecto; onVerArboles?: () => void }) {
  const s = d.estimacion_secuestro_anual;
  const c = d.estimacion_carbono_aereo_lenoso;
  const t = d.estimacion_carbono_aereo_total;
  const v = d.estimacion_variacion_anual_carbono_aereo_total;
  // Propuesta experimental: si la API trae el resumen por árbol, la tarjeta y los motivos lo usan (una clase por árbol).
  const rp = d.resumen_proyeccion_anual;
  if (!s || !c) return null;
  const cs = s.cobertura;
  const cc = c.cobertura;
  const sinCarbono = cc.universo_calculo - cc.con_resultado - (cc.con_resultado_exploratorio ?? 0);
  const total = masa(c.total.carbono_t);
  const co2 = masa(c.total.co2e_t);
  const motivos = Object.entries(rp ? rp.motivos_no_estimable : cs.motivos)
    .filter(([m, v]) => v > 0 && m !== "sin_evaluacion_valida" && m !== "no_presente")
    .sort((a, b) => b[1] - a[1]);

  const motivosCarbono = Object.entries(cc.motivos)
    .filter(([m, v]) => v > 0 && m !== "sin_evaluacion_valida" && m !== "no_presente")
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className="bx-carbono">
      <article className="bio-card bx-carbono__principal">
        <header>
          <span className="bx-eyebrow">Secuestro anual de CO₂</span>
          <span className="bio-tag bio-tag--simulacion">{s.total_fundamentado.co2_kg_anio === null ? "Sin estimación fundamentada" : "Estimación"}</span>
        </header>
        <div className="bx-carbono__cifra">
          {s.total_fundamentado.co2_kg_anio === null && rp ? (
            <>
              <b>{num(rp.con_proyeccion)}</b>
              <span>
                de {num(rp.universo_calculo)} árboles evaluados
                <br />
                tienen una proyección anual (simulación)
              </span>
            </>
          ) : s.total_fundamentado.co2_kg_anio === null ? (
            <>
              <b>{num(cs.simulacion_exploratoria)}</b>
              <span>
                de {num(cs.universo_calculo)} árboles evaluados
                <br />
                tienen una simulación exploratoria
              </span>
            </>
          ) : (
            <>
              <b>{co2Anual(s.total_fundamentado.co2_kg_anio)}</b>
              <span>kg de CO₂ al año</span>
            </>
          )}
        </div>
        <Barra
          partes={
            rp
              ? [
                  { n: rp.estimacion_fundamentada, clase: "fund", etiqueta: "fundamentadas" },
                  { n: rp.simulacion_secuestro_lenoso, clase: "sim", etiqueta: "secuestro en la madera" },
                  { n: rp.simulacion_variacion_aereo_total, clase: "aereo", etiqueta: "carbono aéreo total (con hojas, aparte)" },
                  { n: rp.no_estimable, clase: "no", etiqueta: "no estimables" },
                ]
              : [
                  { n: cs.estimacion_fundamentada, clase: "fund", etiqueta: "fundamentadas" },
                  { n: cs.simulacion_exploratoria, clase: "sim", etiqueta: "simulaciones" },
                  { n: cs.no_estimable, clase: "no", etiqueta: "no estimables" },
                ]
          }
        />
        <p className="bx-carbono__nota">
          Aumento proyectado del carbono en la madera por crecimiento; no es la captura fotosintética. El total oficial suma solo estimaciones
          fundamentadas. Las simulaciones se ven, con su rango, en la ficha de cada árbol.
        </p>
        {!rp && v && v.cobertura.simulacion_exploratoria > 0 && (
          <p className="bx-carbono__nota bx-carbono__extra">
            <span className="bio-tag bio-tag--simulacion">Experimental</span> {num(v.cobertura.simulacion_exploratoria)}{" "}
            {v.cobertura.simulacion_exploratoria === 1 ? "árbol tiene" : "árboles tienen"} además una simulación de la variación anual del carbono aéreo
            total, con hojas. Va aparte y no se suma.
          </p>
        )}
        {onVerArboles && (
          <button type="button" className="bx-boton" onClick={onVerArboles}>
            Ver árboles →
          </button>
        )}
      </article>

      <article className="bio-card bx-carbono__almacen">
        <header>
          <span className="bx-eyebrow">Carbono almacenado</span>
          <span className="bio-tag bio-tag--pendiente">En validación</span>
        </header>
        <div className="bx-carbono__cifra bx-carbono__cifra--sm">
          <b>{total.valor}</b>
          <span>
            {total.unidad} C · {co2.valor} {co2.unidad} CO₂e
            <br />
            en {num(cc.con_resultado)} árboles con modelo aprobado
          </span>
        </div>
        <Barra
          partes={[
            { n: cc.con_resultado, clase: "fund", etiqueta: "modelo aprobado" },
            { n: cc.con_resultado_exploratorio ?? 0, clase: "sim", etiqueta: "exploratorios (no suman)" },
            { n: Math.max(0, sinCarbono), clase: "no", etiqueta: "sin estimación" },
          ]}
        />
        {t && t.cobertura.con_resultado_exploratorio > 0 && (
          <p className="bx-carbono__nota bx-carbono__extra">
            <span className="bio-tag bio-tag--simulacion">Exploratorio</span> {num(t.cobertura.con_resultado_exploratorio)}{" "}
            {t.cobertura.con_resultado_exploratorio === 1 ? "árbol tiene" : "árboles tienen"} además carbono aéreo total con hojas (modelos de la especie,
            no urbanos). Se ve en su ficha y no suma a este total.
          </p>
        )}
      </article>

      <MotivosCarbono
        proyeccion={{ total: rp ? rp.no_estimable : cs.no_estimable, motivos }}
        almacenado={{ total: Math.max(0, sinCarbono), motivos: motivosCarbono }}
        fuera={cs.presentes - cs.universo_calculo}
      />
    </section>
  );
}

/** Lo que aún no tiene método; con una API sin secuestro, también el carbono en validación. */
function EnDefinicion({ d }: { d: IndicadoresProyecto }) {
  const carbono = d.estimacion_carbono_aereo_lenoso;
  const c = carbono ? masa(carbono.total.carbono_t) : null;
  return (
    <p className="bx-servicios">
      {!d.estimacion_secuestro_anual && carbono && carbono.cobertura.con_resultado > 0 && (
        <>
          <span className="bio-tag bio-tag--pendiente">En validación</span> Carbono almacenado: {c!.valor} {c!.unidad} C estimados en{" "}
          {num(carbono.cobertura.con_resultado)} de {num(carbono.cobertura.presentes)} árboles.{" "}
        </>
      )}
      <span className="bio-tag bio-tag--pendiente">Método en definición</span> Agua, aire, sombra, fauna, energía y valor compensatorio se activan cuando su método
      quede definido.
    </p>
  );
}

export function HuellaVerde({ d, onVerArboles }: { d: IndicadoresProyecto; onVerArboles?: () => void }) {
  return (
    <div className="bio-huella bio-compacto">
      <Seccion id="resumen" titulo="Resumen del arbolado" bajada="Cuántos árboles hay, qué tan diversos son y cuánta copa aportan.">
      <ResumenArbolado d={d} />
      </Seccion>

      {d.aportes_ambientales && (
        <Seccion
          id="aportes"
          titulo="Aportes ambientales"
          bajada="Los cinco aportes que piden los instrumentos climáticos (Nowak, 2024): qué se estima con los datos registrados y qué falta."
          etiqueta="Experimental"
        >
          <AportesAmbientales d={d} />
        </Seccion>
      )}

      <Seccion
        id="carbono"
        titulo="Carbono"
        bajada="Carbono almacenado y captura anual. Solo los resultados aprobados suman a los totales oficiales."
        etiqueta="En validación"
      >
        <CarbonoProyecto d={d} onVerArboles={onVerArboles} />
        {d.estimacion_carbono_integrada && <CarbonoIntegradoPanel d={d.estimacion_carbono_integrada} />}
      </Seccion>

      <Seccion id="composicion" titulo="Composición y estructura" bajada="Qué especies dominan, de qué tamaño son los árboles y de dónde provienen.">
        <div className="bio-cgrid">
          <Diversidad d={d} />
          <PerfilTamanos d={d} />
          <Origen d={d} />
        </div>
        {d.diagnostico_descriptivo && <DiagnosticoArbolado d={d.diagnostico_descriptivo} />}
      </Seccion>

      <EnDefinicion d={d} />
    </div>
  );
}
