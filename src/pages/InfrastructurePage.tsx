import { DiagnosisModule } from "../components/DiagnosisModule";

/**
 * Infraestructura: afectación de infraestructura de la última inspección
 * finalizada de cada árbol (B18 mínimo). La registra el Inspector dentro de
 * sus inspecciones (CC-040, CC-059 punto 6).
 */
export default function InfrastructurePage() {
  return <DiagnosisModule vista="infraestructura" />;
}
