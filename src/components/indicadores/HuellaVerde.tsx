import type { ReactNode } from "react";
import type { IndicadoresProyecto, NivelTaxonomico } from "../../types/indicadores";
import { masa, num, pct, MOTIVO_CARBONO } from "./formato";

/**
 * Vista del proyecto (maqueta «La huella verde de la plaza»). Muestra lo
 * que entrega B19 (hoja INDICES, filas 3 a 13; CC-016) y la estimación de
 * carbono aéreo leñoso (CC-069 v1). Lo que la metodología no define
 * todavía (captura anual, servicios del arbolado) se muestra como
 * «método en definición», nunca con un número.
 */

export interface AporteArbol {
  tree_id: string;
  tree_code: string;
  nombre: string | null;
  carbono_kg: number;
}

export type Aportes = { estado: "cargando" } | { estado: "listo"; arboles: AporteArbol[]; evaluados: number } | { estado: "no_disponible"; motivo: string };

function Estado({ tipo, children }: { tipo: "resuelto" | "pendiente"; children: ReactNode }) {
  return <span className={`bio-tag bio-tag--${tipo}`}>{children}</span>;
}

function Kpi({ etiqueta, valor, unidad, nota, motivo }: { etiqueta: string; valor: string; unidad?: string; nota: ReactNode; motivo?: string | null }) {
  return (
    <article className="bio-card bio-kpi">
      <span className="bio-kpi__lbl">{etiqueta}</span>
      <span className="bio-kpi__val">
        {valor}
        {unidad && valor !== "—" && <small>{unidad}</small>}
      </span>
      <span className="bio-kpi__note">{motivo ?? nota}</span>
    </article>
  );
}

/** Gota de carbono: el nivel es la cobertura del cálculo (árboles con resultado / presentes). */
function GotaCarbono({ nivel }: { nivel: number }) {
  const h = 150;
  const y = 18 + (1 - Math.max(0, Math.min(1, nivel))) * (h - 18);
  return (
    <svg viewBox="0 0 120 170" className="bio-drop" aria-hidden="true">
      <defs>
        <clipPath id="bio-drop-clip">
          <path d="M60 6 C60 6 12 70 12 108 a48 48 0 0 0 96 0 C108 70 60 6 60 6Z" />
        </clipPath>
        <linearGradient id="bio-drop-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--bio-amber-strong)" />
          <stop offset="1" stopColor="var(--bio-amber)" />
        </linearGradient>
      </defs>
      <path className="bio-drop__shell" d="M60 6 C60 6 12 70 12 108 a48 48 0 0 0 96 0 C108 70 60 6 60 6Z" />
      <g clipPath="url(#bio-drop-clip)">
        <rect className="bio-drop__level" x="0" y={y} width="120" height={170 - y} fill="url(#bio-drop-fill)" />
      </g>
      <path className="bio-drop__vein" d="M60 150 V92 M60 112 C48 104 42 96 40 86 M60 102 C72 96 78 88 80 78" />
    </svg>
  );
}

function Regla102030({ datos }: { datos: IndicadoresProyecto["diversidad_taxonomica_10_20_30"] }) {
  const niveles: [string, NivelTaxonomico, boolean][] = [
    ["Especie", datos.especie, true],
    ["Género", datos.genero, false],
    ["Familia", datos.familia, false],
  ];
  const generoExcedido = datos.genero.taxones.find((t) => t.supera_umbral);
  return (
    <article className="bio-card bio-panel bio-regla">
      <header className="bio-panel__head">
        <h2>Regla 10-20-30</h2>
        <span className="bio-panel__hint">la línea marca el máximo recomendado</span>
      </header>
      {datos.denominador === 0 ? (
        <p className="bio-empty">Sin árboles presentes en este ámbito.</p>
      ) : (
        niveles.map(([nombre, n, cursiva]) => (
          <div key={nombre} className="bio-regla__nivel">
            <div className="bio-regla__titulo">
              <strong>{nombre}</strong>
              <span>máx. {n.umbral_porcentaje} %</span>
            </div>
            {n.taxones.length === 0 && <p className="bio-empty bio-empty--small">Sin dato en el catálogo para ningún árbol.</p>}
            <ul>
              {n.taxones.slice(0, 5).map((t) => (
                <li key={t.taxon} className={t.supera_umbral ? "is-over" : ""}>
                  <span className={cursiva ? "bio-regla__taxon bio-regla__taxon--it" : "bio-regla__taxon"}>{t.taxon}</span>
                  <span className="bio-bar" style={{ ["--valor" as string]: `${Math.min(100, t.porcentaje ?? 0)}%`, ["--umbral" as string]: `${n.umbral_porcentaje}%` }}>
                    <i />
                    <b aria-hidden="true" />
                  </span>
                  <span className="bio-regla__pct">{pct(t.porcentaje)}</span>
                </li>
              ))}
            </ul>
            {n.sin_dato.arboles > 0 && (
              <p className="bio-regla__sindato">
                {num(n.sin_dato.arboles)} sin dato de {nombre.toLowerCase()} en el catálogo ({pct(n.sin_dato.porcentaje)})
              </p>
            )}
          </div>
        ))
      )}
      {generoExcedido && (
        <p className="bio-regla__nota">
          El género <em>{generoExcedido.taxon}</em> reúne {num(generoExcedido.arboles)} de {num(datos.denominador)} árboles y supera el máximo de {datos.genero.umbral_porcentaje} %.
        </p>
      )}
    </article>
  );
}

function PerfilTamanos({ d }: { d: IndicadoresProyecto }) {
  const cd = d.clases_diametricas;
  const evaluados = cd.denominador_evaluados ?? cd.denominador ?? 0;
  const sinEvaluacion = d.cobertura.arboles_sin_evaluacion_valida;
  // Se muestran las clases hasta la mayor con árboles (mínimo cuatro), para que el gráfico se lea.
  const ultima = cd.clases.reduce((m, c, i) => (c.arboles > 0 ? i : m), -1);
  const visibles = cd.clases.slice(0, Math.max(4, ultima + 1));
  const barras = [
    ...visibles.map((c) => ({ clave: c.codigo, etiqueta: c.etiqueta.replace(" cm", ""), n: c.arboles, tipo: "clase" as const })),
    ...(cd.sin_dap.arboles > 0 ? [{ clave: "sin_dap", etiqueta: "Sin DAP", n: cd.sin_dap.arboles, tipo: "sin" as const }] : []),
    ...(sinEvaluacion !== undefined && sinEvaluacion > 0 ? [{ clave: "sin_eval", etiqueta: "Sin evaluación", n: sinEvaluacion, tipo: "sin" as const }] : []),
  ];
  const max = Math.max(1, ...barras.map((b) => b.n));
  return (
    <article className="bio-card bio-panel bio-perfil">
      <header className="bio-panel__head">
        <h2>Perfil de tamaños</h2>
      </header>
      <p className="bio-panel__sub">Árboles por clase diamétrica (DAP vigente)</p>
      <div className="bio-perfil__chart" role="img" aria-label={barras.map((b) => `${b.etiqueta}: ${b.n}`).join(", ")}>
        {barras.map((b) => (
          <div key={b.clave} className={`bio-perfil__col bio-perfil__col--${b.tipo}`}>
            <span className="bio-perfil__n">{b.n}</span>
            <span className="bio-perfil__bar" style={{ height: `${(b.n / max) * 100}%` }} />
            <span className="bio-perfil__lbl">{b.etiqueta}</span>
          </div>
        ))}
      </div>
      <p className="bio-panel__foot">
        {sinEvaluacion !== undefined
          ? `${num(evaluados)} árboles con evaluación completa vigente${sinEvaluacion > 0 ? ` · ${num(sinEvaluacion)} todavía sin evaluación: se suman al evaluarse` : ""}.`
          : `${num(evaluados)} árboles presentes en la distribución.`}
      </p>
    </article>
  );
}

function LosQueMasAportan({ aportes }: { aportes: Aportes }) {
  return (
    <article className="bio-card bio-panel bio-aportan">
      <header className="bio-panel__head">
        <h2>Los que más aportan</h2>
        <Estado tipo="resuelto">CC-069 v1</Estado>
      </header>
      {aportes.estado === "cargando" && <p className="bio-skeleton-list" aria-busy="true">Calculando el orden…</p>}
      {aportes.estado === "no_disponible" && <p className="bio-empty">{aportes.motivo}</p>}
      {aportes.estado === "listo" &&
        (aportes.arboles.length === 0 ? (
          <p className="bio-empty">Ningún árbol evaluado tiene todavía una estimación de carbono.</p>
        ) : (
          <ol className="bio-aportan__list">
            {aportes.arboles.slice(0, 5).map((a, i) => (
              <li key={a.tree_id}>
                <span className="bio-aportan__pos">{i + 1}</span>
                <span className="bio-aportan__who">
                  <code>{a.tree_code}</code>
                  <span>{a.nombre ?? "Especie sin identificar"}</span>
                </span>
                <span className="bio-aportan__val">
                  {num(a.carbono_kg, 0)} <small>kg C</small>
                </span>
              </li>
            ))}
          </ol>
        ))}
      {aportes.estado === "listo" && <p className="bio-panel__foot">Carbono aéreo leñoso por árbol, entre los {num(aportes.evaluados)} con evaluación vigente.</p>}
    </article>
  );
}

/** Servicios del arbolado: filas de INDICES que siguen «Pendiente» (CC-016). Sin números. */
const SERVICIOS: { clave: string; titulo: string; detalle: string; icono: string }[] = [
  { clave: "agua", titulo: "Agua", detalle: "Escorrentía evitada", icono: "M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" },
  { clave: "aire", titulo: "Aire", detalle: "Remoción de contaminantes", icono: "M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8" },
  { clave: "sombra", titulo: "Sombra", detalle: "Reducción de radiación UV", icono: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" },
  { clave: "fauna", titulo: "Fauna", detalle: "Hábitat para aves", icono: "M4 15c4 0 6-3 8-6 2 3 4 6 8 6M8 15l-2 4M16 15l2 4" },
  { clave: "energia", titulo: "Energía", detalle: "Consumo de viviendas", icono: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z" },
  { clave: "valor", titulo: "Valor", detalle: "Valor compensatorio (CLP)", icono: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
];

export function HuellaVerde({ d, aportes }: { d: IndicadoresProyecto; aportes: Aportes }) {
  const carbono = d.estimacion_carbono_aereo_lenoso;
  const c = carbono ? masa(carbono.total.carbono_t) : null;
  const co2 = carbono ? masa(carbono.total.co2e_t) : null;
  const sinResultado = carbono ? carbono.cobertura.presentes - carbono.cobertura.con_resultado : 0;
  const motivosTop = carbono
    ? Object.entries(carbono.cobertura.motivos)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];
  const s = d.riqueza_especies.valor;
  const area = d.area_proyectada_copa;
  const copa = d.diametro_medio_copa;

  return (
    <div className="bio-huella">
      <section className="bio-hero-row">
        <article className={`bio-card bio-hero ${carbono ? "" : "bio-hero--pendiente"}`}>
          <GotaCarbono nivel={carbono && carbono.cobertura.presentes > 0 ? carbono.cobertura.con_resultado / carbono.cobertura.presentes : 0} />
          <div className="bio-hero__body">
            <span className="bio-hero__lbl">Carbono aéreo leñoso almacenado</span>
            {carbono ? (
              <>
                <span className="bio-hero__val">
                  {c!.valor}
                  <small>{c!.unidad ? `${c!.unidad} C` : ""}</small>
                </span>
                <span className="bio-hero__sub">
                  en {num(carbono.cobertura.con_resultado)} {carbono.cobertura.con_resultado === 1 ? "árbol" : "árboles"} con estimación
                  {sinResultado > 0 && ` · ${num(sinResultado)} sin estimación`}
                </span>
                {co2!.valor !== "—" && (
                  <span className="bio-hero__eq">
                    ≈ {co2!.valor} {co2!.unidad} de CO₂ equivalente
                  </span>
                )}
                {motivosTop.length > 0 && (
                  <span className="bio-hero__motivos">
                    {motivosTop.map(([m, n]) => `${MOTIVO_CARBONO[m] ?? m}: ${n}`).join(" · ")}
                  </span>
                )}
                <span className="bio-hero__tags">
                  <Estado tipo="resuelto">{carbono.metodo.version}</Estado>
                  <Estado tipo="pendiente">Captura anual: método en definición</Estado>
                </span>
                <details className="bio-hero__details">
                  <summary>Qué incluye la estimación</summary>
                  <ul>
                    {carbono.limitaciones.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </details>
              </>
            ) : (
              <>
                <span className="bio-hero__val bio-hero__val--muted">—</span>
                <span className="bio-hero__sub">La estimación de carbono (CC-069) todavía no está publicada en la API de la plataforma.</span>
                <span className="bio-hero__tags">
                  <Estado tipo="pendiente">Preparado para integración</Estado>
                </span>
              </>
            )}
          </div>
        </article>

        <div className="bio-kpis">
          <Kpi etiqueta="Árboles presentes" valor={num(d.numero_total_arboles.valor)} nota="Número total de árboles" />
          <Kpi
            etiqueta="Densidad arbórea"
            valor={num(d.densidad_arborea.valor, 2)}
            unidad="árb/ha"
            nota={
              d.densidad_arborea.superficie_m2
                ? `${num(d.densidad_arborea.numerador)} árboles en ${num(d.densidad_arborea.superficie_m2 / 10000, 2)} ha`
                : ""
            }
            motivo={d.densidad_arborea.valor === null ? d.densidad_arborea.motivo : null}
          />
          <Kpi
            etiqueta="Riqueza de especies"
            valor={num(s)}
            nota={`especies distintas${d.riqueza_especies.n_no_identificados > 0 ? ` · ${num(d.riqueza_especies.n_no_identificados)} sin identificar` : ""}`}
          />
          <Kpi
            etiqueta="Diversidad de Shannon (H′)"
            valor={num(d.diversidad_shannon.valor, 2)}
            nota={s > 1 ? `máximo posible con ${s} especies: ${num(Math.log(s), 2)}` : "requiere más de una especie"}
            motivo={d.diversidad_shannon.valor === null ? "Sin árboles identificados a nivel de especie." : null}
          />
          <Kpi
            etiqueta="Diámetro medio de copa"
            valor={num(copa.valor, 2)}
            unidad="m"
            nota={`${num(copa.n_validos)} ${copa.n_validos === 1 ? "árbol" : "árboles"} con copa medida${copa.n_sin_medicion > 0 ? ` · ${num(copa.n_sin_medicion)} sin medición` : ""}`}
            motivo={copa.valor === null ? "Ningún árbol tiene la copa medida." : null}
          />
          <Kpi
            etiqueta="Área proyectada de copa"
            valor={num(area.total_m2, 1)}
            unidad="m²"
            nota={`suma de ${num(area.n_con_area)} ${area.n_con_area === 1 ? "árbol medido" : "árboles medidos"}`}
            motivo={area.total_m2 === null ? "Ningún árbol tiene los dos diámetros de copa." : null}
          />
        </div>
      </section>

      <section className="bio-grid3">
        <Regla102030 datos={d.diversidad_taxonomica_10_20_30} />
        <PerfilTamanos d={d} />
        <LosQueMasAportan aportes={aportes} />
      </section>

      <section className="bio-origen bio-card">
        <div>
          <span className="bio-origen__lbl">Proporción de nativos</span>
          <strong>{pct(d.proporcion_origen.nativos.porcentaje)}</strong>
          <span>{num(d.proporcion_origen.nativos.arboles)} árboles</span>
        </div>
        <div>
          <span className="bio-origen__lbl">Proporción de introducidos</span>
          <strong>{pct(d.proporcion_origen.introducidos.porcentaje)}</strong>
          <span>{num(d.proporcion_origen.introducidos.arboles)} árboles</span>
        </div>
        <div>
          <span className="bio-origen__lbl">Origen no determinado</span>
          <strong>{pct(d.proporcion_origen.origen_no_determinado.porcentaje)}</strong>
          <span>{num(d.proporcion_origen.origen_no_determinado.arboles)} árboles sin origen en el catálogo</span>
        </div>
        <div>
          <span className="bio-origen__lbl">Identificados a nivel de especie</span>
          <strong>{pct(d.cobertura_taxonomica.porcentaje_identificados)}</strong>
          <span>
            {num(d.cobertura_taxonomica.identificados_especie)} de {num(d.cobertura_taxonomica.presentes)} presentes
          </span>
        </div>
      </section>

      <section className="bio-card bio-servicios">
        <header className="bio-panel__head">
          <h2>Servicios del arbolado · próximamente</h2>
          <span className="bio-panel__hint">Cada uno se activa cuando su método quede definido en la hoja INDICES</span>
        </header>
        <ul>
          {SERVICIOS.map((sv) => (
            <li key={sv.clave} className="bio-servicio">
              <span className={`bio-servicio__icon bio-servicio__icon--${sv.clave}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={sv.icono} />
                </svg>
              </span>
              <strong>{sv.titulo}</strong>
              <span>{sv.detalle}</span>
              <small>Método en definición</small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
