import { useEffect, useState } from "react";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarOtsProyecto } from "../api/workOrders";
import type { ArbolInventario } from "../types/inventory";
import type { Diagnostico } from "../types/diagnostico";
import type { OtListada } from "../types/workOrder";
import { ESTADOS_OT_ABIERTOS, ESTADOS_OT_CERRADOS } from "../types/workOrder";
import { ClassificationBadge, getClassificationTone } from "./ClassificationBadge";
import { Icon } from "./Icons";
import { PendingNotice } from "./PendingNotice";
import { TreeDiagnosis, TreeGlyph } from "./TreeDiagnosis";
import { TreePhotos } from "./TreePhotos";
import { fechaChile } from "../lib/dates";

type Tab = "resumen" | "medicion" | "riesgo" | "infra" | "gestion";

const TABS: { value: Tab; label: string }[] = [
  { value: "resumen", label: "Resumen" },
  { value: "medicion", label: "Medición" },
  { value: "riesgo", label: "Riesgo" },
  { value: "infra", label: "Infra." },
  { value: "gestion", label: "Gestión" },
];

type Datos = { treeId: string; diag: Diagnostico | null; ots: OtListada[] } | { treeId: string; error: string };

/**
 * Ficha del árbol con pestañas (maqueta SIVU Lab: `TreeSheet`; CC-057,
 * reescrita con datos según CC-058). Cada pestaña muestra lo que entrega la
 * API: el árbol (B1), su evaluación vigente (B18), sus fotos y las OT del
 * proyecto (B3) que son de este árbol. Las mediciones esperan la ficha
 * completa del árbol (B2) y se muestran como pendientes, sin valores.
 */
export function TreeSheet({
  projectId,
  arbol,
  cicloVida,
  onClose,
}: {
  projectId: string;
  arbol: ArbolInventario;
  /** Etiqueta del ciclo de vida (la resuelve el inventario con el catálogo). */
  cicloVida: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listarDiagnosticos(projectId, arbol.id),
      listarOtsProyecto(projectId, { estado: [...ESTADOS_OT_ABIERTOS, ...ESTADOS_OT_CERRADOS], limit: 100 }),
    ])
      .then(([diags, ots]) => {
        if (cancelled) return;
        setDatos({
          treeId: arbol.id,
          diag: diags.find((d) => d.tree_id === arbol.id) ?? null,
          ots: ots.data.filter((o) => o.arbol?.id === arbol.id),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setDatos({ treeId: arbol.id, error: err instanceof Error ? err.message : "No se pudo cargar la ficha." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, arbol.id]);

  const actual = datos?.treeId === arbol.id ? datos : null;
  const diag = actual && "diag" in actual ? actual.diag : null;
  const ots = actual && "ots" in actual ? actual.ots : null;
  const vigente = diag?.vigente ?? null;
  const nivel = vigente?.resultado.clasificacion_riesgo ?? null;
  const tono = nivel ? getClassificationTone(nivel.etiqueta) : "neutral";
  const colorNivel = tono === "neutral" ? "#A7B0AB" : `var(--classification-${tono})`;
  const infra = vigente?.resultado.infraestructura ?? null;

  return (
    <aside className="sivu-sheet" aria-label={`Ficha del árbol ${arbol.tree_code}`}>
      <div className="sivu-sheet__head">
        <div>
          <span className="sivu-sheet__code">{arbol.tree_code}</span>
          <h2>{arbol.nombre_comun ?? arbol.especie_cientifica ?? "Sin especie"}</h2>
          {arbol.nombre_comun && arbol.especie_cientifica && <p>{arbol.especie_cientifica}</p>}
        </div>
        <button type="button" className="sivu-topbar__icon-btn" onClick={onClose} aria-label="Cerrar ficha">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="sivu-sheet__status">
        {nivel ? <ClassificationBadge level={nivel.etiqueta} /> : <span className="status-pill">Evaluación pendiente</span>}
        {arbol.sector && <span className="sivu-sheet__place">{arbol.sector}</span>}
      </div>

      <div className="sivu-seg sivu-sheet__tabs" role="tablist" aria-label="Secciones de la ficha">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`sivu-seg__opt ${tab === t.value ? "is-on" : ""}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sivu-sheet__body">
        {actual && "error" in actual && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {actual.error}
          </p>
        )}
        {!actual && <p className="sivu-state">Cargando ficha…</p>}

        {actual && "diag" in actual && tab === "resumen" && (
          <>
            {vigente && nivel ? (
              <div className="sivu-sheet__card sivu-sheet__result" style={{ ["--hl" as string]: colorNivel }}>
                <TreeGlyph r={vigente.resultado} />
                <div>
                  <span className="sivu-sheet__eyebrow">Resultado de riesgo · vigente desde {fechaChile(vigente.desde)}</span>
                  <strong className="sivu-sheet__lvl">{nivel.etiqueta}</strong>
                  {vigente.resultado.prioridad && (
                    <span className="sivu-sheet__why">Prioridad de intervención: {vigente.resultado.prioridad.etiqueta}</span>
                  )}
                </div>
                <button type="button" className="sivu-sheet__link" onClick={() => setTab("riesgo")}>
                  Detalle <Icon name="arrow-right" size={13} />
                </button>
              </div>
            ) : (
              <div className="sivu-sheet__card sivu-sheet__empty">
                {diag ? "Inspección finalizada: pasa a vigente al completar su orden de trabajo." : "Evaluación pendiente: el árbol todavía no tiene una orden de trabajo completada."}
              </div>
            )}
            {ots && ots.length > 0 && (
              <div className="sivu-sheet__card">
                <span className="sivu-sheet__eyebrow">Gestión del árbol</span>
                {ots.slice(0, 2).map((o) => (
                  <TrabajoOt key={o.id} ot={o} />
                ))}
                {ots.length > 2 && (
                  <button type="button" className="sivu-sheet__link" onClick={() => setTab("gestion")}>
                    Ver las {ots.length} órdenes <Icon name="arrow-right" size={13} />
                  </button>
                )}
              </div>
            )}
            <TreePhotos projectId={projectId} treeId={arbol.id} conDiagnostico={false} />
          </>
        )}

        {actual && "diag" in actual && tab === "medicion" && (
          <PendingNotice what="las mediciones del árbol (DAP, altura y copa) y su historial" refs="B2" />
        )}

        {actual && "diag" in actual && tab === "riesgo" &&
          (diag ? (
            <TreeDiagnosis d={diag} />
          ) : (
            <div className="sivu-sheet__card sivu-sheet__empty">Sin evaluación de riesgo registrada.</div>
          ))}

        {actual && "diag" in actual && tab === "infra" &&
          (vigente ? (
            <div className="sivu-sheet__card">
              <span className="sivu-sheet__eyebrow">Afectación de infraestructura · vigente desde {fechaChile(vigente.desde)}</span>
              <Fila label="Clasificación" valor={infra?.clasificacion?.etiqueta ?? "—"} />
              <Fila label="Puntaje" valor={infra?.puntaje != null ? String(infra.puntaje) : "—"} />
              <Fila
                label="Porcentaje"
                valor={infra?.porcentaje != null ? `${infra.porcentaje.toLocaleString("es-CL", { maximumFractionDigits: 1 })} %` : "—"}
              />
            </div>
          ) : (
            <div className="sivu-sheet__card sivu-sheet__empty">Sin evaluación de infraestructura vigente.</div>
          ))}

        {actual && "diag" in actual && tab === "gestion" && (
          <div className="sivu-sheet__card">
            <span className="sivu-sheet__eyebrow">Órdenes de trabajo</span>
            {ots && ots.length > 0 ? ots.map((o) => <TrabajoOt key={o.id} ot={o} />) : <span className="sivu-sheet__why">El árbol no tiene órdenes de trabajo.</span>}
            <PendingNotice what="las incidencias del árbol" refs="B9" compact />
          </div>
        )}

        <div className="sivu-sheet__card sivu-sheet__loc">
          <Fila label="Estado ciclo de vida" valor={cicloVida} />
          <Fila label="Sector" valor={arbol.sector ?? "—"} />
          <Fila label="Ubicación" valor={arbol.ubicacion_descriptiva ?? "—"} />
          <Fila label="UTM 19S" valor={arbol.utm_este !== null && arbol.utm_norte !== null ? `${arbol.utm_este} / ${arbol.utm_norte}` : "—"} mono />
          <Fila label="Registro" valor={fechaChile(arbol.fecha_registro)} />
        </div>
      </div>
    </aside>
  );
}

function Fila({ label, valor, mono = false }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div className="sivu-sheet__row">
      <span>{label}</span>
      <strong className={mono ? "is-mono" : ""}>{valor}</strong>
    </div>
  );
}

function TrabajoOt({ ot }: { ot: OtListada }) {
  const c = `var(--ot-${ot.estado.codigo.replace(/_/g, "-")}, var(--ot-pendiente))`;
  return (
    <div className="sivu-sheet__work">
      <span className="sivu-sheet__work-icon">
        <Icon name={ot.tipo_ot.codigo === "inspeccion" ? "clipboard" : "wrench"} size={15} />
      </span>
      <span className="sivu-sheet__work-text">
        <strong>{ot.subtipo ? `${ot.accion.etiqueta} · ${ot.subtipo.etiqueta}` : ot.accion.etiqueta}</strong>
        <span>{ot.codigo_ot ?? "—"}</span>
      </span>
      <span className="sivu-sheet__work-state" style={{ ["--c" as string]: c }}>
        {ot.estado.etiqueta}
      </span>
    </div>
  );
}
