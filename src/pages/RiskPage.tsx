import { DiagnosisModule } from "../components/DiagnosisModule";

/**
 * Riesgo Arbóreo (CC-060): mapa protagonista con el diagnóstico de riesgo
 * de la última inspección finalizada de cada árbol (B18 mínimo). Sin
 * «Nueva evaluación»: las inspecciones las registra el Inspector desde sus
 * OT (CC-059 punto 6, CC-061).
 */
export default function RiskPage() {
  return <DiagnosisModule vista="riesgo" />;
}
