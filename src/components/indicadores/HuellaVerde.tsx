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
 * - Si el catálogo no tiene el origen de algunas especies, el % de nativos
 *   se marca como incompleto en lugar de mostrarse como dato cerrado.
 */

function Kpi({ etiqueta, valor, unidad, nota }: { etiqueta: string; valor: string; unidad?: string; nota: string }) {
  return (
    <article className="bio-card bio-ckpi">
      <span className="bio-ckpi__lbl">{etiqueta}</span>
      <span className="bio-ckpi__val">
        {valor}
        {unidad && valor !== "—" && <small>{unidad}</small>}
      </span>
      <span className="bio-ckpi__note">{nota}</span>
    </article>
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
  const incompleto = o.origen_no_determinado.arboles > 0;
  const filas: [string, number | null, number, string][] = [
    ["Introducidos", o.introducidos.porcentaje, o.introducidos.arboles, "intro"],
    ["Nativos", o.nativos.porcentaje, o.nativos.arboles, "nat"],
    ["Sin origen en el catálogo", o.origen_no_determinado.porcentaje, o.origen_no_determinado.arboles, "nd"],
  ];
  return (
    <article className="bio-card bio-panel bio-cpanel">
      <header className="bio-panel__head">
        <h2>Origen de las especies</h2>
        {incompleto && <span className="bio-tag bio-tag--pendiente">Dato incompleto</span>}
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
      {incompleto && (
        <p className="bio-panel__foot">
          {num(o.origen_no_determinado.arboles)} árboles son de especies sin origen registrado en el catálogo; la proporción de nativos puede ser mayor cuando se complete.
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

      <article className="bio-card bx-carbono__motivos">
        <span className="bx-eyebrow">Por qué no se estiman</span>
        <ul>
          {motivos.map(([m, v]) => (
            <li key={m}>
              <span>{MOTIVO_SECUESTRO[m] ?? m}</span>
              <b>{num(v)}</b>
            </li>
          ))}
        </ul>
        <p className="bx-carbono__nota">{num(cs.presentes - cs.universo_calculo)} árboles aún sin evaluación completa vigente.</p>
      </article>
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
  const copa = d.diametro_medio_copa;
  const area = d.area_proyectada_copa;
  const ha = d.densidad_arborea.superficie_m2 ? d.densidad_arborea.superficie_m2 / 10000 : null;
  return (
    <div className="bio-huella bio-compacto">
      <section className="bio-ckpis">
        <Kpi etiqueta="Árboles presentes" valor={num(d.numero_total_arboles.valor)} nota="en el inventario" />
        <Kpi
          etiqueta="Riqueza de especies"
          valor={num(d.riqueza_especies.valor)}
          nota={d.riqueza_especies.n_no_identificados > 0 ? `${num(d.riqueza_especies.n_no_identificados)} árboles sin identificar` : "todas identificadas"}
        />
        <Kpi
          etiqueta="Diversidad (Shannon)"
          valor={num(d.diversidad_shannon.valor, 2)}
          nota={`con ${num(d.diversidad_shannon.n_identificados)} árboles identificados`}
        />
        <Kpi
          etiqueta="Densidad arbórea"
          valor={num(d.densidad_arborea.valor, 1)}
          unidad="árb/ha"
          nota={d.densidad_arborea.valor === null ? (d.densidad_arborea.motivo ?? "Sin superficie del sector") : `sobre ${num(ha, 2)} ha del sector`}
        />
        <Kpi
          etiqueta="Diámetro medio de copa"
          valor={num(copa.valor, 1)}
          unidad="m"
          nota={copa.valor === null ? "ningún evaluado con copa medida" : `${num(copa.n_validos)} de ${num(d.cobertura.arboles_presentes)} árboles evaluados`}
        />
        <Kpi
          etiqueta="Área de copa"
          valor={num(area.total_m2, 0)}
          unidad="m²"
          nota={area.total_m2 === null ? "ningún evaluado con copa medida" : `suma de ${num(area.n_con_area)} árboles evaluados`}
        />
      </section>

      <CarbonoProyecto d={d} onVerArboles={onVerArboles} />

      <section className="bio-cgrid">
        <Diversidad d={d} />
        <PerfilTamanos d={d} />
        <Origen d={d} />
      </section>

      <EnDefinicion d={d} />
    </div>
  );
}
