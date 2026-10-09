import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ManagementModule, type ManagementModuleConfig } from "../components/ManagementModule";
import { listProjectTrees } from "../api/trees";
import {
  createIncident,
  estadoLabel,
  getModuleCatalogs,
  listProjectIncidents,
  updateIncidentState,
  type CatalogItem,
  type Incident,
} from "../api/moduleRecords";
import { RecordDetailModal } from "../components/RecordDetailModal";
import { useAuth } from "../hooks/useAuth";
import type { TreeFeature } from "../types/tree";

/**
 * Incidencias — registro mínimo (corte demo), SIN mapa. Crear → guardar →
 * listar → consultar → actualizar estado (solo Administrador). Estados según
 * estado_incidencia del Excel maestro (Ingresada, En revisión, Derivada,
 * Resuelta, Descartada); tipo y origen siguen como texto libre.
 */
const BASE_CONFIG: Omit<ManagementModuleConfig, "filters"> = {
  title: "Incidencias",
  subtitle: "Recepción, seguimiento y gestión de reportes asociados al arbolado urbano",
  icon: "alert",
  flow: [
    { title: "Reporte", desc: "Aviso de un problema en un árbol" },
    { title: "Recepción", desc: "Registro y asignación del caso" },
    { title: "Revisión", desc: "Verificación técnica en terreno" },
    { title: "Seguimiento", desc: "Acciones y estado del caso" },
    { title: "Resolución", desc: "Cierre documentado de la incidencia" },
  ],
  summaryLabels: ["Reportes recibidos", "Pendientes", "En revisión", "Resueltos"],
  listTitle: "Registro de incidencias",
  actionLabel: "Nueva incidencia",
  searchPlaceholder: "Buscar por árbol, dirección o descripción…",
  columns: [
    { label: "N°", width: "6%" },
    { label: "Fecha", width: "12%" },
    { label: "Árbol / ubicación", width: "22%" },
    { label: "Descripción", width: "30%" },
    { label: "Origen", width: "14%" },
    { label: "Estado", width: "16%" },
  ],
  emptyTitle: "No hay incidencias registradas en este proyecto.",
  emptyText: "Los reportes recibidos aparecerán aquí con su estado de revisión, seguimiento y resolución.",
};

export default function IncidentsPage() {
  const { projectId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [trees, setTrees] = useState<TreeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(["", ""]);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [states, setStates] = useState<CatalogItem[]>([]);
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    getModuleCatalogs()
      .then((c) => setStates(c.incident_states))
      .catch(() => setStates([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([listProjectIncidents(projectId), listProjectTrees(projectId)])
      .then(([inc, inv]) => {
        if (cancelled) return;
        setIncidents(inc.data);
        setTrees(inv.data.features);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el registro de incidencias.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Acceso contextual desde la ficha/panel: ?arbol=<id>[&nuevo=1]
  useEffect(() => {
    const arbol = params.get("arbol");
    if (params.get("nuevo") === "1") {
      setCreatingFor(arbol ?? "");
    } else if (arbol && trees.length > 0) {
      // "Ver en módulo": filtra el listado por el código del árbol.
      const code = trees.find((t) => t.properties.id === arbol)?.properties.tree_code;
      if (code) setSearch(code);
      setParams({}, { replace: true });
    }
  }, [params, trees, setParams]);

  const treeById = useMemo(() => new Map(trees.map((t) => [t.properties.id, t])), [trees]);

  // Opciones de filtro = valores realmente registrados (no un catálogo inventado).
  const estados = useMemo(() => [...new Set(incidents.map((i) => estadoLabel(i.estado, states)))], [incidents, states]);
  const origenes = useMemo(() => [...new Set(incidents.map((i) => i.origen_reporte).filter(Boolean) as string[])], [incidents]);
  const config: ManagementModuleConfig = {
    ...BASE_CONFIG,
    filters: [
      { placeholder: "Todos los estados", options: estados },
      { placeholder: "Todo origen", options: origenes },
    ],
  };

  // "Pendientes" = aún sin revisar: Ingresada (o 'pendiente' histórico del DEFAULT de schema.sql).
  const stats = useMemo(
    () => [
      incidents.length,
      incidents.filter((i) => i.estado === "ingresada" || i.estado === "pendiente").length,
      incidents.filter((i) => i.estado === "en_revision").length,
      incidents.filter((i) => i.estado === "resuelta").length,
    ],
    [incidents]
  );

  const visible = incidents.filter((i) => {
    const t = i.tree_id ? treeById.get(i.tree_id) : undefined;
    const text = [t?.properties.tree_code, t?.properties.direccion, t?.properties.lugar_referencia, i.tipo, i.descripcion]
      .join(" ")
      .toLowerCase();
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false;
    if (filters[0] && estadoLabel(i.estado, states) !== filters[0]) return false;
    if (filters[1] && i.origen_reporte !== filters[1]) return false;
    return true;
  });

  function closeModal() {
    setCreatingFor(null);
    if (params.get("nuevo")) setParams({}, { replace: true });
  }

  return (
    <>
      <ManagementModule
        config={config}
        statValues={incidents.length > 0 ? stats : undefined}
        loading={loading}
        error={error}
        feedback={feedback}
        onAction={() => setCreatingFor("")}
        search={{ value: search, onChange: setSearch }}
        filterValues={filters}
        onFilterChange={(i, v) => setFilters((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
        hasRows={incidents.length > 0}
        noMatches={incidents.length > 0 && visible.length === 0}
      >
        {visible.map((i) => {
          const t = i.tree_id ? treeById.get(i.tree_id) : undefined;
          return (
            <tr key={i.id} className="sivu-table__row--interactive" onClick={() => setDetailId(i.id)} title="Ver detalle">
              <td className="sivu-table__strong" style={{ fontSize: 11 }}>{i.codigo_incidencia ?? "—"}</td>
              <td className="sivu-table__num">{i.created_at.slice(0, 10)}</td>
              <td>
                <div className="sivu-table__strong">{t?.properties.tree_code ?? "Sin árbol identificado"}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {t?.properties.lugar_referencia || t?.properties.direccion || ""}
                </div>
              </td>
              <td>
                <div style={{ fontWeight: 600 }}>{i.tipo}</div>
                {i.descripcion && <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{i.descripcion}</div>}
              </td>
              <td>{i.origen_reporte || "—"}</td>
              <td>
                <span className={`badge badge--${i.estado === "resuelta" ? "green" : "slate"}`}>{estadoLabel(i.estado, states)}</span>
              </td>
            </tr>
          );
        })}
      </ManagementModule>

      {detailId &&
        (() => {
          const i = incidents.find((x) => x.id === detailId);
          if (!i) return null;
          const t = i.tree_id ? treeById.get(i.tree_id) : undefined;
          return (
            <RecordDetailModal
              title="Incidencia"
              code={i.codigo_incidencia}
              fields={[
                { label: "Fecha de reporte", value: i.created_at.slice(0, 10) },
                { label: "Estado", value: estadoLabel(i.estado, states) },
                { label: "Árbol relacionado", value: t?.properties.tree_code ?? "Sin árbol identificado" },
                { label: "Especie", value: t?.properties.nombre_comun || t?.properties.nombre_cientifico || "—" },
                {
                  label: "Ubicación / referencia",
                  value: [t?.properties.direccion, t?.properties.lugar_referencia].filter(Boolean).join(" — ") || "—",
                  full: true,
                },
                { label: "Tipo", value: i.tipo },
                { label: "Origen", value: i.origen_reporte },
                { label: "Descripción", value: i.descripcion, full: true },
                { label: "Seguimiento", value: i.observacion, full: true },
              ]}
              states={states}
              currentState={i.estado}
              canChangeState={isAdmin}
              withNote
              onChangeState={async (estado, nota) => {
                const res = await updateIncidentState(projectId, i.id, estado, nota);
                setIncidents((prev) => prev.map((x) => (x.id === i.id ? res.data : x)));
                setFeedback(`Estado de ${i.codigo_incidencia ?? "la incidencia"} actualizado.`);
                setTimeout(() => setFeedback(null), 5000);
              }}
              onClose={() => setDetailId(null)}
            />
          );
        })()}

      {creatingFor !== null && (
        <IncidentModal
          projectId={projectId}
          trees={trees}
          initialTreeId={creatingFor}
          onClose={closeModal}
          onSaved={(inc) => {
            setIncidents((prev) => [inc, ...prev]);
            setFeedback(`Incidencia ${inc.codigo_incidencia ?? ""} registrada.`);
            setTimeout(() => setFeedback(null), 5000);
            closeModal();
          }}
        />
      )}
    </>
  );
}

function IncidentModal({
  projectId,
  trees,
  initialTreeId,
  onClose,
  onSaved,
}: {
  projectId: string;
  trees: TreeFeature[];
  initialTreeId: string;
  onClose: () => void;
  onSaved: (i: Incident) => void;
}) {
  const [treeId, setTreeId] = useState(initialTreeId);
  const [tipo, setTipo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [origen, setOrigen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!tipo.trim()) return setError("Indica el tipo de incidencia.");
    if (!descripcion.trim()) return setError("Describe la incidencia.");
    setSubmitting(true);
    setError(null);
    try {
      const res = await createIncident(projectId, {
        tree_id: treeId || null,
        tipo: tipo.trim(),
        descripcion: descripcion.trim(),
        origen_reporte: origen.trim() || null,
      });
      onSaved(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la incidencia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content">
        <header className="sivu-modal-header">
          <h2>Nueva incidencia</h2>
          <button className="btn btn-secondary" style={{ padding: "4px 8px", border: "none" }} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="sivu-modal-body">
          <div className="field">
            <label>Árbol asociado</label>
            <select value={treeId} onChange={(e) => setTreeId(e.target.value)}>
              <option value="">Sin árbol identificado</option>
              {trees.map((t) => (
                <option key={t.properties.id} value={t.properties.id}>
                  {t.properties.tree_code} — {t.properties.nombre_comun || t.properties.nombre_cientifico || "Especie no identificada"}
                  {t.properties.lugar_referencia ? ` · ${t.properties.lugar_referencia}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Tipo de incidencia *</label>
              <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ej.: rama quebrada" />
            </div>
            <div className="field">
              <label>Origen del reporte</label>
              <input type="text" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej.: comunidad, inspección" />
            </div>
          </div>
          <div className="field">
            <label>Descripción *</label>
            <textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={{ width: "100%" }} />
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
            La incidencia se registra con estado inicial “Ingresada” y fecha de hoy.
          </p>
          {error && <p style={{ color: "var(--classification-critical)", fontSize: 12.5 }}>{error}</p>}
        </div>
        <footer className="sivu-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar incidencia"}
          </button>
        </footer>
      </div>
    </div>
  );
}
