import { useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Glass, Segmented } from "./primitives";
import { PageHead } from "./Dashboard";
import { Bars, DEFAULT_FIELDS, IncChip, QrArt, TreeFicha, type PublicField } from "./Citizen";
import { CONECTA_STATS, INC_COLOR, PUBLIC_TREES, REPORTS, fmtDT, type CitizenReport, type IncState, type Priority, type PublicTree } from "../data/conecta";
import type { Role } from "../data/nav";

type Tab = "reportes" | "qr" | "ficha";
type Filter = "abiertos" | IncState | "todos";

const URG: Record<Priority, number> = { Crítica: 4, Alta: 3, Media: 2, Baja: 1 };
const OPEN: IncState[] = ["Ingresada", "En revisión"];

function Kpi({ icon, label, value, sub }: { icon: IconName; label: string; value: string | number; sub: string }) {
  return (
    <div className="kpi">
      <span className="kpi__icon">
        <Icon name={icon} size={17} />
      </span>
      <span className="kpi__lbl">{label}</span>
      <span className="kpi__val">{value}</span>
      <span className="kpi__sub">{sub}</span>
    </div>
  );
}

function ReadOnly() {
  return <span className="readonly-tag">Solo lectura · Administrador</span>;
}

/* ───────── Reportes ciudadanos ───────── */

function ReportDetail({ r, role, onState }: { r: CitizenReport; role: Role; onState: (s: IncState, msg?: string) => void }) {
  const [reply, setReply] = useState(r.respuesta ?? "");
  const [derive, setDerive] = useState(false);
  const rows: [string, string][] = [
    ["Árbol", r.tree ? `${r.tree.code} · ${r.tree.common}` : "Sin árbol identificado"],
    ["Ubicación", r.place],
    ["Origen", "Comunidad · Valpo Verde Conecta"],
    ["Reportado por", r.persona],
    ["Recibido", fmtDT(r.fecha)],
    ["Urgencia reportada", r.prioridad],
  ];
  const final = r.estado === "Resuelta" || r.estado === "Descartada";
  return (
    <Glass tone="light" className="cn-detail" aria-label={`Reporte ${r.code}`}>
      <div className={`cn-photo ${r.foto ? "" : "cn-photo--none"}`}>
        {r.foto ? (
          <span>
            <Icon name="image" size={14} /> Foto enviada por la persona
          </span>
        ) : (
          <span>
            <Icon name="image" size={16} /> Sin foto
          </span>
        )}
      </div>
      <div className="cn-detail__head">
        <div>
          <span className="sheet__code mono">{r.code}</span>
          <h3>{r.tipo}</h3>
        </div>
        <IncChip s={r.estado} />
      </div>
      <blockquote className="cn-quote">“{r.descripcion}”</blockquote>
      <div className="otcard__grid">
        {rows.map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      {role === "municipal" ? (
        <>
          <label className="cn-reply">
            <span>
              <Icon name="reply" size={13} /> Respuesta visible para la persona
            </span>
            <textarea rows={2} value={reply} placeholder="Ej.: Inspección agendada para esta semana." onChange={(e) => setReply(e.target.value)} />
          </label>
          {derive ? (
            <div className="cn-derive">
              <p>Derivar crea el registro operativo vinculado a esta incidencia:</p>
              <button type="button" className="btn-secondary" onClick={() => (onState("Derivada", reply || "Derivada a inspección."), setDerive(false))}>
                <Icon name="clipboard" size={15} /> Solicitar inspección
              </button>
              <button type="button" className="btn-secondary" onClick={() => (onState("Derivada", reply || "Derivada a mantención."), setDerive(false))}>
                <Icon name="wrench" size={15} /> Crear orden de trabajo
              </button>
              <button type="button" className="cn-link" onClick={() => setDerive(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <div className="otcard__actions">
              {r.estado === "Ingresada" && (
                <button type="button" className="btn-secondary" onClick={() => onState("En revisión", reply || undefined)}>
                  Tomar en revisión
                </button>
              )}
              {!final && (
                <button type="button" className="btn-secondary" onClick={() => setDerive(true)}>
                  Derivar
                </button>
              )}
              {!final && (
                <button type="button" className="btn-secondary cn-muted" onClick={() => onState("Descartada", reply || "Revisado: no requiere intervención.")}>
                  Descartar
                </button>
              )}
              {final && (
                <button type="button" className="btn-secondary" onClick={() => onState(r.estado, reply)}>
                  Guardar respuesta
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {r.respuesta && (
            <p className="otcard__obs">
              <strong>Respuesta a la persona:</strong> {r.respuesta}
            </p>
          )}
          <div className="otcard__actions">
            <ReadOnly />
          </div>
        </>
      )}
    </Glass>
  );
}

function Reports({ role }: { role: Role }) {
  const [list, setList] = useState(REPORTS);
  const [filter, setFilter] = useState<Filter>("abiertos");
  const [sel, setSel] = useState(REPORTS[0].code);
  const rows = list.filter((r) => (filter === "todos" ? true : filter === "abiertos" ? OPEN.includes(r.estado) : r.estado === filter));
  const current = list.find((r) => r.code === sel) ?? list[0];
  const count = (s: IncState) => list.filter((r) => r.estado === s).length;

  return (
    <div className="cn-grid">
      <section className="panel tablewrap cn-table" aria-label="Reportes ciudadanos">
        <div className="tbar cn-tbar">
          <Segmented<Filter>
            label="Filtrar por estado"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "abiertos", label: `Por atender · ${count("Ingresada") + count("En revisión")}` },
              { value: "Derivada", label: `Derivados · ${count("Derivada")}` },
              { value: "Resuelta", label: "Resueltos" },
              { value: "Descartada", label: "Descartados" },
              { value: "todos", label: "Todos" },
            ]}
          />
          <span className="tbar__count">{rows.length} reportes</span>
        </div>
        <div className="cn-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Reporte</th>
              <th>Qué reportó</th>
              <th>Árbol</th>
              <th>Urgencia</th>
              <th>Estado</th>
              <th aria-label="Foto" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className={current?.code === r.code ? "is-sel" : ""} onClick={() => setSel(r.code)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(r.code)}>
                <td>
                  <strong className="mono cn-code">{r.code}</strong>
                  <em className="norm">{fmtDT(r.fecha)}</em>
                </td>
                <td className="cn-what">
                  <strong>{r.tipo}</strong>
                  <em className="norm">{r.descripcion}</em>
                </td>
                <td>
                  {r.tree ? (
                    <>
                      <strong>{r.tree.common}</strong>
                      <em className="norm">{r.tree.code}</em>
                    </>
                  ) : (
                    <span className="muted">Sin árbol · {r.place}</span>
                  )}
                </td>
                <td>
                  <span className="cn-urg">
                    <Bars n={URG[r.prioridad]} />
                    {r.prioridad}
                  </span>
                </td>
                <td>
                  <IncChip s={r.estado} small />
                </td>
                <td className="muted">{r.foto && <Icon name="image" size={16} />}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="tbl__empty">
                <td colSpan={6}>No hay reportes en este estado.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <p className="cn-legend">
          {(Object.keys(INC_COLOR) as IncState[]).map((s) => (
            <span key={s}>
              <i style={{ background: INC_COLOR[s] }} />
              {s}
            </span>
          ))}
          <span className="cn-legend__note">Urgencia = percepción de la persona, no es nivel de riesgo.</span>
        </p>
      </section>
      {current && (
        <ReportDetail
          key={current.code}
          r={current}
          role={role}
          onState={(estado, respuesta) => setList((l) => l.map((x) => (x.code === current.code ? { ...x, estado, respuesta: respuesta ?? x.respuesta } : x)))}
        />
      )}
    </div>
  );
}

/* ───────── Códigos QR ───────── */

function QrCodes({ role }: { role: Role }) {
  const [trees, setTrees] = useState(PUBLIC_TREES);
  const [sel, setSel] = useState<PublicTree>(PUBLIC_TREES[0]);
  const max = Math.max(...trees.map((t) => t.scans));
  const current = trees.find((t) => t.qr === sel.qr) ?? trees[0];
  const reportsOf = (p: PublicTree) => REPORTS.filter((r) => r.tree?.code === p.tree.code).length;
  return (
    <div className="cn-grid">
      <section className="panel tablewrap cn-table" aria-label="Placas QR">
        <div className="tbar cn-tbar">
          <span className="cn-tbar__title">
            {trees.filter((t) => t.active).length} placas activas · {trees.length} generadas
          </span>
          {role === "municipal" && (
            <button type="button" className="btn-ghost btn-ghost--sm">
              <Icon name="plus" size={14} /> Generar QR para árboles
            </button>
          )}
          {role === "municipal" && (
            <button type="button" className="btn-ghost btn-ghost--sm">
              <Icon name="printer" size={14} /> Imprimir lote
            </button>
          )}
        </div>
        <div className="cn-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Árbol</th>
              <th>Ubicación</th>
              <th>Escaneos · 30 días</th>
              <th className="num">Reportes</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {trees.map((p) => (
              <tr key={p.qr} className={current.qr === p.qr ? "is-sel" : ""} onClick={() => setSel(p)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(p)}>
                <td className="mono">{p.qr}</td>
                <td>
                  <strong>{p.tree.common}</strong>
                  <em>{p.tree.scientific}</em>
                </td>
                <td className="cn-place">{p.tree.place}</td>
                <td>
                  <span className="cn-scan">
                    <i>
                      <b style={{ width: `${max ? (p.scans / max) * 100 : 0}%` }} />
                    </i>
                    {p.scans}
                  </span>
                </td>
                <td className="num">{reportsOf(p) || <span className="muted">—</span>}</td>
                <td>
                  <span className={`life ${p.active ? "life--on" : "life--off"}`}>{p.active ? "Activa" : "Sin instalar"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <Glass tone="light" className="cn-detail cn-plateview" aria-label={`Placa ${current.qr}`}>
        <div className="cn-detail__head">
          <div>
            <span className="sheet__code mono">{current.qr}</span>
            <h3>Vista previa de la placa</h3>
          </div>
          <span className={`life ${current.active ? "life--on" : "life--off"}`}>{current.active ? "Activa" : "Sin instalar"}</span>
        </div>
        <div className="plate plate--print">
          <span className="plate__brand">Valpo Verde Conecta</span>
          <QrArt seed={current.qr} size={150} />
          <strong>{current.tree.common}</strong>
          <em>{current.tree.scientific}</em>
          <small>Escanéame · conoce este árbol y avísanos si ves algo raro</small>
          <span className="plate__code mono">{current.qr}</span>
        </div>
        <div className="otcard__grid">
          <div>
            <span>Enlace del QR</span>
            <strong className="mono">conecta/{current.qr}</strong>
          </div>
          <div>
            <span>Escaneos · 30 días</span>
            <strong>{current.scans}</strong>
          </div>
        </div>
        <div className="otcard__actions">
          {role === "municipal" ? (
            <>
              <button type="button" className="btn-secondary">
                <Icon name="download" size={15} /> Descargar placa
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTrees((ts) => ts.map((t) => (t.qr === current.qr ? { ...t, active: !t.active } : t)))}
              >
                {current.active ? "Marcar sin instalar" : "Marcar instalada"}
              </button>
            </>
          ) : (
            <ReadOnly />
          )}
        </div>
      </Glass>
    </div>
  );
}

/* ───────── Ficha pública ───────── */

const FIELDS: { f: PublicField; label: string; note?: string }[] = [
  { f: "nombre_comun", label: "Nombre común" },
  { f: "especie_cientifica", label: "Especie" },
  { f: "clase_edad", label: "Clase de edad", note: "Joven · Semimaduro · Maduro · Sobremaduro" },
  { f: "altura_m", label: "Altura" },
  { f: "dap_cm", label: "Diámetro del tronco (DAP)" },
  { f: "diametro_copa_m", label: "Diámetro de copa" },
  { f: "ubicacion_descriptiva", label: "Ubicación descriptiva" },
  { f: "id_arbol", label: "Código del árbol" },
];

const NEVER: [string, string][] = [
  ["Nivel de riesgo y evaluaciones", "Información técnica; publicarla requiere decisión"],
  ["Órdenes de trabajo e incidencias", "Uso interno"],
  ["registrado_por y usuarios", "Datos personales"],
  ["Coordenadas UTM exactas", "La ubicación descriptiva basta"],
];

function PublicFicha({ role }: { role: Role }) {
  const [fields, setFields] = useState<PublicField[]>(DEFAULT_FIELDS);
  const toggle = (f: PublicField) => role === "municipal" && setFields((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]));
  const Row = ({ f, label, note, tag }: { f: PublicField; label: string; note?: string; tag?: string }) => (
    <li>
      <button type="button" className={`cn-toggle ${fields.includes(f) ? "is-on" : ""}`} role="switch" aria-checked={fields.includes(f)} disabled={role !== "municipal"} onClick={() => toggle(f)}>
        <i />
      </button>
      <span>
        <strong>
          {label} {tag && <em className="cn-new">{tag}</em>}
        </strong>
        <small>
          <code>{f}</code>
          {note ? ` · ${note}` : ""}
        </small>
      </span>
    </li>
  );
  return (
    <div className="cn-grid cn-grid--ficha">
      <section className="panel cn-fields" aria-label="Campos publicados">
        <div className="panel__head">
          <h2>Campos que ve la ciudadanía</h2>
          {role === "municipal" ? <span className="panel__count">Cambia la vista previa</span> : <ReadOnly />}
        </div>
        <span className="panel__sub">Desde la hoja ARBOLES</span>
        <ul className="cn-switches">
          {FIELDS.map((x) => (
            <Row key={x.f} {...x} />
          ))}
        </ul>
        <span className="panel__sub">Contenido editorial</span>
        <ul className="cn-switches">
          <Row f="sobre_especie" label="Sobre esta especie" note="texto por especie" tag="Nuevo · no existe en el modelo" />
        </ul>
        <span className="panel__sub">Nunca se publica</span>
        <ul className="cn-never">
          {NEVER.map(([k, v]) => (
            <li key={k}>
              <Icon name="lock" size={14} />
              <strong>{k}</strong>
              <small>{v}</small>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel cn-preview" aria-label="Vista previa en teléfono">
        <div className="panel__head">
          <h2>Vista previa</h2>
          <span className="panel__count">Así se ve al escanear {PUBLIC_TREES[0].qr}</span>
        </div>
        <div className="cn-mini-phone">
          <div className="cz">
            <div className="cz-screen">
              <div className="cz-scroll">
                <TreeFicha p={PUBLIC_TREES[0]} fields={fields} onReport={() => undefined} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────── Módulo ───────── */

export function Conecta({ role, onCitizen }: { role: Role; onCitizen: () => void }) {
  const [tab, setTab] = useState<Tab>(() => (location.hash.includes("placas") ? "qr" : location.hash.includes("publica") ? "ficha" : "reportes"));
  const pending = REPORTS.filter((r) => r.estado === "Ingresada").length;
  return (
    <div className="page page--conecta">
      <PageHead
        title="Valpo Verde Conecta"
        meta="Participación ciudadana · reportes desde las placas QR · datos ilustrativos"
        actions={
          <>
            <Segmented<Tab>
              label="Sección"
              value={tab}
              onChange={setTab}
              options={[
                { value: "reportes", label: "Reportes", icon: "inbox" },
                { value: "qr", label: "Placas QR", icon: "qr" },
                { value: "ficha", label: "Ficha pública", icon: "eye" },
              ]}
            />
            <button type="button" className="btn-ghost" onClick={onCitizen}>
              <Icon name="user" size={16} /> Ver experiencia ciudadana
            </button>
          </>
        }
      />
      <div className="kpis kpis--5">
        <Kpi icon="inbox" label="Reportes sin revisar" value={pending} sub="estado Ingresada" />
        <Kpi icon="alert" label="Reportes del mes" value={CONECTA_STATS.reportesMes} sub="origen Comunidad" />
        <Kpi icon="clock" label="Primera respuesta" value={`${CONECTA_STATS.respuestaHoras} h`} sub="promedio del mes" />
        <Kpi icon="qr" label="Escaneos de placas" value={CONECTA_STATS.escaneosMes} sub="últimos 30 días" />
        <Kpi icon="user" label="Personas registradas" value={CONECTA_STATS.registrados} sub={`+${CONECTA_STATS.nuevosMes} este mes`} />
      </div>
      {tab === "reportes" && <Reports role={role} />}
      {tab === "qr" && <QrCodes role={role} />}
      {tab === "ficha" && <PublicFicha role={role} />}
    </div>
  );
}
