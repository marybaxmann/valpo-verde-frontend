import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import type { ArbolAlta } from "../types/treeAlta";
import { Icon } from "../components/Icons";
import { PendingNotice } from "../components/PendingNotice";
import { NewTreeModal } from "../components/NewTreeModal";
import { useAuth } from "../hooks/useAuth";
import { ESTADO_PROYECTO_LABEL } from "../lib/projects";

/** Columnas de la tabla de la maqueta; se llenan con el listado de árboles (B1). */
const COLUMNS = ["Código", "Especie", "Estado", "DAP", "Altura", "Riesgo", "Última medición", "Ubicación"];

/**
 * Inventario (Fase 7, Paso 4): composición de la maqueta SIVU Lab
 * (CC-057) — la tabla es la protagonista, con especies y minimapa al
 * lado. La API de la Fase 6 aún no entrega el listado de árboles (B1):
 * la tabla, las especies y el mapa muestran qué falta (CC-059), sin
 * filtros ni botones inactivos. «Nuevo árbol» es el alta municipal mínima
 * (POST /api/sivu/projects/:id/trees), solo para el Usuario municipal
 * (PR-003 v8.0). Aquí no se editan datos técnicos (CC-059, punto 6).
 */
export default function InventoryPage() {
  const { projectId = "" } = useParams();
  const { profile } = useAuth();
  const isMunicipal = profile?.role === "usuario_municipal";
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ArbolAlta[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProjectWithSector(projectId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el proyecto.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const project = detail?.proyecto;
  const cerrado = project?.estado_proyecto === "cerrado";

  return (
    <div className="sivu-inv">
      <header className="sivu-phead">
        <div>
          <div className="sivu-phead__eyebrow">
            {project && (
              <span className={`sivu-chip ${project.estado_proyecto === "activo" ? "sivu-chip--ok" : ""}`}>
                {ESTADO_PROYECTO_LABEL[project.estado_proyecto]}
              </span>
            )}
            {detail?.sector && <span>{detail.sector.nombre_sector}</span>}
          </div>
          <h1 className="sivu-phead__title">Inventario</h1>
          <p className="sivu-phead__meta">
            {!detail && !error && "Cargando proyecto…"}
            {error && (
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {error}
              </span>
            )}
            {project && "Árboles del proyecto"}
          </p>
        </div>
        {/* Alta: solo Usuario municipal y con el proyecto activo (CC-042: un proyecto cerrado es solo consulta). */}
        {isMunicipal && project && !cerrado && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={15} />
            Nuevo árbol
          </button>
        )}
      </header>

      {created.length > 0 && (
        <div className="sivu-inv__created" role="status">
          <Icon name="check" size={15} />
          <span>
            {created.length === 1 ? "Árbol registrado: " : "Árboles registrados en esta visita: "}
            {created.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <strong>{a.tree_code}</strong> ({a.especie_cientifica ?? a.nombre_comun})
              </span>
            ))}
            . Aparecerán en la tabla cuando el sistema entregue el listado de árboles.
          </span>
        </div>
      )}

      {!error && (
        <div className="sivu-inv__layout">
          <article className="sivu-panel sivu-inv__table">
            <div className="sivu-table-scroll">
              <table className="sivu-table">
                <thead>
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={COLUMNS.length} className="sivu-inv__pending-cell">
                      <PendingNotice what="el listado de árboles con sus datos vigentes" refs="Listado de árboles · B1" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <aside className="sivu-inv__side">
            <article className="sivu-panel">
              <div className="sivu-panel__head">
                <h2>Especies</h2>
              </div>
              <PendingNotice what="las especies del inventario" refs="B1 · B7" compact />
            </article>
            <article className="sivu-panel">
              <div className="sivu-panel__head">
                <h2>Mapa</h2>
              </div>
              <PendingNotice what="la ubicación de los árboles" refs="B1" compact />
            </article>
          </aside>
        </div>
      )}

      {creating && (
        <NewTreeModal
          projectId={projectId}
          onClose={() => setCreating(false)}
          onCreated={(arbol) => {
            setCreating(false);
            setCreated((prev) => [...prev, arbol]);
          }}
        />
      )}
    </div>
  );
}
