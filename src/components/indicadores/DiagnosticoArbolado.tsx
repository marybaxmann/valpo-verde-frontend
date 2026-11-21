import { useState } from "react";
import type { DiagnosticoDescriptivo, EstadisticaDescriptiva } from "../../types/indicadores";
import { num, pct } from "./formato";

/**
 * Diagnóstico descriptivo del arbolado (propuesta experimental). Representa
 * los valores que entrega la API (B19, `diagnostico_descriptivo`): el
 * frontend no calcula. Son indicadores descriptivos propuestos, distintos de
 * los indicadores metodológicos aprobados; la condición de copa se muestra
 * como distribución de valores registrados, no como índice.
 */

type Pestana = "dimensiones" | "composicion" | "condicion" | "territorio" | "calidad";
const PESTANAS: [Pestana, string][] = [
  ["dimensiones", "Dimensiones"],
  ["composicion", "Composición"],
  ["condicion", "Condición de copa"],
  ["territorio", "Territorio"],
  ["calidad", "Calidad de datos"],
];

function Fila({ etiqueta, e, unidad, dec = 1 }: { etiqueta: string; e: EstadisticaDescriptiva; unidad: string; dec?: number }) {
  return (
    <tr>
      <th scope="row">{etiqueta}</th>
      <td>{e.n > 0 ? `${num(e.mediana, dec)} ${unidad}` : "—"}</td>
      <td>{e.n > 0 ? `${num(e.media, dec)} ${unidad}` : "—"}</td>
      <td>{e.n > 0 ? `${num(e.minimo, dec)} – ${num(e.maximo, dec)}` : "—"}</td>
      <td>{num(e.n)}</td>
    </tr>
  );
}

function Barras({ items, total }: { items: { etiqueta: string; n: number }[]; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <ul className="bx-diag__barras">
      {items.map((i) => (
        <li key={i.etiqueta}>
          <span>{i.etiqueta}</span>
          <span className="bx-diag__pista">
            <i style={{ width: `${(i.n / max) * 100}%` }} />
          </span>
          <b>{num(i.n)}</b>
          <small>{total > 0 ? pct((i.n / total) * 100, 0) : "—"}</small>
        </li>
      ))}
    </ul>
  );
}

function Dimensiones({ d }: { d: DiagnosticoDescriptivo }) {
  const x = d.dimensiones;
  return (
    <div className="bx-diag__cuerpo bx-diag__cuerpo--dos">
      <div className="bx-diag__col">
        <div className="bx-diag__tabla">
          <table>
            <thead>
              <tr>
                <th scope="col">Variable</th>
                <th scope="col">Mediana</th>
                <th scope="col">Media</th>
                <th scope="col">Rango</th>
                <th scope="col">n</th>
              </tr>
            </thead>
            <tbody>
              <Fila etiqueta="Altura total" e={x.altura_m} unidad="m" />
              <Fila etiqueta="DAP" e={x.dap_cm} unidad="cm" />
              <Fila etiqueta="Diámetro de copa" e={x.diametro_copa_m} unidad="m" />
              <Fila etiqueta="Área de copa por árbol" e={x.area_copa_por_arbol_m2} unidad="m²" dec={0} />
              <Fila etiqueta="Altura de primera rama" e={x.altura_primera_rama_m} unidad="m" />
              <Fila etiqueta="Longitud de copa viva" e={x.longitud_copa_viva_m} unidad="m" />
              <Fila etiqueta="Proporción de copa viva" e={x.proporcion_copa_viva_pct} unidad="%" dec={0} />
              <Fila etiqueta="Diámetro de copa / altura" e={x.relacion_copa_altura} unidad="" dec={2} />
            </tbody>
          </table>
        </div>
        <p className="bio-panel__foot">
          {x.dap_cm.multifustales_con_dap_equivalente > 0 && `${num(x.dap_cm.multifustales_con_dap_equivalente)} multifustales con DAP equivalente. `}
          Copa viva = altura total − altura de la base de la copa viva. Las clases de DAP están en «Perfil de tamaños».
        </p>
      </div>
      <div className="bx-diag__col">
        <h3>Altura total</h3>
        <Barras items={x.altura_m.clases} total={x.altura_m.n} />
        <h3>Proporción de copa viva</h3>
        <Barras items={x.proporcion_copa_viva_pct.clases} total={x.proporcion_copa_viva_pct.n} />
        <h3>Clase de edad</h3>
        <Barras
          items={x.clase_edad.categorias.map((c) => ({ etiqueta: c.etiqueta ?? c.codigo, n: c.n }))}
          total={x.clase_edad.categorias.reduce((s, c) => s + c.n, 0) + x.clase_edad.sin_dato}
        />
      </div>
    </div>
  );
}

function Composicion({ d }: { d: DiagnosticoDescriptivo }) {
  const [nivel, setNivel] = useState<"genero" | "familia">("genero");
  const a = d.composicion[nivel];
  const items = [...a.grupos.slice(0, 8).map((g) => ({ etiqueta: g.nombre, n: g.arboles }))];
  if (a.grupos.length > 8) items.push({ etiqueta: `Otros (${a.grupos.length - 8})`, n: a.grupos.slice(8).reduce((s, g) => s + g.arboles, 0) });
  if (a.sin_dato > 0) items.push({ etiqueta: `Sin ${nivel === "genero" ? "género" : "familia"} en el catálogo`, n: a.sin_dato });
  return (
    <div className="bx-diag__cuerpo">
      <div className="bio-seg bx-diag__mini" role="tablist" aria-label="Nivel taxonómico">
        {(["genero", "familia"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={nivel === k} className={nivel === k ? "is-on" : ""} onClick={() => setNivel(k)}>
            {k === "genero" ? "Género" : "Familia"}
          </button>
        ))}
      </div>
      <Barras items={items} total={a.denominador} />
      <p className="bio-panel__foot">
        Árboles presentes ({num(a.denominador)}). La abundancia por especie y la regla 10-20-30 están en «Diversidad».
        {a.sin_dato > 0 && ` ${num(a.sin_dato)} árboles no tienen ${nivel === "genero" ? "género" : "familia"} porque su especie no está vinculada al catálogo o no está identificada.`}
      </p>
    </div>
  );
}

const ETIQUETA_CONDICION: [keyof DiagnosticoDescriptivo["condicion_copa"], string, string][] = [
  ["cle", "Exposición lumínica de copa (CLE)", ""],
  ["muerte_regresiva_pct", "Muerte regresiva", "%"],
  ["defoliacion_pct", "Defoliación estimada", "%"],
  ["copa_faltante_pct", "Copa faltante", "%"],
  ["clorosis_pct", "Clorosis", "%"],
  ["necrosis_pct", "Necrosis", "%"],
];

function Condicion({ d }: { d: DiagnosticoDescriptivo }) {
  const c = d.condicion_copa;
  return (
    <div className="bx-diag__cuerpo bx-diag__cuerpo--dos">
      <div className="bx-diag__col">
        <ul className="bx-diag__vars">
          {ETIQUETA_CONDICION.map(([k, etiqueta, u]) => {
            const v = c[k] as { n: number; mediana: number | null; valores: { valor: number; n: number }[] };
            return (
              <li key={k}>
                <span className="bx-diag__var">
                  {etiqueta}
                  <small>mediana {v.n > 0 ? `${num(v.mediana)}${u ? ` ${u}` : ""}` : "—"} · n {num(v.n)}</small>
                </span>
                <span className="bx-diag__chips">
                  {v.valores.map((x) => (
                    <span key={x.valor} className="bio-chip" title={`${num(x.n)} árboles con ${num(x.valor)}${u}`}>
                      {num(x.valor)}
                      {u} · <b>{num(x.n)}</b>
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="bx-diag__col">
        <h3>Clasificación de vitalidad registrada</h3>
        <Barras
          items={c.vitalidad.categorias.map((x) => ({ etiqueta: x.etiqueta ?? x.codigo, n: x.n }))}
          total={c.vitalidad.categorias.reduce((s, x) => s + x.n, 0) + c.vitalidad.sin_dato}
        />
        <p className="bio-panel__foot">{c.nota}</p>
      </div>
    </div>
  );
}

function Territorio({ d }: { d: DiagnosticoDescriptivo }) {
  const t = d.territorio;
  return (
    <div className="bx-diag__cuerpo">
      <div className="bx-diag__tabla">
        <table>
          <thead>
            <tr>
              <th scope="col">Sector</th>
              <th scope="col">Presentes</th>
              <th scope="col">Evaluados</th>
              <th scope="col">Especies</th>
              <th scope="col">Altura mediana</th>
              <th scope="col">DAP mediano</th>
              <th scope="col">Copa mediana</th>
            </tr>
          </thead>
          <tbody>
            {t.sectores.map((s) => (
              <tr key={s.sector}>
                <th scope="row">{s.sector}</th>
                <td>{num(s.presentes)}</td>
                <td>{num(s.con_evaluacion_vigente)}</td>
                <td>{num(s.especies)}</td>
                <td>{s.altura_mediana_m === null ? "—" : `${num(s.altura_mediana_m, 1)} m`}</td>
                <td>{s.dap_mediano_cm === null ? "—" : `${num(s.dap_mediano_cm, 1)} cm`}</td>
                <td>{s.diametro_copa_mediano_m === null ? "—" : `${num(s.diametro_copa_mediano_m, 1)} m`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="bio-panel__foot">
        {t.comparable
          ? "Medianas de los árboles con evaluación completa vigente de cada sector."
          : "El proyecto tiene un solo sector registrado: la comparación territorial se activa cuando haya más de uno."}
      </p>
    </div>
  );
}

function Calidad({ d }: { d: DiagnosticoDescriptivo }) {
  const c = d.completitud;
  const ev = d.universo.con_evaluacion_vigente;
  const faltan: [string, number][] = [
    ["Altura", c.evaluados_sin.altura],
    ["DAP", c.evaluados_sin.dap],
    ["Diámetro de copa", c.evaluados_sin.diametro_copa],
    ["Base de copa viva", c.evaluados_sin.base_copa_viva],
    ["Primera rama", c.evaluados_sin.primera_rama],
    ["Clase de edad", c.evaluados_sin.clase_edad],
    ["CLE", c.evaluados_sin.cle],
    ["Muerte regresiva", c.evaluados_sin.muerte_regresiva],
  ];
  return (
    <div className="bx-diag__cuerpo bx-diag__cuerpo--dos">
      <div className="bx-diag__col">
        <h3>Registros</h3>
        <ul className="bx-diag__lista">
          <li>
            <span>Presentes sin evaluación completa vigente</span>
            <b>{num(c.presentes_sin_evaluacion_vigente)}</b>
          </li>
          <li>
            <span>Presentes sin especie identificada</span>
            <b>{num(c.presentes_sin_especie)}</b>
          </li>
          <li>
            <span>Con especie, pero sin género, familia ni origen en el catálogo</span>
            <b>{num(c.presentes_especie_sin_rasgos)}</b>
          </li>
          <li>
            <span>Multifustales sin diámetros de fustes</span>
            <b>{num(c.multifustales_sin_fustes)}</b>
          </li>
          <li>
            <span>Base de copa viva sobre la altura total</span>
            <b>{num(c.base_copa_viva_mayor_que_altura)}</b>
          </li>
        </ul>
        <h3>Datos faltantes en los {num(ev)} evaluados</h3>
        <p className="bx-diag__chips">
          {faltan.map(([k, n]) => (
            <span key={k} className={`bio-chip ${n > 0 ? "bx-diag__falta" : ""}`}>
              {k} · <b>{n === 0 ? "completo" : `faltan ${num(n)}`}</b>
            </span>
          ))}
        </p>
      </div>
      <div className="bx-diag__col">
        <h3>Mediciones en revisión</h3>
        {c.mediciones_en_revision.length === 0 ? (
          <p className="bio-panel__foot">Ninguna.</p>
        ) : (
          <ul className="bx-diag__lista">
            {c.mediciones_en_revision.map((m) => (
              <li key={m.tree_code}>
                <span>
                  <b>{m.tree_code}</b> · {m.motivo}
                </span>
              </li>
            ))}
          </ul>
        )}
        <h3>Especies sin origen en el catálogo</h3>
        <p className="bx-diag__chips">
          {c.especies_sin_origen_en_catalogo.length === 0
            ? "Ninguna."
            : c.especies_sin_origen_en_catalogo.map((e) => (
                <span key={e} className="bio-chip">
                  <em>{e}</em>
                </span>
              ))}
        </p>
      </div>
    </div>
  );
}

export function DiagnosticoArbolado({ d }: { d: DiagnosticoDescriptivo }) {
  const [p, setP] = useState<Pestana>("dimensiones");
  return (
    <article className="bio-card bio-panel bx-diag">
      <header className="bio-panel__head">
        <h2>Diagnóstico del arbolado</h2>
        <span className="bio-tag bio-tag--pendiente" title={d.estado}>
          Descriptivo · propuesta
        </span>
      </header>
      <div className="bio-seg bx-diag__tabs" role="tablist" aria-label="Diagnóstico">
        {PESTANAS.map(([k, etiqueta]) => (
          <button key={k} type="button" role="tab" aria-selected={p === k} className={p === k ? "is-on" : ""} onClick={() => setP(k)}>
            {etiqueta}
          </button>
        ))}
      </div>
      {p === "dimensiones" && <Dimensiones d={d} />}
      {p === "composicion" && <Composicion d={d} />}
      {p === "condicion" && <Condicion d={d} />}
      {p === "territorio" && <Territorio d={d} />}
      {p === "calidad" && <Calidad d={d} />}
      <p className="bio-panel__foot">
        {num(d.universo.con_evaluacion_vigente)} de {num(d.universo.presentes)} árboles presentes con evaluación completa vigente. Datos medidos y registrados, sin
        ecuaciones; no son indicadores aprobados en la metodología.
      </p>
    </article>
  );
}
