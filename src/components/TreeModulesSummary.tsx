import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  actionLabel,
  estadoLabel,
  getModuleCatalogs,
  INCIDENT_FINAL,
  listProjectIncidents,
  MAINTENANCE_FINAL,
  listProjectMaintenance,
  listTreeInfrastructureAssessments,
  type Incident,
  type InfrastructureAssessmentDTO,
  type MaintenanceOrder,
  type ModuleCatalogs,
} from "../api/moduleRecords";
import { useProjectBase } from "../hooks/useProjectBase";
import { Icon, type IconName } from "./Icons";
import { componentesRegistrados } from "./InfrastructureAssessmentModal";

/**
 * Ficha → resumen del árbol en Infraestructura, Mantención e Incidencias
 * (solo registros reales del backend) y accesos a cada módulo con el árbol
 * preseleccionado.
 */
export function TreeModulesSummary({ treeId, projectId }: { treeId: string; projectId: string }) {
  const navigate = useNavigate();
  const base = useProjectBase();
  const [infra, setInfra] = useState<InfrastructureAssessmentDTO[] | null>(null);
  const [orders, setOrders] = useState<MaintenanceOrder[] | null>(null);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [catalogs, setCatalogs] = useState<ModuleCatalogs | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTreeInfrastructureAssessments(treeId)
      .then((r) => !cancelled && setInfra(r.data))
      .catch(() => !cancelled && setInfra([]));
    listProjectMaintenance(projectId)
      .then((r) => !cancelled && setOrders(r.data.filter((o) => o.tree_id === treeId)))
      .catch(() => !cancelled && setOrders([]));
    listProjectIncidents(projectId)
      .then((r) => !cancelled && setIncidents(r.data.filter((i) => i.tree_id === treeId)))
      .catch(() => !cancelled && setIncidents([]));
    getModuleCatalogs()
      .then((c) => !cancelled && setCatalogs(c))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [treeId, projectId]);

  const go = (module: string, nuevo: boolean) =>
    base && navigate(`${base}/${module}?arbol=${treeId}${nuevo ? "&nuevo=1" : ""}`);

  return (
    <div className="sivu-form-section">
      <div className="sivu-form-section__header">
        <Icon name="grid" size={15} /> 5. Gestión del ejemplar
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <ModuleBox
          icon="building"
          title="Infraestructura"
          loading={infra === null}
          lines={
            infra && infra[0]
              ? [
                  `Última evaluación: ${infra[0].fecha_evaluacion}`,
                  `${componentesRegistrados(infra[0].variables)} componente(s) con presencia/interferencia`,
                  `${infra.length} evaluación(es) · Clasificación global pendiente`,
                ]
              : []
          }
          emptyText="Sin registros."
          onView={() => go("infraestructura", false)}
          actionLabel="Nueva evaluación"
          onAction={() => go("infraestructura", true)}
        />
        <ModuleBox
          icon="wrench"
          title="Mantención"
          loading={orders === null}
          lines={
            orders && orders[0]
              ? [
                  `Órdenes activas: ${orders.filter((o) => !MAINTENANCE_FINAL.includes(o.estado)).length} de ${orders.length}`,
                  `Última: ${orders[0].codigo_ot ?? ""} · ${actionLabel(catalogs, orders[0].tipo_intervencion, orders[0].subtipo_accion)}`,
                  `Estado: ${estadoLabel(orders[0].estado, catalogs?.maintenance_states)}${orders[0].fecha_programada ? ` · ${orders[0].fecha_programada}` : ""}`,
                ]
              : []
          }
          emptyText="Sin registros."
          onView={() => go("mantencion", false)}
          actionLabel="Nueva orden"
          onAction={() => go("mantencion", true)}
        />
        <ModuleBox
          icon="alert"
          title="Incidencias"
          loading={incidents === null}
          lines={
            incidents && incidents[0]
              ? [
                  `Incidencias abiertas: ${incidents.filter((i) => !INCIDENT_FINAL.includes(i.estado)).length} de ${incidents.length}`,
                  `Última: ${incidents[0].codigo_incidencia ?? ""} · ${incidents[0].tipo} · ${incidents[0].created_at.slice(0, 10)}`,
                  `Estado: ${estadoLabel(incidents[0].estado, catalogs?.incident_states)}`,
                ]
              : []
          }
          emptyText="Sin registros."
          onView={() => go("incidencias", false)}
          actionLabel="Nueva incidencia"
          onAction={() => go("incidencias", true)}
        />
      </div>
    </div>
  );
}

function ModuleBox({
  icon,
  title,
  loading,
  lines,
  emptyText,
  onView,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  loading: boolean;
  lines: string[];
  emptyText: string;
  onView: () => void;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="card card--pad" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <strong style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={icon} size={13} /> {title}
        </strong>
        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "2px 6px", fontSize: 11 }} onClick={onView}>
          Ver módulo →
        </button>
      </div>
      {loading ? (
        <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>Cargando…</span>
      ) : lines.length === 0 ? (
        <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{emptyText}</span>
      ) : (
        lines.map((l) => (
          <span key={l} style={{ fontSize: 11.5, color: "var(--text-primary)" }}>
            {l}
          </span>
        ))
      )}
      <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: "auto", justifyContent: "center", gap: 6 }} onClick={onAction}>
        <Icon name="plus" size={12} /> {actionLabel}
      </button>
    </div>
  );
}
