import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { RiskDot } from "./primitives";
import { PROJECT, RISK_COLOR, type RiskLevel } from "../data/mock";
import { ORDERS, OT_COLOR, TODAY, fmt, isOpen, isOverdue, type Module, type OtState } from "../data/lab";

export function PageHead({ title, meta, actions }: { title: string; meta: string; actions?: ReactNode }) {
  return (
    <header className="phead">
      <div>
        <div className="phead__eyebrow">
          <span className="pill-live">{PROJECT.name}</span>
          <span>{PROJECT.place}</span>
        </div>
        <h1 className="phead__title">{title}</h1>
        <p className="phead__meta">{meta}</p>
      </div>
      {actions && <div className="phead__actions">{actions}</div>}
    </header>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: IconName; label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="kpi">
      <span className="kpi__icon" style={tone ? { color: tone, background: `color-mix(in srgb, ${tone} 16%, transparent)` } : undefined}>
        <Icon name={icon} size={17} />
      </span>
      <span className="kpi__lbl">{label}</span>
      <span className="kpi__val">{value}</span>
      {sub && <span className="kpi__sub">{sub}</span>}
    </div>
  );
}

const LEVELS: RiskLevel[] = ["Bajo", "Moderado", "Alto", "Extremo"];

function Donut() {
  const parts = [
    ...LEVELS.map((l) => ({ key: l, n: PROJECT.riesgo[l], c: RISK_COLOR[l] })),
    { key: "Sin clasificación", n: PROJECT.sinClasificacion, c: "#FFFFFF" },
  ];
  const total = parts.reduce((a, p) => a + p.n, 0);
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 180 180" className="donut" role="img" aria-label={`${total} árboles evaluados por nivel de riesgo`}>
      <circle cx="90" cy="90" r={R} fill="none" className="donut__track" strokeWidth="22" />
      {parts.map((p) => {
        const len = (p.n / total) * C;
        const el = (
          <circle
            key={p.key}
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke={p.c}
            className={p.c === "#FFFFFF" ? "donut__seg--white" : undefined}
            strokeWidth="22"
            strokeDasharray={`${Math.max(0, len - 2)} ${C}`}
            strokeDashoffset={-acc}
            transform="rotate(-90 90 90)"
          />
        );
        acc += len;
        return el;
      })}
      <text x="90" y="88" textAnchor="middle" className="donut__num">{total}</text>
      <text x="90" y="110" textAnchor="middle" className="donut__lbl">evaluados</text>
    </svg>
  );
}

function Bar({ label, n, max, color, suffix = "" }: { label: string; n: number; max: number; color?: string; suffix?: string }) {
  return (
    <li>
      <span>{label}</span>
      <i>
        <b style={{ width: `${(n / max) * 100}%`, background: color }} />
      </i>
      <strong>
        {n}
        {suffix}
      </strong>
    </li>
  );
}

const MODULES: { m: Module | null; label: string; icon: IconName; info: string }[] = [
  { m: "inventario", label: "Inventario", icon: "leaf", info: `${PROJECT.total} árboles` },
  { m: "riesgo", label: "Riesgo Arbóreo", icon: "alert", info: `${PROJECT.evaluados} evaluados` },
  { m: "infraestructura", label: "Infraestructura", icon: "building", info: `${PROJECT.infra.evaluaciones} evaluaciones` },
  { m: "mantencion", label: "Mantención", icon: "wrench", info: `${ORDERS.filter(isOpen).length} OT abiertas` },
  { m: null, label: "Incidencias", icon: "inbox", info: "9 abiertas" },
  { m: null, label: "Índices", icon: "list", info: "Indicadores del modelo" },
];

const INCIDENTS = [
  { estado: "Ingresada", n: 4 },
  { estado: "En revisión", n: 3 },
  { estado: "Derivada", n: 2 },
  { estado: "Resuelta", n: 11 },
];

export function Dashboard({ go, unavailable }: { go: (m: Module) => void; unavailable: (what: string) => void }) {
  const open = ORDERS.filter(isOpen);
  const overdue = ORDERS.filter(isOverdue);
  const next = ORDERS.filter((o) => o.fecha && o.fecha >= TODAY && isOpen(o))
    .sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1))
    .slice(0, 4);
  const otStates: OtState[] = ["Pendiente", "Programada", "En ejecución", "Completada"];
  const maxComp = Math.max(...PROJECT.infra.componentes.map((c) => c.n));

  return (
    <div className="page">
      <PageHead
        title="Dashboard"
        meta="Resumen del proyecto · datos ilustrativos de la maqueta"
        actions={
          <button type="button" className="btn-ghost" onClick={() => go("riesgo")}>
            <Icon name="map" size={16} />
            Ver territorio
          </button>
        }
      />

      <section className="kpis" aria-label="Indicadores principales">
        <Kpi icon="leaf" label="Árboles registrados" value={PROJECT.total} sub={`${PROJECT.estado.activos} activos`} />
        <Kpi icon="pin" label="Georreferenciados" value={PROJECT.georef} sub={`${PROJECT.sinGeoref} sin georreferenciar`} />
        <Kpi icon="clipboard" label="Árboles evaluados" value={PROJECT.evaluados} sub={`${PROJECT.sinEvaluacion} sin evaluación`} />
        <Kpi icon="sparkle" label="Especies" value={PROJECT.especies} sub="en el inventario" />
        <Kpi icon="wrench" label="OT abiertas" value={open.length} sub={`${overdue.length} vencidas`} tone="#7DB8E8" />
        <Kpi icon="inbox" label="Incidencias abiertas" value={9} sub="4 sin revisar" tone="#B79CF2" />
      </section>

      <section className="dash">
        <article className="panel dash__risk">
          <div className="panel__head">
            <h2>Distribución por riesgo</h2>
            <button type="button" className="panel__link" onClick={() => go("riesgo")}>
              Riesgo Arbóreo <Icon name="arrowRight" size={13} />
            </button>
          </div>
          <div className="risk-split">
            <Donut />
            <ul className="risk-legend">
              {LEVELS.map((l) => (
                <li key={l}>
                  <RiskDot level={l} size={11} />
                  <span>{l}</span>
                  <strong>{PROJECT.riesgo[l]}</strong>
                  <em>{Math.round((PROJECT.riesgo[l] / PROJECT.evaluados) * 100)}%</em>
                </li>
              ))}
              <li>
                <RiskDot level="Sin clasificación" size={11} />
                <span>Sin clasificación</span>
                <strong>{PROJECT.sinClasificacion}</strong>
                <em />
              </li>
              <li className="risk-legend__muted">
                <RiskDot level={null} size={11} />
                <span>Sin evaluación</span>
                <strong>{PROJECT.sinEvaluacion}</strong>
                <em />
              </li>
            </ul>
          </div>
        </article>

        <article className="panel dash__comp">
          <div className="panel__head">
            <h2>Composición del inventario</h2>
            <button type="button" className="panel__link" onClick={() => go("inventario")}>
              Inventario <Icon name="arrowRight" size={13} />
            </button>
          </div>
          <div className="lifecycle">
            <div><strong>{PROJECT.estado.activos}</strong><span>Activos</span></div>
            <div><strong>{PROJECT.estado.retirados}</strong><span>Retirados</span></div>
            <div><strong>{PROJECT.estado.tocones}</strong><span>Tocones</span></div>
          </div>
          <span className="panel__sub">Especies más registradas</span>
          <ul className="bars">
            {PROJECT.topEspecies.map((e) => (
              <Bar key={e.nombre} label={e.nombre} n={e.pct} max={30} suffix="%" />
            ))}
          </ul>
        </article>

        <article className="panel dash__ops">
          <div className="panel__head">
            <h2>Operación</h2>
          </div>
          <span className="panel__sub">Órdenes de trabajo por estado</span>
          <ul className="statelist">
            {otStates.map((s) => (
              <li key={s}>
                <i style={{ background: OT_COLOR[s] }} />
                <span>{s}</span>
                <strong>{ORDERS.filter((o) => o.estado === s).length}</strong>
              </li>
            ))}
            <li className="statelist__warn">
              <i className="statelist__dash" />
              <span>Vencidas</span>
              <strong>{overdue.length}</strong>
            </li>
          </ul>
          <span className="panel__sub">Incidencias por estado</span>
          <ul className="statelist">
            {INCIDENTS.map((s) => (
              <li key={s.estado}>
                <i style={{ background: "#B79CF2", opacity: s.estado === "Resuelta" ? 0.4 : 1 }} />
                <span>{s.estado}</span>
                <strong>{s.n}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel dash__next">
          <div className="panel__head">
            <h2>Próximas intervenciones</h2>
            <button type="button" className="panel__link" onClick={() => go("mantencion")}>
              Calendario <Icon name="arrowRight" size={13} />
            </button>
          </div>
          <ul className="agenda">
            {next.map((o) => (
              <li key={o.code}>
                <span className="agenda__date">
                  <strong>{o.fecha!.slice(8, 10)}</strong>
                  <small>oct</small>
                </span>
                <span className="agenda__text">
                  <strong>
                    {o.accion}
                    {o.subtipo ? ` · ${o.subtipo}` : ""}
                  </strong>
                  <small>
                    {o.tree.code} · {o.tree.common} · {o.responsable}
                  </small>
                </span>
                <span className="agenda__state" style={{ ["--c" as string]: OT_COLOR[o.estado] }}>
                  {o.estado}
                </span>
              </li>
            ))}
          </ul>
          <span className="panel__foot">Hoy, {fmt(TODAY)}</span>
        </article>

        <article className="panel dash__infra">
          <div className="panel__head">
            <h2>Infraestructura con daño o interferencia</h2>
            <button type="button" className="panel__link" onClick={() => go("infraestructura")}>
              Mapa <Icon name="arrowRight" size={13} />
            </button>
          </div>
          <ul className="bars bars--blue">
            {PROJECT.infra.componentes.map((c) => (
              <Bar key={c.nombre} label={c.nombre} n={c.n} max={maxComp} />
            ))}
          </ul>
          <span className="panel__foot">
            {PROJECT.infra.conEvaluacion} árboles con evaluación · {PROJECT.infra.sinEvaluacion} sin evaluación
          </span>
        </article>

        <article className="panel dash__mods">
          <div className="panel__head">
            <h2>Módulos</h2>
          </div>
          <div className="modgrid">
            {MODULES.map((m) => (
              <button key={m.label} type="button" className="modtile" onClick={() => (m.m ? go(m.m) : unavailable(m.label))}>
                <span className="modtile__icon">
                  <Icon name={m.icon} size={17} />
                </span>
                <strong>{m.label}</strong>
                <small>{m.info}</small>
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
