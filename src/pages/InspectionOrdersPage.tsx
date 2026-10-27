import { useState } from "react";
import { useParams } from "react-router-dom";
import { listarOtsProyecto } from "../api/workOrders";
import { WorkOrdersBoard } from "../components/WorkOrdersBoard";
import { NewInspectionOrderModal } from "../components/NewInspectionOrderModal";
import { Icon } from "../components/Icons";
import { useAuth } from "../hooks/useAuth";

/**
 * Módulo Inspección (CC-061; grupo Operación, CC-059): OT de Inspección
 * del proyecto, desde B3 (tipo_ot=inspeccion; CC-065). El backend decide
 * qué ve cada rol: el Usuario municipal y el Administrador, todas; el
 * Inspector, solo las suyas. Las acciones (programar, iniciar, trabajar)
 * solo aparecen para el Inspector responsable, según `acciones`.
 * El Usuario municipal crea OT con árboles (B1), Inspectores (B14) y
 * catálogos (B15) de la API.
 */
export default function InspectionOrdersPage() {
  const { projectId = "" } = useParams();
  const { profile } = useAuth();
  const isMunicipal = profile?.role === "usuario_municipal";
  const [nueva, setNueva] = useState(false);
  const [version, setVersion] = useState(0);
  const [creada, setCreada] = useState(false);
  return (
    <>
      <WorkOrdersBoard
        title="Inspección"
        subtitle={
          profile?.role === "inspector"
            ? "Tus órdenes de inspección en este proyecto"
            : "Órdenes de trabajo de inspección del proyecto"
        }
        load={(p) => listarOtsProyecto(projectId, { ...p, tipo_ot: "inspeccion" })}
        reloadKey={`${projectId}|${version}`}
        emptyOpen="No hay órdenes de inspección abiertas."
        emptyAll="El proyecto no tiene órdenes de inspección."
        headerExtra={
          isMunicipal ? (
            <div className="sivu-mant__filter">
              {creada && (
                <span className="sivu-state sivu-state--ok" role="status">
                  Orden creada.
                </span>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCreada(false);
                  setNueva(true);
                }}
              >
                <Icon name="plus" size={14} /> Nueva orden de inspección
              </button>
            </div>
          ) : undefined
        }
      />
      {nueva && (
        <NewInspectionOrderModal
          projectId={projectId}
          onClose={() => setNueva(false)}
          onCreated={() => {
            setNueva(false);
            setCreada(true);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
