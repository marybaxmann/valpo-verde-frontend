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

/**
 * Secuestro anual de CO₂ (decisiones A a C, 2026-11-20): el total suma solo
 * estimaciones fundamentadas. Las simulaciones solo se cuentan; su rango
 * está en la ficha de cada árbol.
 */
function Secuestro({ d }: { d: IndicadoresProyecto }) {
  const s = d.estimacion_secuestro_anual;
  if (!s) {
    return (
      <div>
        <span className="bio-tag bio-tag--pendiente">Método en definición</span>
        <strong>Secuestro anual de CO₂</strong>
        <span>La estimación todavía no está disponible en esta versión de la API.</span>
      </div>
    );
  }
  const c = s.cobertura;
  const motivoPrincipal = Object.entries(c.motivos)
    .filter(([m]) => m !== "sin_evaluacion_valida" && m !== "no_presente")
    .sort((a, b) => b[1] - a[1])[0];
  const fundamentado = s.total_fundamentado.co2_kg_anio;
  const motivo = motivoPrincipal ? `, sobre todo por ${(MOTIVO_SECUESTRO[motivoPrincipal[0]] ?? motivoPrincipal[0]).toLowerCase()}` : "";
  return (
    <div>
      {fundamentado !== null ? (
        <span className="bio-tag bio-tag--resuelto">Estimación</span>
      ) : (
        <span className="bio-tag bio-tag--simulacion">Sin estimación fundamentada</span>
      )}
      <strong>
        Secuestro anual de CO₂
        {fundamentado !== null && ` · ${co2Anual(fundamentado)} kg CO₂/año en ${num(c.estimacion_fundamentada)} árboles`}
      </strong>
      <span>
        De {num(c.universo_calculo)} evaluados: {num(c.simulacion_exploratoria)} con simulación exploratoria (rango en su ficha; no se suma) y {num(c.no_estimable)} no
        estimables{motivo}.
      </span>
    </div>
  );
}

/** Lo que aún no tiene método cerrado: carbono en validación, secuestro y servicios del arbolado. */
function EnDefinicion({ d }: { d: IndicadoresProyecto }) {
  const carbono = d.estimacion_carbono_aereo_lenoso;
  const c = carbono ? masa(carbono.total.carbono_t) : null;
  return (
    <section className="bio-card bio-cpend">
      <div>
        <span className="bio-tag bio-tag--pendiente">En validación</span>
        <strong>Carbono almacenado</strong>
        <span>
          {carbono && carbono.cobertura.con_resultado > 0
            ? `${c!.valor} ${c!.unidad} C estimados en ${num(carbono.cobertura.con_resultado)} de ${num(carbono.cobertura.presentes)} árboles; el método sigue pendiente en la metodología.`
            : "El método de cálculo sigue pendiente en la metodología."}
        </span>
      </div>
      <Secuestro d={d} />
      <div>
        <span className="bio-tag bio-tag--pendiente">Método en definición</span>
        <strong>Servicios del arbolado</strong>
        <span>Agua, aire, sombra, fauna, energía y valor compensatorio: se activan cuando su método quede definido.</span>
      </div>
    </section>
  );
}

export function HuellaVerde({ d }: { d: IndicadoresProyecto }) {
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

      <section className="bio-cgrid">
        <Diversidad d={d} />
        <PerfilTamanos d={d} />
        <Origen d={d} />
      </section>

      <EnDefinicion d={d} />
    </div>
  );
}
