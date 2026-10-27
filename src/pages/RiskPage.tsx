import { PendingNotice } from "../components/PendingNotice";
import { TerritorialModule } from "../components/TerritorialModule";

/**
 * Riesgo Arbóreo (CC-060; antes «Inspección y Riesgo»): consulta
 * territorial de los resultados de riesgo (Fase 7, Paso 4). Composición de
 * la maqueta: mapa protagonista y tarjeta flotante con la distribución por
 * nivel de riesgo. La API de la Fase 6 aún no entrega los árboles con su
 * clasificación vigente (B1) ni el resumen (B7): la tarjeta lo dice.
 * Sin «Nueva evaluación»: las inspecciones las registra el Inspector en el
 * módulo Inspección (CC-059 punto 6, CC-061). Paleta de riesgo oficial
 * (PR-016) cuando lleguen los datos.
 */
export default function RiskPage() {
  return (
    <TerritorialModule
      moduleLabel="Riesgo Arbóreo"
      card={
        <>
          <div className="sivu-panel__head">
            <h2>Riesgo Arbóreo</h2>
          </div>
          <PendingNotice what="los árboles con su clasificación de riesgo vigente" refs="B1 · B7" />
          <p className="sivu-terr__note">
            Las inspecciones y sus resultados los registra el Inspector desde sus órdenes de trabajo.
          </p>
        </>
      }
    />
  );
}
