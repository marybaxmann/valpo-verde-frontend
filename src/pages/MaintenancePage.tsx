import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ManagementModule, type ManagementModuleConfig } from "../components/ManagementModule";
import { listProjectTrees } from "../api/trees";
import {
  actionLabel,
  createMaintenanceOrder,
  estadoLabel,
  getModuleCatalogs,
  listProjectMaintenance,
  MAINTENANCE_FINAL,
  updateMaintenanceState,
  type MaintenanceOrder,
  type ModuleCatalogs,
} from "../api/moduleRecords";
import { RecordDetailModal } from "../components/RecordDetailModal";
import { useCanWrite } from "../hooks/useCanWrite";
import type { TreeFeature } from "../types/tree";

/**
 * Mantención — órdenes de trabajo mínimas (corte demo), SIN mapa.
 * Acción/subtipo según LISTAS (CC-004) y estados según estado_ot del Excel
 * maestro (Pendiente, Programada, En ejecución, Completada, Cancelada),
 * servidos por el backend. Cambio de estado: solo Administrador.
 */
const CONFIG: ManagementModuleConfig = {
  title: "Mantención",
  subtitle: "Gestión y seguimiento de intervenciones sobre el arbolado urbano",
  icon: "wrench",
  flow: [
    { title: "Intervención", desc: "Necesidad detectada en un árbol" },
    { title: "Programación", desc: "Fecha planificada de ejecución" },
    { title: "Responsable", desc: "Equipo o contratista asignado" },
    { title: "Ejecución", desc: "Registro de la intervención realizada" },
    { title: "Seguimiento", desc: "Control posterior del ejemplar" },
  ],
  summaryLabels: ["Intervenciones pendientes", "Programadas", "Vencidas", "Realizadas"],
  listTitle: "Plan de mantención",
  actionLabel: "Nueva orden de trabajo",
  searchPlaceholder: "Buscar por árbol, responsable o intervención…",
  filters: [{ placeholder: "Todos los estados", options: [] }],
  columns: [
    { label: "Orden", width: "9%" },
    { label: "Árbol", width: "15%" },
    { label: "Intervención", width: "26%" },
    { label: "Responsable", width: "18%" },
    { label: "Fecha programada", width: "16%" },
    { label: "Estado", width: "16%" },
  ],
  emptyTitle: "No hay intervenciones registradas en este proyecto.",
  emptyText: "Las órdenes de trabajo aparecerán aquí cuando se registren intervenciones sobre el arbolado.",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function MaintenancePage() {
  const { projectId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [catalogs, setCatalogs] = useState<ModuleCatalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const canWrite = useCanWrite();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([listProjectMaintenance(projectId), listProjectTrees(projectId), getModuleCatalogs()])
      .then(([m, inv, cat]) => {
        if (cancelled) return;
        setOrders(m.data);
        setTrees(inv.data.features);
        setCatalogs(cat);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el plan de mantención.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Acceso contextual desde la ficha/panel: ?arbol=<id>&nuevo=1
  // Acceso contextual desde la ficha/panel: ?arbol=<id>[&nuevo=1]
  useEffect(() => {
    const arbol = params.get("arbol");
    if (params.get("nuevo") === "1" && canWrite) {
      setCreatingFor(arbol ?? "");
    } else if (arbol && trees.length > 0) {
      // "Ver en módulo": filtra el listado por el código del árbol.
      const code = trees.find((t) => t.properties.id === arbol)?.properties.tree_code;
      if (code) setSearch(code);
      setParams({}, { replace: true });
    }
  }, [params, trees, setParams, canWrite]);

  const treeById = useMemo(() => new Map(trees.map((t) => [t.properties.id, t])), [trees]);

  const states = catalogs?.maintenance_states ?? [];
  // Vencida = fecha programada pasada y estado no final (Completada/Cancelada).
  const esVencida = (o: MaintenanceOrder) =>
    !MAINTENANCE_FINAL.includes(o.estado) && !!o.fecha_programada && o.fecha_programada < today();
  const stats = useMemo(
    () => [
      orders.filter((o) => o.estado === "pendiente").length,
      orders.filter((o) => o.estado === "programada").length,
      orders.filter(esVencida).length,
      orders.filter((o) => o.estado === "completada").length,
    ],
    [orders]
  );
  const filterOptions = [...states.map((s) => s.etiqueta), "Vencidas"];

  const visible = orders.filter((o) => {
    const t = treeById.get(o.tree_id);
    const text = [t?.properties.tree_code, actionLabel(catalogs, o.tipo_intervencion, o.subtipo_accion), o.responsable]
      .join(" ")
      .toLowerCase();
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false;
    if (estadoFilter === "Vencidas") return esVencida(o);
    if (estadoFilter && estadoLabel(o.estado, states) !== estadoFilter) return false;
    return true;
  });

  function closeModal() {
    setCreatingFor(null);
    if (params.get("nuevo")) setParams({}, { replace: true });
  }

  return (
    <>
      <ManagementModule
        config={{ ...CONFIG, filters: [{ placeholder: "Todos los estados", options: filterOptions }] }}
        statValues={orders.length > 0 ? stats : undefined}
        loading={loading}
        error={error}
        feedback={feedback}
        onAction={canWrite ? () => setCreatingFor("") : undefined}
        readOnly={!canWrite}
        search={{ value: search, onChange: setSearch }}
        filterValues={[estadoFilter]}
        onFilterChange={(_i, v) => setEstadoFilter(v)}
        hasRows={orders.length > 0}
        noMatches={orders.length > 0 && visible.length === 0}
      >
        {visible.map((o) => {
          const t = treeById.get(o.tree_id);
          return (
            <tr key={o.id} className="sivu-table__row--interactive" onClick={() => setDetailId(o.id)} title="Ver detalle">
              <td className="sivu-table__strong">{o.codigo_ot ?? "—"}</td>
              <td>
                <div className="sivu-table__strong">{t?.properties.tree_code ?? "—"}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {t?.properties.nombre_comun || t?.properties.nombre_cientifico || ""}
                </div>
              </td>
              <td>
                {actionLabel(catalogs, o.tipo_intervencion, o.subtipo_accion)}
                {o.observacion && <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{o.observacion}</div>}
              </td>
              <td>{o.responsable || "—"}</td>
              <td className="sivu-table__num">{o.fecha_programada ?? "—"}</td>
              <td>
                <span className={`badge badge--${o.estado === "completada" ? "green" : "slate"}`}>
                  {estadoLabel(o.estado, states)}
                </span>
                {esVencida(o) && (
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-secondary)", marginTop: 3 }}>Vencida</div>
                )}
              </td>
            </tr>
          );
        })}
      </ManagementModule>

      {detailId &&
        (() => {
          const o = orders.find((x) => x.id === detailId);
          if (!o) return null;
          const t = treeById.get(o.tree_id);
          const accion = catalogs?.maintenance_actions.find((a) => a.codigo === o.tipo_intervencion);
          return (
            <RecordDetailModal
              title="Orden de trabajo"
              code={o.codigo_ot}
              fields={[
                { label: "Árbol", value: t?.properties.tree_code ?? "—" },
                { label: "Especie", value: t?.properties.nombre_comun || t?.properties.nombre_cientifico || "—" },
                { label: "Acción solicitada", value: accion?.etiqueta ?? o.tipo_intervencion },
                { label: "Subtipo", value: accion?.subtipos.find((x) => x.codigo === o.subtipo_accion)?.etiqueta ?? o.subtipo_accion },
                { label: "Fecha de creación", value: o.created_at.slice(0, 10) },
                { label: "Fecha programada", value: o.fecha_programada ?? "Sin fecha" },
                { label: "Responsable", value: o.responsable },
                {
                  label: "Estado",
                  value: `${estadoLabel(o.estado, states)}${esVencida(o) ? " · Vencida" : ""}`,
                },
                { label: "Observación", value: o.observacion, full: true },
              ]}
              states={states}
              currentState={o.estado}
              canChangeState={canWrite}
              onChangeState={async (estado) => {
                const res = await updateMaintenanceState(projectId, o.id, estado);
                setOrders((prev) => prev.map((x) => (x.id === o.id ? res.data : x)));
                setFeedback(`Estado de ${o.codigo_ot ?? "la orden"} actualizado.`);
                setTimeout(() => setFeedback(null), 5000);
              }}
              onClose={() => setDetailId(null)}
            />
          );
        })()}

      {creatingFor !== null && catalogs && (
        <MaintenanceOrderModal
          projectId={projectId}
          trees={trees}
          catalogs={catalogs}
          initialTreeId={creatingFor}
          onClose={closeModal}
          onSaved={(o) => {
            setOrders((prev) => [o, ...prev]);
            setFeedback(`Orden ${o.codigo_ot ?? ""} creada para ${treeById.get(o.tree_id)?.properties.tree_code ?? "el árbol"}.`);
            setTimeout(() => setFeedback(null), 5000);
            closeModal();
          }}
        />
      )}
    </>
  );
}

function MaintenanceOrderModal({
  projectId,
  trees,
  catalogs,
  initialTreeId,
  onClose,
  onSaved,
}: {
  projectId: string;
  trees: TreeFeature[];
  catalogs: ModuleCatalogs;
  initialTreeId: string;
  onClose: () => void;
  onSaved: (o: MaintenanceOrder) => void;
}) {
  const [treeId, setTreeId] = useState(initialTreeId);
  const [accion, setAccion] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [fecha, setFecha] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = catalogs.maintenance_actions.find((a) => a.codigo === accion);

  async function handleSubmit() {
    if (!treeId) return setError("Selecciona el árbol.");
    if (!accion) return setError("Selecciona la acción solicitada.");
    if (action && action.subtipos.length > 0 && !subtipo) return setError("Selecciona el subtipo de la acción.");
    if (action?.requiere_observacion && !observacion.trim()) return setError("“Otra intervención” requiere especificar la observación.");
    setSubmitting(true);
    setError(null);
    try {
      const res = await createMaintenanceOrder(projectId, {
        tree_id: treeId,
        accion_solicitada: accion,
        subtipo_accion: subtipo || null,
        fecha_programada: fecha || null,
        responsable: responsable.trim() || null,
        observacion: observacion.trim() || null,
      });
      onSaved(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la orden de trabajo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content">
        <header className="sivu-modal-header">
          <h2>Nueva orden de trabajo</h2>
          <button className="btn btn-secondary" style={{ padding: "4px 8px", border: "none" }} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="sivu-modal-body">
          <div className="field">
            <label>Árbol *</label>
            <select value={treeId} onChange={(e) => setTreeId(e.target.value)}>
              <option value="">Selecciona un árbol…</option>
              {trees.map((t) => (
                <option key={t.properties.id} value={t.properties.id}>
                  {t.properties.tree_code} — {t.properties.nombre_comun || t.properties.nombre_cientifico || "Especie no identificada"}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Acción solicitada *</label>
              <select
                value={accion}
                onChange={(e) => {
                  setAccion(e.target.value);
                  setSubtipo("");
                }}
              >
                <option value="">Selecciona…</option>
                {catalogs.maintenance_actions.map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Subtipo {action && action.subtipos.length > 0 ? "*" : ""}</label>
              <select value={subtipo} onChange={(e) => setSubtipo(e.target.value)} disabled={!action || action.subtipos.length === 0}>
                <option value="">{action && action.subtipos.length === 0 ? "Sin subtipos" : "Selecciona…"}</option>
                {action?.subtipos.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha programada</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="field">
              <label>Responsable</label>
              <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Equipo o contratista" />
            </div>
          </div>
          <div className="field">
            <label>Observación {action?.requiere_observacion ? "*" : "(opcional)"}</label>
            <textarea rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} style={{ width: "100%" }} />
          </div>
          {error && <p style={{ color: "var(--classification-critical)", fontSize: 12.5 }}>{error}</p>}
        </div>
        <footer className="sivu-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar orden"}
          </button>
        </footer>
      </div>
    </div>
  );
}
