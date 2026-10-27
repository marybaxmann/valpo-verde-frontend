import { useParams } from "react-router-dom";
import { listarOtsProyecto } from "../api/workOrders";
import { WorkOrdersBoard } from "../components/WorkOrdersBoard";

/**
 * Mantención (Fase 7, Paso 4): OT de Mantenimiento del proyecto, desde B3
 * (GET /api/sivu/projects/:id/work-orders?tipo_ot=mantenimiento; CC-065).
 * Las OT de Inspección van en su módulo (CC-061). Solo lectura para todos
 * los roles: crear una OT de Mantenimiento y registrar su ejecución
 * esperan el #61.
 */
export default function MaintenancePage() {
  const { projectId = "" } = useParams();
  return (
    <WorkOrdersBoard
      title="Mantención"
      subtitle="Órdenes de trabajo de mantenimiento del proyecto"
      load={(p) => listarOtsProyecto(projectId, { ...p, tipo_ot: "mantenimiento" })}
      reloadKey={projectId}
      emptyOpen="No hay órdenes de mantenimiento abiertas."
      emptyAll="El proyecto no tiene órdenes de mantenimiento."
    />
  );
}
