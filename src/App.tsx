import { useState } from "react";
import AdminLayout from "./layouts/AdminLayout";
import { StatCard, StatGrid } from "./components/StatCard";
import { BarRow } from "./components/BarRow";
import { Badge } from "./components/Badge";
import { Tabs } from "./components/Tabs";
import { Modal } from "./components/Modal";
import { MapPlaceholder } from "./components/MapPlaceholder";
import { Placeholder } from "./components/Placeholder";
import { WizardShell, type WizardStepDef } from "./components/WizardShell";

/**
 * F0 — vitrina visual mínima. Objetivo único: demostrar que React
 * arranca, que global.css carga y que los componentes portados desde
 * el prototipo compilan y renderizan.
 *
 * No hay routing productivo, no hay sesión, no hay datos reales ni
 * mocks operativos: el texto de ejemplo de abajo es contenido estático
 * de demostración, no una fuente de datos.
 */
const wizardSteps: WizardStepDef[] = [
  { key: "uno", label: "Paso 1" },
  { key: "dos", label: "Paso 2" },
];

export default function App() {
  const [tab, setTab] = useState("Resumen");
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  return (
    <AdminLayout project={{ nombre: "Vitrina de componentes", institucion: "Valpo Verde" }}>
      <div className="page-header">
        <div>
          <h1>Base visual — F0</h1>
          <p className="page-header__sub">
            Componentes portados del prototipo, renderizando sin datos ni lógica reales.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Abrir modal de prueba
        </button>
      </div>

      <StatGrid>
        <StatCard label="Componentes portados" value={11} />
        <StatCard label="Mocks activos" value={0} foot="Deliberadamente ninguno" />
        <StatCard label="Rutas productivas" value={0} foot="Se construyen en F5" />
      </StatGrid>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card card--pad">
          <h3 style={{ marginBottom: 14, fontSize: 14 }}>BarRow</h3>
          <BarRow label="Ejemplo A" value={7} total={10} tone="var(--green-500)" />
          <BarRow label="Ejemplo B" value={3} total={10} tone="var(--amber-500)" />
        </div>
        <div className="card card--pad">
          <h3 style={{ marginBottom: 14, fontSize: 14 }}>Badge</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone="green">green</Badge>
            <Badge tone="amber">amber</Badge>
            <Badge tone="red">red</Badge>
            <Badge tone="blue">blue</Badge>
            <Badge tone="slate">slate</Badge>
          </div>
        </div>
      </div>

      <div className="card card--pad" style={{ marginBottom: 16 }}>
        <Tabs tabs={["Resumen", "Detalle"]} active={tab} onChange={setTab} />
        <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
          Tab activa: {tab}
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <MapPlaceholder pointCount={0} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Placeholder
          icon="link"
          title="Sección aún no implementada"
          description="Ejemplo del componente Placeholder para módulos pendientes."
        />
      </div>

      <WizardShell
        steps={wizardSteps}
        currentIndex={wizardStep}
        onBack={() => setWizardStep((s) => Math.max(0, s - 1))}
        onNext={() => setWizardStep((s) => Math.min(wizardSteps.length - 1, s + 1))}
        showAutosave={false}
      >
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Contenido del paso {wizardStep + 1} (demostración de WizardShell).
        </p>
      </WizardShell>

      {showModal && (
        <Modal
          title="Modal de prueba"
          onClose={() => setShowModal(false)}
          footer={
            <button className="btn btn-primary" onClick={() => setShowModal(false)}>
              Cerrar
            </button>
          }
        >
          <p>Este modal confirma que el componente compila y se monta correctamente.</p>
        </Modal>
      )}
    </AdminLayout>
  );
}
