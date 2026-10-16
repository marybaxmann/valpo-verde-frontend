import { useEffect, useState } from "react";
import { MapStage } from "./components/MapStage";
import { TopBar, type Menu } from "./components/TopBar";
import { CommandPalette } from "./components/CommandPalette";
import { GeorefNotice, Overview, PlaceHeader } from "./components/Overview";
import { TreeSheet } from "./components/TreeSheet";
import { ListTools, LensDock, MapControls, MapFooter } from "./components/MapChrome";
import { FEATURED, TREES, type Lens, type Tree } from "./data/mock";
import type { Role } from "./data/nav";

export type { Role } from "./data/nav";

const LIST_COUNT: Record<Lens, number> = { inventario: 131, riesgo: 103, infraestructura: 41 };
const MODULE_NAME: Record<Lens, string> = { inventario: "Inventario", riesgo: "Inspección y Riesgo", infraestructura: "Infraestructura" };

/** Estado inicial desde el ancla (#municipal, #menu-territorio, #buscar…) para revisar cada estado de la maqueta. */
function fromHash() {
  const h = typeof location !== "undefined" ? location.hash.slice(1) : "";
  const menus: Menu[] = ["territorio", "operacion", "analisis", "proyecto", "user"];
  return {
    role: (h.includes("municipal") ? "municipal" : "admin") as Role,
    menu: (h.includes("buscar") ? "buscar" : menus.find((m) => m && h.includes(`menu-${m}`)) ?? null) as Menu,
    lens: (h.includes("inventario") ? "inventario" : h.includes("infraestructura") ? "infraestructura" : "riesgo") as Lens,
  };
}

export default function App() {
  const init = fromHash();
  const [lens, setLens] = useState<Lens>(init.lens);
  const [role, setRole] = useState<Role>(init.role);
  const [menu, setMenu] = useState<Menu>(init.menu);
  const [selected, setSelected] = useState<Tree | null>(FEATURED);
  const [scale, setScale] = useState(1);

  // La maqueta se diseña a 1440×900 y se escala para caber en cualquier ventana.
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1440, window.innerHeight / 900));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenu((m) => (m === "buscar" ? null : "buscar"));
      }
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <MapStage trees={TREES} featured={FEATURED} lens={lens} selectedId={selected?.id ?? ""} onSelect={setSelected} />
        {menu && menu !== "buscar" && <div className="menu-scrim" onClick={() => setMenu(null)} />}
        <div className="left">
          <PlaceHeader module={MODULE_NAME[lens]} />
          <Overview lens={lens} />
          <GeorefNotice />
        </div>
        {selected && <TreeSheet key={selected.id + role} tree={selected} role={role} onClose={() => setSelected(null)} />}
        <div className={`right-rail ${selected ? "" : "right-rail--wide"}`}>
          <MapControls />
        </div>
        <LensDock lens={lens} onLens={setLens} canWrite={role === "municipal"} />
        <ListTools count={LIST_COUNT[lens]} />
        <MapFooter role={role} onRole={setRole} />
        <TopBar role={role} open={menu} setOpen={setMenu} current={MODULE_NAME[lens]} dark onTheme={() => undefined} />
        {menu === "buscar" && <CommandPalette role={role} onClose={() => setMenu(null)} />}
      </div>
    </div>
  );
}
