import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Glass, IconButton } from "./primitives";
import { PageHead } from "./Dashboard";
import { ORDERS, OT_COLOR, TODAY, fmt, isOpen, isOverdue, type WorkOrder } from "../data/lab";
import type { Role } from "../data/nav";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function monthCells(y: number, m: number) {
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const days = new Date(y, m + 1, 0).getDate();
  const rows = Math.ceil((offset + days) / 7);
  return Array.from({ length: rows * 7 }, (_, i) => {
    const d = new Date(y, m, i - offset + 1);
    return { iso: iso(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === m, weekend: i % 7 >= 5 };
  });
}

function Chip({ o, sel, onClick }: { o: WorkOrder; sel: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`evt ${isOverdue(o) ? "evt--late" : ""} ${o.estado === "Cancelada" ? "evt--off" : ""} ${sel ? "is-sel" : ""}`}
      style={{ ["--c" as string]: OT_COLOR[o.estado] }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${o.code} · ${o.accion}${o.subtipo ? ` · ${o.subtipo}` : ""} · ${o.estado}${isOverdue(o) ? " · Vencida" : ""}`}
    >
      <i />
      <span>
        {o.accion}
        {o.subtipo ? ` · ${o.subtipo}` : ""}
      </span>
    </button>
  );
}

function Detail({ o, role, open, onSelect, onClose }: { o: WorkOrder; role: Role; open: WorkOrder[]; onSelect: (o: WorkOrder) => void; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Árbol", `${o.tree.code} · ${o.tree.common}`],
    ["Ubicación", o.tree.place],
    ["Acción solicitada", o.accion],
    ["Subtipo", o.subtipo ?? "—"],
    ["Fecha programada", o.fecha ? fmt(o.fecha) : "Sin fecha"],
    ["Responsable", o.responsable ?? "—"],
  ];
  return (
    <Glass tone="light" className="otcard" aria-label={`Orden ${o.code}`}>
      <div className="otcard__head">
        <div>
          <span className="sheet__code mono">{o.code}</span>
          <h3>
            {o.accion}
            {o.subtipo ? ` · ${o.subtipo}` : ""}
          </h3>
        </div>
        <IconButton icon="close" label="Volver a órdenes pendientes" tone="light" size={32} onClick={onClose} />
      </div>
      <div className="otcard__state">
        <span className="ot-state" style={{ ["--c" as string]: OT_COLOR[o.estado] }}>
          {o.estado}
        </span>
        {isOverdue(o) && <span className="ot-late">Vencida</span>}
      </div>
      <div className="otcard__grid">
        {rows.map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      {o.observacion && <p className="otcard__obs">{o.observacion}</p>}
      <MiniMap orders={isOpen(o) ? open : [...open, o]} selected={o} onSelect={onSelect} />
      <div className="otcard__actions">
        {role === "municipal" ? (
          <>
            <button type="button" className="btn-secondary">Cambiar estado</button>
            <button type="button" className="btn-secondary">Ver árbol</button>
          </>
        ) : (
          <span className="readonly-tag">Solo lectura · Administrador</span>
        )}
      </div>
    </Glass>
  );
}

function MiniMap({ orders, selected, onSelect }: { orders: WorkOrder[]; selected: WorkOrder | null; onSelect: (o: WorkOrder) => void }) {
  return (
    <div className="minimap" role="application" aria-label="Mapa de órdenes abiertas (imagen aérea ilustrativa)">
      <div className="minimap__inner">
        <div className="map__imagery" />
        <div className="map__grade" />
        {orders.map((o) => (
          <button
            key={o.code}
            type="button"
            className={`mpin ${selected?.code === o.code ? "is-sel" : ""} ${isOverdue(o) ? "mpin--late" : ""}`}
            style={{ left: o.tree.x, top: o.tree.y, ["--c" as string]: OT_COLOR[o.estado] }}
            aria-label={`${o.code} · ${o.tree.code}`}
            onClick={() => onSelect(o)}
          />
        ))}
      </div>
    </div>
  );
}

export function Maintenance({ role }: { role: Role }) {
  const [ym, setYm] = useState<[number, number]>([2026, 9]);
  const [sel, setSel] = useState<WorkOrder | null>(() => ORDERS.find((o) => location.hash.includes(`ot${o.code.slice(-3)}`)) ?? null);
  const cells = useMemo(() => monthCells(ym[0], ym[1]), [ym]);
  const byDay = useMemo(() => {
    const m = new Map<string, WorkOrder[]>();
    ORDERS.forEach((o) => o.fecha && m.set(o.fecha, [...(m.get(o.fecha) ?? []), o]));
    return m;
  }, []);

  const open = ORDERS.filter(isOpen);
  const pending = [...open].sort((a, b) => {
    const k = (o: WorkOrder) => (isOverdue(o) ? 0 : !o.fecha ? 1 : 2);
    return k(a) - k(b) || (a.fecha ?? "").localeCompare(b.fecha ?? "");
  });
  const stats = [
    { lbl: "Intervenciones pendientes", n: ORDERS.filter((o) => o.estado === "Pendiente").length },
    { lbl: "Programadas", n: ORDERS.filter((o) => o.estado === "Programada").length },
    { lbl: "Vencidas", n: ORDERS.filter(isOverdue).length, warn: true },
    { lbl: "Realizadas", n: ORDERS.filter((o) => o.estado === "Completada").length },
  ];
  const shift = (d: number) => setYm(([y, m]) => (m + d < 0 ? [y - 1, 11] : m + d > 11 ? [y + 1, 0] : [y, m + d]));

  return (
    <div className="page page--maint">
      <PageHead
        title="Mantención"
        meta="Calendario de órdenes de trabajo · datos ilustrativos"
        actions={
          <>
            <div className="stats">
              {stats.map((s) => (
                <span key={s.lbl} className={s.warn ? "stats__warn" : ""}>
                  <strong>{s.n}</strong>
                  {s.lbl}
                </span>
              ))}
            </div>
            {role === "municipal" && (
              <button type="button" className="btn-primary btn-primary--auto">
                <Icon name="plus" size={16} stroke={2.2} />
                Nueva orden de trabajo
              </button>
            )}
          </>
        }
      />

      <div className="maint">
        <section className="panel cal" aria-label="Calendario de órdenes de trabajo">
          <div className="cal__bar">
            <h2>
              {MONTHS[ym[1]]} <span>{ym[0]}</span>
            </h2>
            <div className="cal__nav">
              <button type="button" className="icon-btn icon-btn--plain" aria-label="Mes anterior" onClick={() => shift(-1)}>
                <Icon name="chevronLeft" size={17} />
              </button>
              <button type="button" className="btn-ghost btn-ghost--sm" onClick={() => setYm([2026, 9])}>
                Hoy
              </button>
              <button type="button" className="icon-btn icon-btn--plain" aria-label="Mes siguiente" onClick={() => shift(1)}>
                <Icon name="chevronRight" size={17} />
              </button>
            </div>
            <ul className="cal__legend">
              {(["Programada", "En ejecución", "Completada", "Cancelada"] as const).map((s) => (
                <li key={s}>
                  <i style={{ background: OT_COLOR[s] }} />
                  {s}
                </li>
              ))}
              <li>
                <i className="cal__late" />
                Vencida
              </li>
            </ul>
          </div>
          <div className="cal__dow">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal__grid" style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}>
            {cells.map((c) => {
              const evs = byDay.get(c.iso) ?? [];
              return (
                <div key={c.iso} className={`day ${c.inMonth ? "" : "day--out"} ${c.weekend ? "day--we" : ""} ${c.iso === TODAY ? "day--today" : ""}`}>
                  <span className="day__n">{c.day}</span>
                  <div className="day__evts">
                    {evs.slice(0, 3).map((o) => (
                      <Chip key={o.code} o={o} sel={sel?.code === o.code} onClick={() => setSel(o)} />
                    ))}
                    {evs.length > 3 && <span className="day__more">+{evs.length - 3} más</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="maint__side">
          {sel && <Detail key={sel.code} o={sel} role={role} open={open} onSelect={setSel} onClose={() => setSel(null)} />}
          <section className="panel pend" aria-label="Órdenes pendientes">
            <div className="panel__head">
              <h2>Órdenes pendientes</h2>
              <span className="panel__count">{pending.length} abiertas</span>
            </div>
            <table className="tbl tbl--compact">
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Árbol · acción</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((o) => (
                  <tr key={o.code} className={sel?.code === o.code ? "is-sel" : ""} onClick={() => setSel(o)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(o)}>
                    <td className="mono">{o.code.slice(-3)}</td>
                    <td>
                      <strong>
                        {o.accion}
                        {o.subtipo ? ` · ${o.subtipo}` : ""}
                      </strong>
                      <em className="norm">
                        {o.tree.code} · {o.tree.common}
                      </em>
                    </td>
                    <td>
                      {o.fecha ? <span className="mono">{fmt(o.fecha).slice(0, 5)}</span> : <span className="muted">Sin fecha</span>}
                      <span className="ot-mini" style={{ ["--c" as string]: OT_COLOR[o.estado] }}>
                        {isOverdue(o) ? "Vencida" : o.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel mapcard" aria-label="Mapa de órdenes">
            <div className="panel__head">
              <h2>Mapa</h2>
              <span className="panel__count">Órdenes abiertas</span>
            </div>
            <MiniMap orders={open} selected={sel} onSelect={setSel} />
          </section>
        </div>
      </div>
    </div>
  );
}
