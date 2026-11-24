import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { AportesFoliares, Contaminante, IndicadoresProyecto } from "../../types/indicadores";
import { CarbonoIntegradoPanel } from "./CarbonoIntegrado";
import { masa, MOTIVO_SECUESTRO, num } from "./formato";

/**
 * Aportes ambientales del arbolado (CC-087; versión esencial 2026-11-24): los
 * cinco aportes del marco de Nowak (2024), una cifra por tarjeta. Al tocar
 * una tarjeta se abre su detalle. El backend calcula; aquí solo se presenta.
 */

type Clave = "cobertura" | "carbono" | "secuestro" | "aire" | "lluvia";

const CONTAMINANTE: Record<Contaminante, { etiqueta: string; color: string }> = {
  o3: { etiqueta: "O₃", color: "var(--ap-o3)" },
  pm10: { etiqueta: "PM10", color: "var(--ap-pm)" },
  so2: { etiqueta: "SO₂", color: "var(--ap-so2)" },
  no2: { etiqueta: "NO₂", color: "var(--ap-no2)" },
  co: { etiqueta: "CO", color: "var(--ap-co)" },
};
const ORDEN: Contaminante[] = ["o3", "pm10", "so2", "no2", "co"];

/** Una línea de método y fuente por aporte (detalle completo en la documentación del módulo). */
const METODO: Record<Clave, string> = {
  cobertura: "Unión de las copas sobre la superficie del sector; donde las copas se tocan se cuenta una vez.",
  carbono: "Mejor modelo por árbol (volumen × densidad, carbono directo o biomasa). Fuentes: Urban Tree Database, Cruz et al. 2015, i-Tree (Nowak 2024).",
  secuestro: "Carbono del próximo año menos el de hoy, con el crecimiento de i-Tree Eco según especie, luz y condición de la copa (Nowak 2024).",
  aire: "Hora a hora en 2025: contaminante en el aire × deposición en las hojas × copa (Nowak et al. 2006; datos Copernicus).",
  lluvia: "Modelo de i-Tree Eco: la copa retiene lluvia según sus hojas y la evapora (Hirabayashi 2013; lluvia horaria 2025).",
};

/* ---------- Glifos (SVG propios, sin datos) ---------- */

function Glifo({ clave }: { clave: Clave }) {
  const comun = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (clave) {
    case "cobertura":
      return (
        <svg {...comun}>
          <circle cx="9" cy="10" r="5.5" />
          <circle cx="15" cy="12" r="5.5" />
          <path d="M3 20h18" />
        </svg>
      );
    case "carbono":
      return (
        <svg {...comun}>
          <path d="M12 3c4 3 6 6 6 9a6 6 0 0 1-12 0c0-3 2-6 6-9z" />
          <path d="M12 21v-7" />
        </svg>
      );
    case "secuestro":
      return (
        <svg {...comun}>
          <path d="M4 18c4 0 6-3 8-6s4-6 8-6" />
          <path d="M16 6h4v4" />
        </svg>
      );
    case "aire":
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
        </svg>
      );
  }
}

/* ---------- Cifras que cuentan y mini figuras (solo presentan valores de la API) ---------- */

/** Anima de 0 al valor en ~0,9 s; sin animación si el usuario la reduce. */
function useCuenta(valor: number | null) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (valor === null) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setV(valor);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const paso = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setV(valor * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return valor === null ? null : v;
}

function Cifra({ valor, decimales, unidad }: { valor: number | null; decimales: number; unidad: string }) {
  const v = useCuenta(valor);
  return (
    <span className="ap-tarjeta__cifra" aria-label={valor === null ? "sin dato" : `${num(valor, decimales)} ${unidad}`}>
      {v === null ? "—" : num(v, decimales)}
      {v !== null && <small>{unidad}</small>}
    </span>
  );
}

function Anillo({ valor }: { valor: number }) {
  const max = Math.max(10, Math.ceil(valor / 10) * 10);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ap-viz ap-anillo" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={r} className="ap-anillo__pista" />
      <circle cx="28" cy="28" r={r} className="ap-anillo__valor" strokeDasharray={`${(c * Math.min(valor, max)) / max} ${c}`} transform="rotate(-90 28 28)" />
    </svg>
  );
}

function Gota({ porcentaje }: { porcentaje: number }) {
  const y = 58 - (Math.max(0, Math.min(100, porcentaje)) / 100) * 54;
  const forma = "M24 4C24 4 6 26 6 40a18 18 0 0 0 36 0C42 26 24 4 24 4z";
  return (
    <svg className="ap-viz ap-gota" viewBox="0 0 48 64" aria-hidden>
      <defs>
        <clipPath id="ap-gota-clip">
          <path d={forma} />
        </clipPath>
      </defs>
      <g clipPath="url(#ap-gota-clip)">
        <rect x="0" y="0" width="48" height="64" className="ap-gota__fondo" />
        <rect x="0" y={y} width="48" height="64" className="ap-gota__agua" />
        <path d={`M-12 ${y} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 v4 h-60z`} className="ap-gota__ola" />
      </g>
      <path d={forma} className="ap-gota__borde" />
    </svg>
  );
}

function Curva() {
  return (
    <svg className="ap-viz ap-curva" viewBox="0 0 64 40" aria-hidden>
      <path d="M2 36 C 20 34, 30 26, 40 18 S 56 6, 62 4" className="ap-curva__linea" />
      <circle cx="62" cy="4" r="3" className="ap-curva__punto" />
    </svg>
  );
}

function Hoja() {
  return (
    <svg className="ap-viz ap-hoja" viewBox="0 0 48 48" aria-hidden>
      <path d="M8 40C8 20 22 8 42 6c-2 20-14 34-34 34z" className="ap-hoja__fondo" />
      <path d="M8 40L32 16" className="ap-hoja__vena" />
    </svg>
  );
}

/* ---------- Ranking de árboles (aire o lluvia) ---------- */

function Ranking({ d, vista }: { d: AportesFoliares; vista: "aire" | "lluvia" }) {
  const [todos, setTodos] = useState(false);
  const filas = useMemo(() => {
    const valor = (a: AportesFoliares["arboles"][number]) => (vista === "aire" ? a.remocion_total_g : a.intercepcion_m3 === null ? null : a.intercepcion_m3 * 1000);
    return d.arboles
      .filter((a) => valor(a) !== null)
      .map((a) => ({ a, v: valor(a)! }))
      .sort((x, y) => y.v - x.v);
  }, [d, vista]);
  const max = filas[0]?.v ?? 0;
  const visibles = todos ? filas : filas.slice(0, 5);
  return (
    <div className="ap-ranking">
      <h4>Árboles que más aportan</h4>
      <ol className="ap-ranking__lista">
        {visibles.map(({ a, v }, i) => (
          <li key={a.id} style={{ ["--i" as string]: i }}>
            <span className="ap-ranking__pos">{i + 1}</span>
            <span className="ap-ranking__arbol">
              <strong>{a.especie_cientifica ?? "Sin especie"}</strong>
              <small>{a.tree_code}</small>
            </span>
            <span className="ap-ranking__barra" aria-hidden>
              {vista === "aire" && a.remocion_g ? (
                ORDEN.map((p) => <span key={p} style={{ width: `${(a.remocion_g![p] / max) * 100}%`, background: CONTAMINANTE[p].color }} />)
              ) : (
                <span className="is-agua" style={{ width: `${(v / max) * 100}%` }} />
              )}
            </span>
            <span className="ap-ranking__valor">
              {num(v, 0)} <small>{vista === "aire" ? "g/año" : "L/año"}</small>
            </span>
          </li>
        ))}
      </ol>
      {filas.length > 5 && (
        <button type="button" className="ap-ranking__mas" onClick={() => setTodos(!todos)}>
          {todos ? "Ver menos" : `Ver los ${num(filas.length)} árboles`}
        </button>
      )}
    </div>
  );
}

/* ---------- Sección ---------- */

export function AportesAmbientales({ d, onVerArboles }: { d: IndicadoresProyecto; onVerArboles?: () => void }) {
  const [abierto, setAbierto] = useState<Clave | null>(null);
  const r = d.aportes_ambientales!;
  const f = d.aportes_foliares;
  const cob = d.cobertura_arborea;
  const ci = d.estimacion_carbono_integrada;
  const sec = d.estimacion_secuestro_anual;
  const rp = d.resumen_proyeccion_anual;
  const v = r.variables_basicas;
  const carbonoKg = ci ? ci.aereo.carbono_kg_aprobado + ci.aereo.carbono_kg_exploratorio : null;
  const carbono = masa(carbonoKg === null ? null : carbonoKg / 1000);
  const co2 = masa(ci ? ci.aereo.co2e_kg / 1000 : null);

  const tarjetas: Array<{ clave: Clave; nombre: string; cifra: string; valor: number | null; dec: number; unidad: string; nota: string; viz?: React.ReactNode }> = [
    {
      clave: "cobertura",
      nombre: "Cobertura arbórea",
      cifra: num(cob?.valor, 1),
      valor: cob?.valor ?? null,
      dec: 1,
      unidad: "%",
      viz: cob?.valor != null ? <Anillo valor={cob.valor} /> : undefined,
      nota: cob?.valor != null ? `${num(cob.area_cubierta_m2, 0)} m² de copa` : (cob?.motivo ?? "Sin dato"),
    },
    {
      clave: "carbono",
      nombre: "Carbono almacenado",
      cifra: carbono.valor,
      valor: carbonoKg === null ? null : carbonoKg >= 1000 ? carbonoKg / 1000 : carbonoKg,
      dec: carbonoKg !== null && carbonoKg >= 1000 ? 1 : 0,
      unidad: `${carbono.unidad} C`,
      viz: <Hoja />,
      nota: ci ? `${co2.valor} ${co2.unidad} CO₂e · ${num(ci.aprobados + ci.exploratorios)} árboles` : "Sin dato",
    },
    {
      clave: "secuestro",
      nombre: "Secuestro de carbono",
      cifra: num(sec?.total_fundamentado.co2_kg_anio ?? null, 0),
      valor: sec?.total_fundamentado.co2_kg_anio ?? null,
      dec: 0,
      unidad: "kg CO₂/año",
      viz: <Curva />,
      nota: sec ? `${num(sec.cobertura.estimacion_fundamentada)} árboles con estimación` : "Sin dato",
    },
    {
      clave: "aire",
      nombre: "Remoción de contaminantes",
      cifra: num(f?.remocion_contaminantes.total_kg ?? null, 1),
      valor: f?.remocion_contaminantes.total_kg ?? null,
      dec: 1,
      unidad: "kg/año",
      viz: f ? (
        <span className="ap-viz ap-pila" aria-hidden>
          {ORDEN.map((p) => (
            <span key={p} style={{ flexGrow: f.remocion_contaminantes.por_contaminante[p] ?? 0, background: CONTAMINANTE[p].color }} />
          ))}
        </span>
      ) : undefined,
      nota: "O₃, PM10, SO₂, NO₂ y CO",
    },
    {
      clave: "lluvia",
      nombre: "Lluvia interceptada",
      cifra: num(f?.intercepcion_precipitaciones.total_m3 ?? null, 0),
      valor: f?.intercepcion_precipitaciones.total_m3 ?? null,
      dec: 0,
      unidad: "m³/año",
      viz: f?.intercepcion_precipitaciones.porcentaje_interceptado != null ? <Gota porcentaje={f.intercepcion_precipitaciones.porcentaje_interceptado} /> : undefined,
      nota: f ? `${num(f.intercepcion_precipitaciones.porcentaje_interceptado, 0)} % de la lluvia sobre las copas` : "Sin dato",
    },
  ];

  const detalle = (c: Clave): React.ReactNode => {
    switch (c) {
      case "cobertura":
        return cob && cob.valor !== null ? (
          <p className="ap-det__lead">
            Las copas cubren <b>{num(cob.area_cubierta_m2, 0)} m²</b> de {num((cob.superficie_m2 ?? 0) / 10000, 1)} ha. Donde se tocan ({num(cob.superposicion_m2, 0)} m²)
            se cuentan una sola vez.
          </p>
        ) : (
          <p className="ap-det__lead">{cob?.motivo ?? "Sin dato."}</p>
        );
      case "carbono":
        return ci ? (
          <>
            <p className="ap-det__lead">
              <b>
                {carbono.valor} {carbono.unidad} de carbono
              </b>{" "}
              ({co2.valor} {co2.unidad} de CO₂ equivalente) guardados en {num(ci.aprobados + ci.exploratorios)} árboles. Cada árbol usa el mejor modelo disponible para su
              especie.
            </p>
            <CarbonoIntegradoPanel d={ci} compacto />
          </>
        ) : null;
      case "secuestro":
        return (
          <>
            <p className="ap-det__lead">
              El arbolado suma <b>{num(sec?.total_fundamentado.co2_kg_anio ?? null, 0)} kg de CO₂ al año</b> al crecer.
              {rp && rp.simulacion_secuestro_lenoso + rp.simulacion_variacion_aereo_total > 0
                ? ` Otros ${num(rp.simulacion_secuestro_lenoso + rp.simulacion_variacion_aereo_total)} árboles tienen solo un rango, porque su especie no tiene una velocidad de crecimiento publicada.`
                : ""}
            </p>
            {rp && rp.no_estimable > 0 && (
              <ul className="ap-det__motivos">
                {Object.entries(rp.motivos_no_estimable)
                  .filter(([, n]) => n > 0)
                  .map(([m, n]) => (
                    <li key={m}>
                      <span>{MOTIVO_SECUESTRO[m] ?? m}</span>
                      <b>{num(n)}</b>
                    </li>
                  ))}
              </ul>
            )}
            {onVerArboles && (
              <button type="button" className="ap-ranking__mas" onClick={onVerArboles}>
                Ver cada árbol →
              </button>
            )}
          </>
        );
      case "aire":
        return f ? (
          <>
            <ul className="ap-det__contaminantes">
              {ORDEN.map((p) => (
                <li key={p}>
                  <i style={{ background: CONTAMINANTE[p].color }} />
                  {CONTAMINANTE[p].etiqueta} <b>{num(f.remocion_contaminantes.por_contaminante[p], 2)} kg</b>
                </li>
              ))}
            </ul>
            <Ranking d={f} vista="aire" />
          </>
        ) : null;
      case "lluvia":
        return f ? (
          <>
            <p className="ap-det__lead">
              Las copas retienen <b>{num((f.intercepcion_precipitaciones.total_m3 ?? 0) * 1000, 0)} litros al año</b> que no llegan al suelo ni a los desagües, de{" "}
              {num(f.intercepcion_precipitaciones.precipitacion_anual_mm, 0)} mm de lluvia en 2025.
            </p>
            <Ranking d={f} vista="lluvia" />
          </>
        ) : null;
    }
  };

  return (
    <div className="ap">
      <p className="ap-vars">
        De {num(v.arboles_presentes)} árboles, <b>{num(v.con_dap)}</b> tienen especie, diámetro y altura medidos y <b>{num(v.con_las_cuatro)}</b> también su condición: con
        ellos se estiman los aportes.
      </p>

      <div className="ap-grid" role="tablist" aria-label="Aportes ambientales">
        {tarjetas.map((t, i) => (
          <button
            key={t.clave}
            type="button"
            role="tab"
            aria-selected={abierto === t.clave}
            aria-controls="ap-detalle"
            className={`ap-tarjeta ap-tarjeta--${t.clave} ${abierto === t.clave ? "is-on" : ""}`}
            style={{ ["--i" as string]: i }}
            onClick={() => setAbierto(abierto === t.clave ? null : t.clave)}
          >
            <span className="ap-tarjeta__glifo">
              <Glifo clave={t.clave} />
            </span>
            <span className="ap-tarjeta__nombre">{t.nombre}</span>
            <Cifra valor={t.valor} decimales={t.dec} unidad={t.unidad} />
            <span className="ap-tarjeta__nota">{t.nota}</span>
            {t.viz && <span className="ap-tarjeta__viz">{t.viz}</span>}
          </button>
        ))}
      </div>

      {abierto && (
        <section id="ap-detalle" className="ap-det" role="tabpanel" key={abierto}>
          <header>
            <h3>{tarjetas.find((t) => t.clave === abierto)!.nombre}</h3>
            <button type="button" className="ap-det__cerrar" onClick={() => setAbierto(null)} aria-label="Cerrar detalle">
              ×
            </button>
          </header>
          {detalle(abierto)}
          <p className="ap-det__metodo">
            <span>Cómo se calcula</span> {METODO[abierto]}
          </p>
        </section>
      )}
    </div>
  );
}
