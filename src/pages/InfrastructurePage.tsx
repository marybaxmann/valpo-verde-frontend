import { PendingNotice } from "../components/PendingNotice";
import { TerritorialModule } from "../components/TerritorialModule";

/**
 * Infraestructura (Fase 7, Paso 4): conflictos árbol–infraestructura con
 * la composición de la maqueta (CC-057): mapa protagonista y tarjeta
 * flotante. La API de la Fase 6 aún no entrega las evaluaciones de
 * infraestructura ni su clasificación (B8) ni los árboles (B1): la tarjeta
 * lo dice. La leyenda y las barras por componente llegarán con B8, con las
 * categorías y etiquetas del backend (no se escriben catálogos aquí).
 * Solo consulta: la evaluación la registra el Inspector dentro de su
 * inspección (CC-040, CC-059 punto 6).
 */
export default function InfrastructurePage() {
  return (
    <TerritorialModule
      moduleLabel="Infraestructura"
      card={
        <>
          <div className="sivu-panel__head">
            <h2>Infraestructura</h2>
          </div>
          <PendingNotice what="las evaluaciones de infraestructura por componente ni los árboles en el mapa" refs="B8 · B1" />
          <p className="sivu-terr__note">
            La evaluación de infraestructura la registra el Inspector dentro de sus inspecciones.
          </p>
        </>
      }
    />
  );
}
