import { PendingModulePage } from "../components/PendingModulePage";

/** Indicadores biométricos (CC-060): pendientes de CC-016 y de su cálculo en el backend (B19). */
export default function IndicesPage() {
  return (
    <PendingModulePage
      title="Indicadores biométricos"
      what="los indicadores biométricos del proyecto"
      refs="CC-016 · B19"
    />
  );
}
