import { useEffect, useRef, useState } from "react";
import { MapStage } from "./components/MapStage";
import { TopBar, type Menu, type Theme } from "./components/TopBar";
import { CommandPalette } from "./components/CommandPalette";
import { GeorefNotice, Overview, PlaceHeader } from "./components/Overview";
import { TreeSheet } from "./components/TreeSheet";
import { ListTools, MapControls } from "./components/MapChrome";
import { Dashboard } from "./components/Dashboard";
import { Inventory } from "./components/Inventory";
import { Infra } from "./components/Infra";
import { Maintenance } from "./components/Maintenance";
import { Conecta } from "./components/Conecta";
import { CitizenView } from "./components/Citizen";
import { Login } from "./components/Login";
import { FEATURED, TREES, type Tree } from "./data/mock";
import type { Module } from "./data/lab";
import type { NavItem, Role } from "./data/nav";

export type { Role } from "./data/nav";

const MODULES: Module[] = ["dashboard", "inventario", "riesgo", "infraestructura", "mantencion", "conecta"];
const MODULE_NAME: Record<Module, string> = {
  dashboard: "Dashboard",
  inventario: "Inventario",
  riesgo: "Riesgo Arbóreo",
  infraestructura: "Infraestructura",
  mantencion: "Mantención",
  conecta: "Valpo Verde Conecta",
};
const MAP_MODULES: Module[] = ["riesgo", "infraestructura"];

/** Estado inicial desde el ancla (#inventario, #mantencion, #municipal…) para abrir cada pantalla directamente. */
function fromHash() {
  const h = typeof location !== "undefined" ? location.hash.slice(1) : "";
  return {
    role: (h.includes("municipal") ? "municipal" : "admin") as Role,
    module: MODULES.find((m) => h.includes(m)) ?? "dashboard",
    citizen: h.includes("ciudadano"),
    login: h.includes("login"),
  };
}

function MapAttribution() {
  return (
    <div className="mfoot">
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

export default function App() {
  const init = fromHash();
  const [module, setModule] = useState<Module>(init.module);
  const [citizen, setCitizen] = useState(init.citizen);
  const [login, setLogin] = useState(init.login);
  const [role, setRole] = useState<Role>(init.role);
  const [menu, setMenu] = useState<Menu>(null);
  const [selected, setSelected] = useState<Tree | null>(init.module === "riesgo" ? FEATURED : null);
  const [toast, setToast] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [theme, setTheme] = useState<Theme>(() => {
    if (location.hash.includes("claro")) return "light";
    try {
      return localStorage.getItem("sivu-lab-theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const toggleTheme = () =>
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("sivu-lab-theme", next);
      } catch {
        /* sin almacenamiento: el modo dura solo esta visita */
      }
      return next;
    });
  const toastTimer = useRef<number>();

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

  useEffect(() => {
    history.replaceState(null, "", login ? "#login" : citizen ? "#ciudadano" : `#${module}${role === "municipal" ? "-municipal" : ""}`);
  }, [module, role, citizen, login]);

  const go = (m: Module) => {
    setModule(m);
    setMenu(null);
    setSelected(m === "riesgo" ? FEATURED : null);
  };
  const unavailable = (what: string) => {
    setMenu(null);
    setToast(`${what} no está incluido en esta maqueta.`);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };
  const pick = (i: NavItem) => (i.module ? go(i.module) : unavailable(i.label));

  const isMap = MAP_MODULES.includes(module);

  if (login)
    return (
      <Login
        theme={theme}
        onTheme={toggleTheme}
        onEnter={() => {
          setLogin(false);
          setModule("dashboard");
        }}
        onCitizen={() => {
          setLogin(false);
          setCitizen(true);
        }}
      />
    );

  if (citizen)
    return (
      <CitizenView
        theme={theme}
        onTheme={toggleTheme}
        onMunicipal={() => {
          setCitizen(false);
          setRole("municipal");
          setModule("conecta");
        }}
      />
    );

  return (
    <div className={`viewport theme-${theme}`}>
      <div className={`stage ${isMap ? "stage--map" : "stage--page"}`} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {!isMap && <div className="backdrop" aria-hidden="true" />}

        {module === "dashboard" && <Dashboard go={go} unavailable={unavailable} />}

        {module === "inventario" && (
          <>
            <Inventory role={role} selectedId={selected?.id ?? null} onSelect={setSelected} onMap={() => go("riesgo")} />
            {selected && <TreeSheet key={selected.id + role} tree={selected} role={role} onClose={() => setSelected(null)} />}
          </>
        )}

        {module === "riesgo" && (
          <>
            <MapStage trees={TREES} featured={FEATURED} lens="riesgo" selectedId={selected?.id ?? ""} onSelect={setSelected} />
            <div className="left">
              <PlaceHeader module={MODULE_NAME.riesgo} />
              <Overview lens="riesgo" />
              <GeorefNotice />
            </div>
            {selected && <TreeSheet key={selected.id + role} tree={selected} role={role} onClose={() => setSelected(null)} />}
            <div className={`right-rail ${selected ? "" : "right-rail--wide"}`}>
              <MapControls />
            </div>
            <div onClickCapture={() => go("inventario")}>
              <ListTools count={131} />
            </div>
            <MapAttribution />
          </>
        )}

        {module === "infraestructura" && (
          <>
            <Infra role={role} selected={selected} onSelect={setSelected} />
            <MapAttribution />
          </>
        )}

        {module === "mantencion" && <Maintenance role={role} />}

        {module === "conecta" && <Conecta role={role} onCitizen={() => setCitizen(true)} />}

        {menu && menu !== "buscar" && <div className="menu-scrim" onClick={() => setMenu(null)} />}
        <TopBar role={role} open={menu} setOpen={setMenu} current={MODULE_NAME[module]} onRole={setRole} theme={theme} onTheme={toggleTheme} onPick={pick} onHome={() => go("dashboard")} onLogout={() => (setMenu(null), setLogin(true))} />
        {menu === "buscar" && <CommandPalette role={role} onClose={() => setMenu(null)} />}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
