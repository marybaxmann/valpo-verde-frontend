import { PendingModulePage } from "../components/PendingModulePage";

/**
 * Incidencias (CC-059, grupo Operación): aquí llegan los reportes de la
 * comunidad enviados desde Valpo Verde Conecta (el QR de cada árbol, PR-022).
 * Pendiente del modelo nuevo y del formulario público (#62, B9).
 */
export default function IncidentsPage() {
  return (
    <PendingModulePage
      title="Incidencias"
      what="los reportes de la comunidad que llegan desde Valpo Verde Conecta (el código QR de cada árbol) y su revisión"
      refs="B9 · #62"
    />
  );
}
