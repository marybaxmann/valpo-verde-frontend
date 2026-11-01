import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listarOtsProyecto } from "../api/workOrders";
import { WorkOrdersBoard } from "../components/WorkOrdersBoard";
import { NewMaintenanceOrderModal } from "../components/NewMaintenanceOrderModal";
import { Icon } from "../components/Icons";
import { useAuth } from "../hooks/useAuth";

/**
 * Mantención (#61; PR-020 v1.1): OT de Mantenimiento del proyecto, desde
 * B3 (tipo_ot=mantenimiento; CC-065). Todos los miembros las ven. El
 * Usuario municipal las crea; el Encargado responsable las programa, las
 * inicia y registra su ejecución con fotos; el Inspector revisor las
 * aprueba o rechaza (también desde «Revisiones»). Las acciones de cada OT
 * son las que habilita el backend.
 */
export default function MaintenancePage() {
  const { projectId = "" } = useParams();
  const { profile } = useAuth();
  const isMunicipal = profile?.role === "usuario_municipal";
  const [nueva, setNueva] = useState(false);
  const [version, setVersion] = useState(0);
  const [creada, setCreada] = useState<string | null>(null);
  return (
    <>
      <WorkOrdersBoard
        title="Mantención"
        subtitle="Órdenes de trabajo de mantenimiento del proyecto"
        load={(p) => listarOtsProyecto(projectId, { ...p, tipo_ot: "mantenimiento" })}
        reloadKey={`${projectId}|${version}`}
        emptyAll="El proyecto no tiene órdenes de mantenimiento."
        headerExtra={
          profile?.role === "inspector" ? (
            <div className="sivu-mant__filter">
              <Link to="/inspector/revisiones" className="btn btn-ghost btn-sm">
                Revisiones de mantenimiento
              </Link>
            </div>
          ) : isMunicipal ? (
            <div className="sivu-mant__filter">
              {creada && (
                <span className="sivu-state sivu-state--ok" role="status">
                  {creada}
                </span>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCreada(null);
                  setNueva(true);
                }}
              >
                <Icon name="plus" size={14} /> Nueva orden de mantenimiento
              </button>
            </div>
          ) : undefined
        }
      />
      {nueva && (
        <NewMaintenanceOrderModal
          projectId={projectId}
          onClose={() => setNueva(false)}
          onCreated={(codigo) => {
            setNueva(false);
            setCreada(`Orden ${codigo ?? ""} creada.`.replace("  ", " "));
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
