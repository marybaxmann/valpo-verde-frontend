import type React from "react";
import { AportesAmbientales } from "./AportesAmbientales";
import { ResumenArbolado } from "./ResumenArbolado";
import type { IndicadoresProyecto, NivelTaxonomico } from "../../types/indicadores";
import { num, pct } from "./formato";

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

/**
 * Indicadores del proyecto, versión esencial (2026-11-24): recurso arbóreo,
 * los cinco aportes ambientales del marco de Nowak (2024) con su detalle al
 * tocarlos, y la composición plegada.
 */
export function HuellaVerde({ d, onVerArboles }: { d: IndicadoresProyecto; onVerArboles?: () => void }) {
  return (
    <div className="bio-huella bio-compacto">
      <Seccion id="recurso" titulo="Recurso arbóreo" bajada="Cuántos árboles hay y cómo son. Toca un indicador para ver qué significa.">
        <ResumenArbolado d={d} />
      </Seccion>

      {d.aportes_ambientales && (
        <Seccion
          id="aportes"
          titulo="Aportes ambientales"
          bajada="Lo que aporta el arbolado, estimado con especie, diámetro, altura y condición (Nowak, 2024). Toca un aporte para ver su detalle."
        >
          <AportesAmbientales d={d} onVerArboles={onVerArboles} />
        </Seccion>
      )}

      <details className="bio-seccion bio-plegable">
        <summary className="bio-seccion__head">
          <div>
            <h2>Composición</h2>
            <p>Diversidad de especies, tamaños y origen.</p>
          </div>
          <span className="bio-plegable__flecha" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="bio-cgrid">
          <Diversidad d={d} />
          <PerfilTamanos d={d} />
          <Origen d={d} />
        </div>
      </details>
    </div>
  );
}
