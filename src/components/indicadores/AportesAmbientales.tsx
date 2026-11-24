import type React from "react";
import { useMemo, useState } from "react";
import type { AporteAmbiental, AportesFoliares, Contaminante, IndicadoresProyecto } from "../../types/indicadores";
import { num } from "./formato";

/**
 * Propuesta experimental (2026-11-23): los cinco aportes ambientales del
 * marco de Nowak (2024). El backend calcula y decide el estado de cada
 * aporte; aquí solo se presentan sus resultados.
 */

const ESTADO: Record<AporteAmbiental["estado"], { etiqueta: string; clase: string }> = {
  calculado: { etiqueta: "Calculado", clase: "is-ok" },
  simulacion: { etiqueta: "Simulación", clase: "is-sim" },
  no_estimable: { etiqueta: "No estimable", clase: "is-na" },
};

const CONTAMINANTE: Record<Contaminante, { etiqueta: string; color: string }> = {
  o3: { etiqueta: "O₃", color: "var(--ap-o3)" },
  pm10: { etiqueta: "PM10", color: "var(--ap-pm)" },
  so2: { etiqueta: "SO₂", color: "var(--ap-so2)" },
  no2: { etiqueta: "NO₂", color: "var(--ap-no2)" },
  co: { etiqueta: "CO", color: "var(--ap-co)" },
};
const ORDEN: Contaminante[] = ["o3", "pm10", "so2", "no2", "co"];

/* ---------- Glifos (SVG propios, sin datos) ---------- */

function Glifo({ codigo }: { codigo: string }) {
  const comun = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (codigo) {
    case "cobertura_arborea":
      return (
        <svg {...comun}>
          <circle cx="9" cy="10" r="5.5" />
          <circle cx="15" cy="12" r="5.5" />
          <path d="M3 20h18" />
        </svg>
      );
    case "carbono_almacenado":
      return (
        <svg {...comun}>
          <path d="M12 3c4 3 6 6 6 9a6 6 0 0 1-12 0c0-3 2-6 6-9z" />
          <path d="M12 21v-7" />
        </svg>
      );
    case "secuestro_carbono":
      return (
        <svg {...comun}>
          <path d="M4 18c4 0 6-3 8-6s4-6 8-6" />
          <path d="M16 6h4v4" />
          <circle cx="6" cy="8" r="1.4" />
          <circle cx="9" cy="5" r="1" />
        </svg>
      );
    case "remocion_contaminantes":
      return (
        <svg {...comun}>
          <path d="M3 8h10a3 3 0 1 0-3-3" />
          <path d="M3 13h15a3 3 0 1 1-3 3" />
          <path d="M3 18h6" />
        </svg>
      );
    default:
      return (
        <svg {...comun}>
          <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
          <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
        </svg>
      );
  }
}

/* ---------- Visualizaciones de cada aporte ---------- */

function Anillo({ valor, max }: { valor: number; max: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, valor / max));
  return (
    <svg className="ap-anillo" viewBox="0 0 64 64" role="img" aria-label={`${num(valor, 2)} % de una escala de ${max} %`}>
      <circle cx="32" cy="32" r={r} className="ap-anillo__pista" />
      <circle cx="32" cy="32" r={r} className="ap-anillo__valor" strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" className="ap-anillo__max">
        /{max}%
      </text>
    </svg>
  );
}

function Gota({ porcentaje }: { porcentaje: number }) {
  const nivel = Math.max(0, Math.min(100, porcentaje));
  const y = 58 - (nivel / 100) * 54;
  const forma = "M24 4C24 4 6 26 6 40a18 18 0 0 0 36 0C42 26 24 4 24 4z";
  return (
    <svg className="ap-gota" viewBox="0 0 48 64" role="img" aria-label={`${num(nivel, 1)} % de la lluvia retenida`}>
      <defs>
        <clipPath id="ap-gota-forma">
          <path d={forma} />
        </clipPath>
      </defs>
      <g clipPath="url(#ap-gota-forma)">
        <rect x="0" y="0" width="48" height="64" className="ap-gota__fondo" />
        <rect x="0" y={y} width="48" height="64" className="ap-gota__agua" />
        <path d={`M-12 ${y} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 v4 h-60z`} className="ap-gota__ola" />
      </g>
      <path d={forma} className="ap-gota__borde" />
    </svg>
  );
}

function Pila({ partes }: { partes: Array<{ clave: string; valor: number; color: string; etiqueta: string }> }) {
  const total = partes.reduce((s, p) => s + p.valor, 0);
  if (!(total > 0)) return null;
  return (
    <div className="ap-pila" role="img" aria-label={partes.map((p) => `${p.etiqueta}: ${num(p.valor, 1)}`).join(", ")}>
      {partes
        .filter((p) => p.valor > 0)
        .map((p) => (
          <span key={p.clave} style={{ flexGrow: p.valor, background: p.color }} title={`${p.etiqueta}: ${num(p.valor, 1)}`} />
        ))}
    </div>
  );
}

/* ---------- Tarjetas ---------- */

function Tarjeta({
  aporte,
  cifra,
  unidad,
  nota,
  children,
  indice,
}: {
  aporte: AporteAmbiental;
  cifra: string;
  unidad?: string;
  nota: string;
  children?: React.ReactNode;
  indice: number;
}) {
  const e = ESTADO[aporte.estado];
  return (
    <article className={`ap-tarjeta ${e.clase}`} style={{ ["--i" as string]: indice }}>
      <header className="ap-tarjeta__head">
        <span className="ap-tarjeta__glifo">
          <Glifo codigo={aporte.codigo} />
        </span>
        <span className={`ap-chip ${e.clase}`}>{e.etiqueta}</span>
      </header>
      <h3 className="ap-tarjeta__nombre">{aporte.nombre}</h3>
      <div className="ap-tarjeta__cuerpo">
        <p className="ap-tarjeta__cifra">
          {cifra}
          {unidad && cifra !== "—" && <small>{unidad}</small>}
        </p>
        {children && <div className="ap-tarjeta__viz">{children}</div>}
      </div>
      <p className="ap-tarjeta__nota">{nota}</p>
    </article>
  );
}

/* ---------- Ranking por árbol ---------- */

type Vista = "contaminantes" | "agua" | "hojas";
const VISTAS: Array<{ codigo: Vista; etiqueta: string; unidad: string }> = [
  { codigo: "contaminantes", etiqueta: "Aire limpio", unidad: "g/año" },
  { codigo: "agua", etiqueta: "Lluvia retenida", unidad: "m³/año" },
  { codigo: "hojas", etiqueta: "Área foliar", unidad: "m²" },
];

function Ranking({ d }: { d: AportesFoliares }) {
  const [vista, setVista] = useState<Vista>("contaminantes");
  const [todos, setTodos] = useState(false);
  const filas = useMemo(() => {
    const valor = (a: AportesFoliares["arboles"][number]) =>
      vista === "contaminantes" ? a.remocion_total_g : vista === "agua" ? a.intercepcion_m3 : a.area_foliar_m2;
    return d.arboles
      .filter((a) => valor(a) !== null)
      .map((a) => ({ a, v: valor(a)! }))
      .sort((x, y) => y.v - x.v);
  }, [d, vista]);
  const max = filas[0]?.v ?? 0;
  const visibles = todos ? filas : filas.slice(0, 5);
  const unidad = VISTAS.find((v) => v.codigo === vista)!.unidad;
  return (
    <section className="ap-ranking" aria-label="Árboles que más aportan">
      <header className="ap-ranking__head">
        <div>
          <h3>Árboles que más aportan</h3>
          <p>
            {num(filas.length)} árboles con área foliar estimada · LAI medio {num(d.area_foliar.lai_medio, 1)}
          </p>
          {d.cobertura.lai_acotado && d.cobertura.lai_acotado.length > 0 && (
            <p className="ap-ranking__aviso">
              Copa a revisar en terreno (LAI acotado a {d.parametros.lai_maximo?.valor ?? 18}): {d.cobertura.lai_acotado.join(", ")}
            </p>
          )}
        </div>
        <div className="sivu-seg" role="tablist" aria-label="Aporte">
          {VISTAS.map((v) => (
            <button
              key={v.codigo}
              type="button"
              role="tab"
              aria-selected={vista === v.codigo}
              className={`sivu-seg__opt ${vista === v.codigo ? "is-on" : ""}`}
              onClick={() => setVista(v.codigo)}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>
      </header>
      <ol className="ap-ranking__lista" key={vista}>
        {visibles.map(({ a, v }, i) => (
          <li key={a.id} style={{ ["--i" as string]: i }}>
            <span className="ap-ranking__pos">{i + 1}</span>
            <span className="ap-ranking__arbol">
              <strong>{a.especie_cientifica ?? "Sin especie"}</strong>
              <small>
                {a.tree_code}
                {a.caducifolia ? " · caducifolia" : ""} · LAI {num(a.lai, 1)}
              </small>
            </span>
            <span className="ap-ranking__barra" aria-hidden>
              {vista === "contaminantes" && a.remocion_g ? (
                ORDEN.map((p) => <span key={p} style={{ width: `${(a.remocion_g![p] / max) * 100}%`, background: CONTAMINANTE[p].color }} />)
              ) : (
                <span className={vista === "agua" ? "is-agua" : "is-hoja"} style={{ width: `${(v / max) * 100}%` }} />
              )}
            </span>
            <span className="ap-ranking__valor">
              {num(v, vista === "agua" ? 2 : 0)} <small>{unidad}</small>
            </span>
          </li>
        ))}
      </ol>
      <footer className="ap-ranking__pie">
        {vista === "contaminantes" ? (
          <p className="ap-leyenda">
            {ORDEN.map((p) => (
              <span key={p}>
                <i style={{ background: CONTAMINANTE[p].color }} />
                {CONTAMINANTE[p].etiqueta}
              </span>
            ))}
          </p>
        ) : (
          <span />
        )}
        {filas.length > 5 && (
          <button type="button" className="ap-ranking__mas" onClick={() => setTodos(!todos)}>
            {todos ? "Ver solo los 5 primeros" : `Ver los ${num(filas.length)} árboles`}
          </button>
        )}
      </footer>
    </section>
  );
}

/* ---------- Sección completa ---------- */

export function AportesAmbientales({ d }: { d: IndicadoresProyecto }) {
  const r = d.aportes_ambientales!;
  const f = d.aportes_foliares;
  const ap = (codigo: string) => r.aportes.find((a) => a.codigo === codigo);
  const cob = d.cobertura_arborea;
  const ci = d.estimacion_carbono_integrada;
  const sec = d.estimacion_secuestro_anual;
  const v = r.variables_basicas;
  const partesAire = f
    ? ORDEN.map((p) => ({ clave: p, valor: f.remocion_contaminantes.por_contaminante[p] ?? 0, color: CONTAMINANTE[p].color, etiqueta: `${CONTAMINANTE[p].etiqueta} (kg/año)` }))
    : [];
  const aCob = ap("cobertura_arborea");
  const aCar = ap("carbono_almacenado");
  const aSec = ap("secuestro_carbono");
  const aAire = ap("remocion_contaminantes");
  const aAgua = ap("interceptacion_precipitaciones");

  return (
    <div className="ap">
      <div className="ap-vars" aria-label="Variables básicas del inventario">
        <span className="ap-vars__titulo">Variables básicas del inventario</span>
        {(
          [
            ["Especie", v.con_especie],
            ["Diámetro", v.con_dap],
            ["Altura", v.con_altura],
            ["Condición", v.con_condicion],
          ] as const
        ).map(([et, n]) => (
          <span key={et} className="ap-vars__item">
            <span className="ap-vars__barra">
              <span style={{ width: `${(n / Math.max(1, v.arboles_presentes)) * 100}%` }} />
            </span>
            {et} <b>{num(n)}</b>
          </span>
        ))}
        <span className="ap-vars__total">
          <b>{num(v.con_las_cuatro)}</b> de {num(v.arboles_presentes)} árboles tienen las cuatro
        </span>
      </div>

      <div className="ap-grid">
        {aCob && (
          <Tarjeta
            indice={0}
            aporte={aCob}
            cifra={num(cob?.valor, 2)}
            unidad="%"
            nota={
              cob && cob.valor !== null
                ? `${num(cob.area_cubierta_m2, 0)} m² de copa sobre ${num((cob.superficie_m2 ?? 0) / 10000, 1)} ha; ${num(cob.superposicion_m2, 0)} m² superpuestos contados una vez.`
                : (cob?.motivo ?? aCob.resultado)
            }
          >
            {cob && cob.valor !== null && <Anillo valor={cob.valor} max={Math.max(10, Math.ceil(cob.valor / 10) * 10)} />}
          </Tarjeta>
        )}
        {aCar && (
          <Tarjeta
            indice={1}
            aporte={aCar}
            cifra={num(ci ? ci.aereo.carbono_kg_aprobado + ci.aereo.carbono_kg_exploratorio : null, 0)}
            unidad="kg C"
            nota={ci ? `${num(ci.aereo.carbono_kg_aprobado, 0)} kg C oficiales en ${ci.aprobados} árboles; el resto es exploratorio y no suma.` : aCar.resultado}
          >
            {ci && (
              <Pila
                partes={[
                  { clave: "a", valor: ci.aereo.carbono_kg_aprobado, color: "var(--bio-mint)", etiqueta: "Aprobado (kg C)" },
                  { clave: "e", valor: ci.aereo.carbono_kg_exploratorio, color: "var(--bio-amber)", etiqueta: "Exploratorio (kg C)" },
                ]}
              />
            )}
          </Tarjeta>
        )}
        {aSec && (
          <Tarjeta
            indice={2}
            aporte={aSec}
            cifra={num(d.resumen_proyeccion_anual ? d.resumen_proyeccion_anual.con_proyeccion : sec?.cobertura.simulacion_exploratoria, 0)}
            unidad="árboles"
            nota={
              d.resumen_proyeccion_anual
                ? `de ${num(d.resumen_proyeccion_anual.universo_calculo)} evaluados tienen proyección anual simulada; ${d.resumen_proyeccion_anual.estimacion_fundamentada} fundamentadas.`
                : sec
                  ? `con crecimiento simulado (i-Tree Eco); ${sec.cobertura.estimacion_fundamentada} estimaciones fundamentadas.`
                  : aSec.resultado
            }
          />
        )}
        {aAire && (
          <Tarjeta
            indice={3}
            aporte={aAire}
            cifra={num(f?.remocion_contaminantes.total_kg, 1)}
            unidad="kg/año"
            nota={f ? `de O₃, PM10, SO₂, NO₂ y CO retenidos por ${num(f.area_foliar.total_m2, 0)} m² de hojas.` : aAire.resultado}
          >
            {f && <Pila partes={partesAire} />}
          </Tarjeta>
        )}
        {aAgua && (
          <Tarjeta
            indice={4}
            aporte={aAgua}
            cifra={num(f?.intercepcion_precipitaciones.total_m3, 1)}
            unidad="m³/año"
            nota={
              f
                ? `${num(f.intercepcion_precipitaciones.porcentaje_interceptado, 1)} % de la lluvia que cae sobre las copas (${num(f.intercepcion_precipitaciones.precipitacion_anual_mm, 0)} mm en 2025).`
                : aAgua.resultado
            }
          >
            {f && f.intercepcion_precipitaciones.porcentaje_interceptado !== null && <Gota porcentaje={f.intercepcion_precipitaciones.porcentaje_interceptado} />}
          </Tarjeta>
        )}
      </div>

      {f && f.cobertura.con_area_foliar > 0 && <Ranking d={f} />}

      <details className="ap-metodo">
        <summary>Cómo se calcula y qué falta para cada aporte</summary>
        <div className="ap-metodo__grid">
          {r.aportes.map((a) => (
            <div key={a.codigo}>
              <h4>
                {a.nombre} <span className={`ap-chip ${ESTADO[a.estado].clase}`}>{ESTADO[a.estado].etiqueta}</span>
              </h4>
              <p className="ap-metodo__res">{a.resultado}</p>
              <p>
                <b>Usa:</b> {a.usa.join(" · ")}
              </p>
              {a.falta.length > 0 && (
                <>
                  <b>Falta:</b>
                  <ul>
                    {a.falta.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
        {f && (
          <div className="ap-formulas">
            <p>
              <b>Área foliar:</b> <code>{f.parametros.area_foliar.ecuacion}</code>. {f.parametros.area_foliar.variables}. {f.parametros.area_foliar.rango}.{" "}
              {f.parametros.area_foliar.sin_factor_correccion} Fuente: {f.parametros.area_foliar.fuente}
            </p>
            <p>
              <b>Remoción:</b> <code>{f.parametros.deposicion.formula}</code> {f.parametros.deposicion.simplificacion} Fuente: {f.parametros.deposicion.fuente}
            </p>
            <p>
              <b>Interceptación:</b> <code>{f.parametros.intercepcion.formula}</code> {f.parametros.intercepcion.simplificacion} Fuente:{" "}
              {f.parametros.intercepcion.fuente}
            </p>
            <p>
              <b>Supuestos:</b> {f.parametros.sin_hojas.supuesto} {f.parametros.lai_maximo?.supuesto}
            </p>
            <p>
              <b>Datos ambientales:</b> {f.parametros.serie.fuentes.join(" · ")}
            </p>
          </div>
        )}
        <p className="ap-fuente">Propuesta experimental, no es metodología vigente: ningún resultado suma a los totales oficiales. Marco: {r.marco}</p>
      </details>
    </div>
  );
}
