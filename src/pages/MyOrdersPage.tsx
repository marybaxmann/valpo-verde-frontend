import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarMisOts } from "../api/workOrders";
import { listProjects } from "../api/projects";
import type { Project } from "../types/project";
import { WorkOrdersBoard } from "../components/WorkOrdersBoard";
import { useAuth } from "../hooks/useAuth";

/**
 * «Mis OT» del Inspector (CC-064 d, k, n) y del Encargado de mantención
 * (#61; CC-064 c): pantalla de entrada con las OT
 * de las que es el responsable actual, de todos sus proyectos, desde B4
 * (GET /api/sivu/work-orders/mine; CC-065), con filtro por proyecto y por
 * estado. Las acciones (programar, iniciar, trabajar o registrar la
 * ejecución) son las que el backend habilita en cada OT.
 */
export default function MyOrdersPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectId, setProjectId] = useState("");
  const { profile } = useAuth();
  const esInspector = profile?.role === "inspector";

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((data) => {
        // Un proyecto cerrado no admite trabajo nuevo: no se ofrece en el filtro.
        if (!cancelled) setProjects(data.filter((p) => p.estado_proyecto !== "cerrado"));
      })
      .catch(() => {
        // Sin la lista, el filtro no se muestra; B4 sigue funcionando sin él.
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WorkOrdersBoard
      title="Mis OT"
      subtitle="Órdenes de trabajo de las que eres responsable"
      load={(p) => listarMisOts({ ...p, project_id: projectId || undefined })}
      reloadKey={projectId || "todos"}
      emptyAll="No tienes órdenes de trabajo."
      showProject
      headerExtra={
        projects && projects.length > 0 ? (
          <div className="sivu-mant__filter">
            <label htmlFor="mis-ot-proyecto">Proyecto</label>
            <select id="mis-ot-proyecto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Todos mis proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_proyecto}
                </option>
              ))}
            </select>
            {esInspector && (
              <>
                <Link to="/inspector/revisiones" className="btn btn-ghost btn-sm">
                  Revisiones de mantenimiento
                </Link>
                <Link to="/inspector/especies" className="btn btn-ghost btn-sm">
                  Catálogo de especies
                </Link>
              </>
            )}
          </div>
        ) : undefined
      }
    />
  );
}
