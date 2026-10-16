import { useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Glass, IconButton, RiskDot, RiskTag, Segmented } from "./primitives";
import { RISK_COLOR, RISK_EXAMPLE, type RiskLevel, type Tree } from "../data/mock";
import type { Role } from "../data/nav";

type Tab = "resumen" | "medicion" | "riesgo" | "infra" | "gestion";

const TABS: { value: Tab; label: string }[] = [
  { value: "resumen", label: "Resumen" },
  { value: "medicion", label: "Medición" },
  { value: "riesgo", label: "Riesgo" },
  { value: "infra", label: "Infra." },
  { value: "gestion", label: "Gestión" },
];

function Metric({ label, value, unit, big = false }: { label: string; value: string; unit: string; big?: boolean }) {
  return (
    <div className={`metric ${big ? "metric--big" : ""}`}>
      <span className="metric__lbl">{label}</span>
      <span className="metric__val">
        {value}
        <small>{unit}</small>
      </span>
    </div>
  );
}

function TreeGlyph({ worst }: { worst: string | null }) {
  const c = (part: string) => (worst === part ? "var(--hl)" : "#D5DCD7");
  return (
    <svg viewBox="0 0 90 110" className="glyph" role="img" aria-label={`Esquema del árbol; componente más desfavorable: ${worst ?? "no determinado"}`}>
      <g fill={c("Copa y ramas")} stroke="#4A5A51" strokeWidth="1.1">
        <circle cx="30" cy="40" r="19" />
        <circle cx="60" cy="38" r="20" />
        <circle cx="45" cy="24" r="19" />
        <circle cx="45" cy="50" r="17" />
      </g>
      <g fill={c("Copa y ramas")}>
        <circle cx="30" cy="40" r="18" />
        <circle cx="60" cy="38" r="19" />
        <circle cx="45" cy="24" r="18" />
        <circle cx="45" cy="50" r="16" />
      </g>
      <path d="M41 64h8l2 32H39Z" fill={c("Tronco")} stroke="#4A5A51" strokeWidth="1.1" />
      <path d="M22 100c8-5 15-6 23-4 8-2 15-1 23 4" stroke={c("Raíces y cuello")} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M10 101h70" stroke="#C3CCC6" strokeDasharray="3 3" />
    </svg>
  );
}

function RiskChain({ level }: { level: RiskLevel }) {
  const d = RISK_EXAMPLE[level];
  return (
    <div className="chain">
      <div className="chain__row">
        <div><span>Prob. de falla</span><strong>{d.falla}</strong></div>
        <em>×</em>
        <div><span>Prob. de impacto</span><strong>{d.impacto}</strong></div>
      </div>
      <div className="chain__row">
        <div><span>Falla e impacto</span><strong>{d.combinada}</strong></div>
        <em>×</em>
        <div><span>Consecuencias</span><strong>{d.consecuencia}</strong></div>
      </div>
      <div className="chain__result" style={{ ["--hl" as string]: RISK_COLOR[level] }}>
        <span>Nivel de riesgo</span>
        <strong>{level}</strong>
      </div>
    </div>
  );
}

function Components({ level }: { level: RiskLevel }) {
  const d = RISK_EXAMPLE[level];
  const worst = d.componentes[0].nombre;
  return (
    <div className="comps" style={{ ["--hl" as string]: RISK_COLOR[level] }}>
      <TreeGlyph worst={worst} />
      <ul>
        {d.componentes.map((c, i) => (
          <li key={c.nombre} className={i === 0 ? "is-worst" : ""}>
            <RiskDot level={c.nivel} size={9} />
            <div>
              <strong>
                {c.nombre} · {c.nivel}
              </strong>
              <span>
                {c.falla} · consecuencia {c.consecuencia.toLowerCase()}
              </span>
            </div>
            {i === 0 && <em>Más desfavorable</em>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="row">
      <span>{label}</span>
      <strong className={mono ? "mono" : ""}>{value}</strong>
    </div>
  );
}

function WorkItem({ code, title, state, icon }: { code: string; title: string; state: string; icon: IconName }) {
  return (
    <a href="#" className="work">
      <span className="work__icon">
        <Icon name={icon} size={15} />
      </span>
      <span className="work__text">
        <strong>{title}</strong>
        <span className="mono">{code}</span>
      </span>
      <span className="work__state">{state}</span>
    </a>
  );
}

export function TreeSheet({ tree, role, onClose }: { tree: Tree; role: Role; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const lvl: RiskLevel | null = tree.risk && tree.risk !== "Sin clasificación" ? tree.risk : null;
  const unclassified = tree.risk === "Sin clasificación";
  const worst = lvl ? RISK_EXAMPLE[lvl].componentes[0].nombre : null;

  return (
    <Glass as="aside" tone="light" className="sheet" aria-label={`Ficha del árbol ${tree.code}`}>
      <div className="sheet__grabber" aria-hidden="true" />
      <div className="sheet__head">
        <div>
          <span className="sheet__code mono">{tree.code}</span>
          <h2>{tree.common}</h2>
          <p>{tree.scientific}</p>
        </div>
        <div className="sheet__tools">
          <IconButton icon="expand" label="Ver ficha completa" tone="light" size={34} />
          <IconButton icon="close" label="Cerrar ficha" tone="light" size={34} onClick={onClose} />
        </div>
      </div>

      <div className="sheet__status">
        <RiskTag level={tree.risk} />
        <span className="sheet__place">{tree.place}</span>
      </div>

      <Segmented options={TABS} value={tab} onChange={setTab} tone="light" label="Secciones de la ficha" size="sm" />

      <div className="sheet__body">
        {tab === "resumen" && (
          <>
            <div className="metrics">
              <Metric label="Altura total" value="14,5" unit="m" big />
              <div className="metrics__side">
                <Metric label="DAP" value="62" unit="cm" />
                <Metric label="Copa" value="11,8" unit="m" />
              </div>
            </div>
            {lvl ? (
              <div className="card result" style={{ ["--hl" as string]: RISK_COLOR[lvl] }}>
                <TreeGlyph worst={worst} />
                <div>
                  <span className="card__eyebrow">Resultado de riesgo · 02-10-2026</span>
                  <strong className="result__lvl">{lvl}</strong>
                  <span className="result__why">Más desfavorable: {worst?.toLowerCase()}</span>
                </div>
                <button type="button" className="link" onClick={() => setTab("riesgo")}>
                  Detalle <Icon name="arrowRight" size={13} />
                </button>
              </div>
            ) : (
              <div className="card empty">{unclassified ? "Evaluado · Sin clasificación: algún componente quedó «No determinado»." : "Sin evaluación de riesgo registrada."}</div>
            )}
            <div className="card">
              <span className="card__eyebrow">Gestión del árbol</span>
              <WorkItem code="OT-M-000031" title="Poda · reducción de copa" state="Programada" icon="wrench" />
              <WorkItem code="INC-000012" title="Ramas peligrosas" state="En revisión" icon="alert" />
            </div>
          </>
        )}

        {tab === "medicion" && (
          <div className="card">
            <span className="card__eyebrow">Medición dendrométrica actual · 02-10-2026</span>
            <Row label="Altura total" value="14,5 m" />
            <Row label="DAP" value="62 cm" />
            <Row label="Diámetro de copa" value="11,8 m" />
            <Row label="Altura de la 1ª rama" value="3,2 m" />
            <Row label="Fustes" value="1" />
            <Row label="Clase de edad" value="[clase de edad]" />
            <span className="card__eyebrow" style={{ marginTop: 10 }}>Historial de mediciones · 2 registros</span>
            <Row label="02-10-2026" value="DAP 62 cm · altura 14,5 m" />
            <Row label="14-03-2026" value="DAP 60 cm · altura 14,1 m" />
          </div>
        )}

        {tab === "riesgo" &&
          (lvl ? (
            <>
              <RiskChain level={lvl} />
              <Components level={lvl} />
              <p className="note">Resultado calculado por el motor metodológico. Solo lectura. Historial de evaluaciones: 2.</p>
            </>
          ) : (
            <div className="card empty">{unclassified ? "Evaluado · Sin clasificación: algún componente quedó «No determinado»." : "Sin evaluación de riesgo registrada."}</div>
          ))}

        {tab === "infra" && (
          <div className="card">
            <span className="card__eyebrow">Evaluación de infraestructura · 02-10-2026</span>
            <Row label="Acera / vereda" value="Levantamiento · grieta" />
            <Row label="Alcorque" value="Existe" />
            <Row label="Calzada" value="Sin daño ni interferencia" />
            <Row label="Infraestructura vertical" value="Sin contacto" />
            <Row label="Redes / servicios" value="Sin interferencia" />
          </div>
        )}

        {tab === "gestion" && (
          <div className="card">
            <span className="card__eyebrow">Órdenes de trabajo e incidencias</span>
            <WorkItem code="OT-M-000031" title="Poda · reducción de copa" state="Programada" icon="wrench" />
            <WorkItem code="OT-M-000009" title="Poda · limpieza de ramas secas" state="Completada" icon="wrench" />
            <WorkItem code="INC-000012" title="Ramas peligrosas" state="En revisión" icon="alert" />
          </div>
        )}

        <div className="card loc">
          <Row label="Estado ciclo de vida" value="Activo" />
          <Row label="Espacio público" value="Plaza" />
          <Row label="Dirección" value="[dirección]" />
          <Row label="Lugar de referencia" value="[referencia]" />
          <Row label="Comuna" value="Valparaíso" />
          <Row label="Coordenadas WGS84" value="-33.0466, -71.6206" mono />
        </div>
      </div>

      <div className="sheet__actions">
        {role === "municipal" ? (
          <>
            <button type="button" className="btn-primary">
              <Icon name="clipboard" size={16} />
              Nueva evaluación
            </button>
            <IconButton icon="edit" label="Editar árbol (datos básicos)" tone="light" size={40} />
            <IconButton icon="building" label="Nueva evaluación de infraestructura" tone="light" size={40} />
            <IconButton icon="wrench" label="Nueva orden de trabajo" tone="light" size={40} />
            <IconButton icon="alert" label="Registrar incidencia" tone="light" size={40} />
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary">
              <Icon name="expand" size={15} />
              Ver ficha completa
            </button>
            <span className="readonly-tag">Solo lectura</span>
          </>
        )}
      </div>
    </Glass>
  );
}
