import { useParams } from "react-router-dom";
import { listarOtsProyecto } from "../api/workOrders";
import { WorkOrdersBoard } from "../components/WorkOrdersBoard";
import { PendingNotice } from "../components/PendingNotice";
import { useAuth } from "../hooks/useAuth";

/**
 * Módulo Inspección (CC-061; grupo Operación, CC-059): OT de Inspección
 * del proyecto, desde B3 (tipo_ot=inspeccion; CC-065). El backend decide
 * qué ve cada rol: el Usuario municipal y el Administrador, todas; el
 * Inspector, solo las suyas. Las acciones (programar, iniciar, trabajar)
 * solo aparecen para el Inspector responsable, según `acciones`.
 * Crear una OT de Inspección (Usuario municipal) espera tres lecturas:
 * árboles (B1), Inspectores del proyecto (B14) y catálogos de acción y
 * subtipo (B15); mientras tanto, se dice qué falta (CC-059).
 */
export default function InspectionOrdersPage() {
  const { projectId = "" } = useParams();
  const { profile } = useAuth();
  const isMunicipal = profile?.role === "usuario_municipal";
  return (
    <WorkOrdersBoard
      title="Inspección"
      subtitle={
        profile?.role === "inspector"
          ? "Tus órdenes de inspección en este proyecto"
          : "Órdenes de trabajo de inspección del proyecto"
      }
      load={(p) => listarOtsProyecto(projectId, { ...p, tipo_ot: "inspeccion" })}
      reloadKey={projectId}
      emptyOpen="No hay órdenes de inspección abiertas."
      emptyAll="El proyecto no tiene órdenes de inspección."
      headerExtra={
        isMunicipal ? (
          <div className="sivu-mant__notice">
            <PendingNotice
              what="lo necesario para crear una orden de inspección desde aquí: el listado de árboles, los Inspectores del proyecto y los catálogos de acción y subtipo"
              refs="B1 · B14 · B15"
              compact
            />
          </div>
        ) : undefined
      }
    />
  );
}
