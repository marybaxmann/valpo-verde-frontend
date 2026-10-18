import { Icon } from "./Icon";
import { Glass, RiskDot } from "./primitives";
import { PROJECT, RISK_COLOR, type Lens, type RiskLevel } from "../data/mock";

/** Encabezado de lugar: el nombre del proyecto actúa como título del territorio. */
export function PlaceHeader({ module }: { module: string }) {
  return (
    <header className="place">
      <div className="place__eyebrow">
        <span className="pill-live">Territorio · {module}</span>
        <button type="button" className="place__switch">
          {PROJECT.name}
          <Icon name="chevronDown" size={14} />
        </button>
      </div>
      <h1 className="place__title">{PROJECT.place}</h1>
      <p className="place__meta">
        Comuna de {PROJECT.comuna} <span>·</span> {PROJECT.total} árboles registrados
      </p>
    </header>
  );
}

const LEVELS: RiskLevel[] = ["Bajo", "Moderado", "Alto", "Extremo"];

function RiskBody() {
  const r = PROJECT.riesgo;
  const total = PROJECT.evaluados + PROJECT.sinEvaluacion;
  return (
    <>
      <div className="ov__hero">
        <span className="ov__num">{r.Alto + r.Extremo}</span>
        <span className="ov__lbl">
          árboles en riesgo
          <br />
          alto o extremo
        </span>
      </div>
      <div className="stack" role="img" aria-label="Distribución por nivel de riesgo">
        {LEVELS.map((l) => (
          <span key={l} style={{ flex: r[l], background: RISK_COLOR[l] }} />
        ))}
        <span style={{ flex: PROJECT.sinClasificacion, background: RISK_COLOR["Sin clasificación"] }} />
        <span style={{ flex: PROJECT.sinEvaluacion, background: RISK_COLOR.none, opacity: 0.55 }} />
      </div>
      <ul className="legend">
        {LEVELS.map((l) => (
          <li key={l}>
            <RiskDot level={l} size={8} />
            <span>{l}</span>
            <strong>{r[l]}</strong>
          </li>
        ))}
        <li>
          <RiskDot level="Sin clasificación" size={8} />
          <span>Sin clasificación</span>
          <strong>{PROJECT.sinClasificacion}</strong>
        </li>
        <li>
          <RiskDot level={null} size={8} />
          <span>Sin evaluación</span>
          <strong>{PROJECT.sinEvaluacion}</strong>
        </li>
      </ul>
      <div className="ov__foot">
        <span>
          {PROJECT.evaluados} de {total} evaluados
        </span>
        <a href="#">
          Tabla de evaluaciones <Icon name="arrowRight" size={13} />
        </a>
      </div>
    </>
  );
}

function InventoryBody() {
  return (
    <>
      <div className="ov__hero">
        <span className="ov__num">{PROJECT.georef}</span>
        <span className="ov__lbl">
          árboles
          <br />
          georreferenciados
        </span>
      </div>
      <div className="chips">
        <span><strong>{PROJECT.estado.activos}</strong> activos</span>
        <span><strong>{PROJECT.estado.retirados}</strong> retirados</span>
        <span><strong>{PROJECT.estado.tocones}</strong> tocones</span>
      </div>
      <span className="ov__sub">Especies más registradas</span>
      <ul className="bars">
        {PROJECT.topEspecies.map((e) => (
          <li key={e.nombre}>
            <span>{e.nombre}</span>
            <i>
              <b style={{ width: `${(e.pct / PROJECT.topEspecies[0].pct) * 100}%` }} />
            </i>
            <strong>{e.pct}%</strong>
          </li>
        ))}
      </ul>
      <div className="ov__foot">
        <span>{PROJECT.especies} especies registradas</span>
        <a href="#">
          Composición <Icon name="arrowRight" size={13} />
        </a>
      </div>
    </>
  );
}

function InfraBody() {
  const i = PROJECT.infra;
  return (
    <>
      <div className="ov__hero">
        <span className="ov__num">{i.evaluaciones}</span>
        <span className="ov__lbl">
          evaluaciones de
          <br />
          infraestructura
        </span>
      </div>
      <div className="split">
        <div>
          <strong>{i.conEvaluacion}</strong>
          <span>árboles con evaluación</span>
        </div>
        <div>
          <strong>{i.sinEvaluacion}</strong>
          <span>sin evaluación</span>
        </div>
      </div>
      <div className="ov__foot">
        <span>{PROJECT.total} árboles registrados</span>
        <a href="#">
          Tabla de evaluaciones <Icon name="arrowRight" size={13} />
        </a>
      </div>
    </>
  );
}

const TITLES: Record<Lens, string> = {
  riesgo: "Riesgo Arbóreo",
  inventario: "Inventario",
  infraestructura: "Infraestructura",
};

export function Overview({ lens }: { lens: Lens }) {
  return (
    <Glass as="section" className="ov" aria-label={TITLES[lens]}>
      <div className="ov__head">
        <span>{TITLES[lens]}</span>
        <span className="ov__hint">{lens === "riesgo" ? "última evaluación" : "proyecto completo"}</span>
      </div>
      {lens === "riesgo" && <RiskBody />}
      {lens === "inventario" && <InventoryBody />}
      {lens === "infraestructura" && <InfraBody />}
    </Glass>
  );
}

export function GeorefNotice() {
  return (
    <Glass className="notice">
      <span className="notice__icon">
        <Icon name="locate" size={15} />
      </span>
      <span>
        <strong>{PROJECT.sinGeoref} árboles</strong> sin georreferencia
      </span>
      <a href="#">Revisar</a>
    </Glass>
  );
}
