import { Icon } from "./Icon";
import { Glass, IconButton, Segmented } from "./primitives";
import type { Lens } from "../data/mock";
import type { Role } from "../data/nav";

const LENSES: { value: Lens; label: string; icon: "leaf" | "alert" | "building" }[] = [
  { value: "inventario", label: "Inventario", icon: "leaf" },
  { value: "riesgo", label: "Riesgo Arbóreo", icon: "alert" },
  { value: "infraestructura", label: "Infraestructura", icon: "building" },
];

/** Dock inferior: lentes del mapa (cada una conserva su ruta actual) + registrar árbol. */
export function LensDock({ lens, onLens, canWrite }: { lens: Lens; onLens: (l: Lens) => void; canWrite: boolean }) {
  return (
    <div className="dock">
      <Glass className="dock__main">
        <Segmented options={LENSES} value={lens} onChange={onLens} label="Lentes del mapa" size="lg" />
      </Glass>
      {canWrite && (
        <button type="button" className="fab" aria-label="Nuevo árbol" title="Nuevo árbol">
          <Icon name="plus" size={22} stroke={2.4} />
        </button>
      )}
    </div>
  );
}

/** Filtros y lista: acceso a la tabla de la lente activa. */
export function ListTools({ count }: { count: number }) {
  return (
    <div className="tools">
      <Glass className="dock__side">
        <button type="button" className="dock__btn">
          <Icon name="filter" size={16} />
          Filtros
          <span className="dock__badge">2</span>
        </button>
      </Glass>
      <Glass className="dock__side tools__list">
        <button type="button" className="dock__btn">
          <Icon name="list" size={16} />
          Lista
          <span className="dock__count">{count} registros</span>
          <Icon name="chevronUp" size={15} />
        </button>
      </Glass>
    </div>
  );
}

export function MapControls() {
  return (
    <div className="controls">
      <Glass className="controls__group">
        <IconButton icon="compass" label="Orientar al norte" tone="plain" />
        <IconButton icon="layers" label="Mapa base" tone="plain" />
        <IconButton icon="locate" label="Centrar en mi ubicación" tone="plain" />
      </Glass>
      <Glass className="controls__group">
        <IconButton icon="plus" label="Acercar" tone="plain" />
        <IconButton icon="minus" label="Alejar" tone="plain" />
      </Glass>
    </div>
  );
}

export function MapFooter({ role, onRole }: { role: Role; onRole: (r: Role) => void }) {
  return (
    <div className="mfoot">
      <Glass className="proto">
        <span className="proto__tag">Maqueta</span>
        <span className="proto__txt">Ver como</span>
        <Segmented
          options={[
            { value: "admin", label: "Administrador" },
            { value: "municipal", label: "Municipal" },
          ]}
          value={role}
          onChange={onRole}
          label="Ver la maqueta con el rol"
          size="sm"
        />
      </Glass>
      <div className="attrib">
        <span className="scale">
          <span className="scale__bar" />
          50 m
        </span>
        Imagen: Esri, Maxar, Earthstar Geographics
      </div>
    </div>
  );
}
