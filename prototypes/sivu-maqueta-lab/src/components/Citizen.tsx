import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import type { Theme } from "./TopBar";
import logoLight from "../assets/sivu-logo-light.png";
import logoOlive from "../assets/sivu-logo-olive.png";
import {
  HERO,
  INC_COLOR,
  INC_HELP,
  INC_PUBLIC,
  INC_TYPES,
  PRIORITY_HELP,
  REPORTS,
  type CitizenReport,
  type IncState,
  type IncType,
  type Priority,
  type PublicTree,
} from "../data/conecta";

/* ═════════ Piezas compartidas con la vista municipal ═════════ */

/** Patrón QR decorativo (no escaneable): 25×25 módulos con los tres marcadores de posición. */
export function QrArt({ seed, size = 120 }: { seed: string; size?: number }) {
  const N = 25;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const finder = (x: number, y: number) =>
    [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
  const cells: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.52) cells.push([x, y]);
  const Eye = ({ x, y }: { x: number; y: number }) => (
    <>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.4} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill="currentColor" />
    </>
  );
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} width={size} height={size} className="qrart" role="img" aria-label="Código QR ilustrativo">
      <rect x={-1} y={-1} width={N + 2} height={N + 2} rx={2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.25} fill="currentColor" />
      ))}
      <Eye x={0} y={0} />
      <Eye x={N - 7} y={0} />
      <Eye x={0} y={N - 7} />
    </svg>
  );
}

/** Ilustración del árbol para la ficha (no es una foto real). */
export function TreeArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg viewBox="0 0 390 220" preserveAspectRatio="xMidYMax slice" className={`tree-art ${compact ? "tree-art--sm" : ""}`} aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe9cf" />
          <stop offset="1" stopColor="#f3f0dc" />
        </linearGradient>
        <linearGradient id="crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d9457" />
          <stop offset="1" stopColor="#485635" />
        </linearGradient>
      </defs>
      <rect width="390" height="220" fill="url(#sky)" />
      <circle cx="318" cy="52" r="22" fill="#f7e2a4" opacity="0.8" />
      <path d="M0 196 Q 90 176 190 188 T 390 182 V220 H0Z" fill="#c9d6ad" />
      <path d="M190 200 C 186 170 182 150 192 118 M192 150 C 176 140 166 128 160 116 M194 140 C 210 130 220 120 226 106" stroke="#5b4630" strokeWidth="9" strokeLinecap="round" fill="none" />
      <g fill="url(#crown)">
        <circle cx="160" cy="96" r="40" />
        <circle cx="226" cy="90" r="44" />
        <circle cx="194" cy="62" r="46" />
        <circle cx="132" cy="122" r="26" />
        <circle cx="256" cy="120" r="28" />
      </g>
      <g fill="#9fb877" opacity="0.55">
        <circle cx="180" cy="48" r="16" />
        <circle cx="238" cy="72" r="12" />
        <circle cx="150" cy="84" r="10" />
      </g>
      <path d="M0 206 Q 120 196 220 204 T 390 200 V220 H0Z" fill="#a9bd84" />
    </svg>
  );
}

export type PublicField =
  | "nombre_comun"
  | "especie_cientifica"
  | "clase_edad"
  | "altura_m"
  | "dap_cm"
  | "diametro_copa_m"
  | "ubicacion_descriptiva"
  | "id_arbol"
  | "sobre_especie";

export const DEFAULT_FIELDS: PublicField[] = [
  "nombre_comun",
  "especie_cientifica",
  "clase_edad",
  "altura_m",
  "dap_cm",
  "diametro_copa_m",
  "ubicacion_descriptiva",
  "id_arbol",
  "sobre_especie",
];

const num = (n: number) => n.toLocaleString("es-CL");

/** Ficha pública del árbol: lo que ve quien escanea la placa. */
export function TreeFicha({ p, fields = DEFAULT_FIELDS, onReport }: { p: PublicTree; fields?: PublicField[]; onReport?: () => void }) {
  const has = (f: PublicField) => fields.includes(f);
  const stats: [PublicField, string, string, string][] = [
    ["clase_edad", "Edad", p.edad, "clase de edad"],
    ["altura_m", "Altura", `${num(p.altura)} m`, "aprox."],
    ["dap_cm", "Tronco", `${p.dap} cm`, "diámetro (DAP)"],
    ["diametro_copa_m", "Copa", `${num(p.copa)} m`, "de ancho"],
  ];
  const shown = stats.filter(([f]) => has(f));
  return (
    <div className="cz-ficha">
      <div className="cz-hero">
        <TreeArt />
        <span className="cz-hero__qr">
          <Icon name="qr" size={13} /> Placa {p.qr}
        </span>
      </div>
      <div className="cz-ficha__body">
        <div className="cz-title">
          {has("nombre_comun") && <h1>{p.tree.common}</h1>}
          {has("especie_cientifica") && <p className="cz-sci">{p.tree.scientific}</p>}
        </div>
        {shown.length > 0 && (
          <div className="cz-stats">
            {shown.map(([f, k, v, s]) => (
              <div key={f}>
                <span>{k}</span>
                <strong>{v}</strong>
                <small>{s}</small>
              </div>
            ))}
          </div>
        )}
        {(has("ubicacion_descriptiva") || has("id_arbol")) && (
          <div className="cz-row">
            <span className="cz-row__icon">
              <Icon name="pin" size={17} />
            </span>
            <div>
              {has("ubicacion_descriptiva") && <strong>{p.tree.place}</strong>}
              {has("id_arbol") && <small>Árbol {p.tree.code} del inventario de arbolado</small>}
            </div>
          </div>
        )}
        {has("sobre_especie") && (
          <div className="cz-card">
            <h3>Sobre esta especie</h3>
            <p>{p.about}</p>
          </div>
        )}
        <div className="cz-card cz-card--care">
          <span className="cz-row__icon">
            <Icon name="leaf" size={17} />
          </span>
          <div>
            <h3>Cuidemos este árbol</h3>
            <p>Si ves una rama rota, raíces levantadas o algo que te preocupe, avísanos.</p>
          </div>
        </div>
        <p className="cz-foot">Información del inventario de arbolado urbano · SIVU</p>
      </div>
      {onReport && (
        <div className="cz-cta">
          <button type="button" className="cz-btn" onClick={onReport}>
            <Icon name="alert" size={18} />
            Reportar un problema
          </button>
        </div>
      )}
    </div>
  );
}

export function IncChip({ s, small = false }: { s: IncState; small?: boolean }) {
  return (
    <span className={`inc-chip ${small ? "inc-chip--sm" : ""}`} style={{ ["--c" as string]: INC_COLOR[s] }}>
      {s}
    </span>
  );
}

/* ═════════ App ciudadana (dentro del teléfono) ═════════ */

export type Screen = "scan" | "ficha" | "acceso" | "reporte" | "enviado" | "mis";

function Bar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="cz-bar">
      {onBack ? (
        <button type="button" className="cz-icon" aria-label="Volver" onClick={onBack}>
          <Icon name="chevronLeft" size={20} />
        </button>
      ) : (
        <span className="cz-brand">
          <img src={logoOlive} alt="SIVU" />
          <b>Conecta</b>
        </span>
      )}
      {title && <h2>{title}</h2>}
      <span className="cz-bar__right">{right}</span>
    </header>
  );
}

function Scan({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="cz-scan">
      <div className="cz-scan__park" aria-hidden="true" />
      <div className="cz-scan__top">
        <span>Cámara</span>
      </div>
      <div className="cz-scan__frame">
        <i className="c1" />
        <i className="c2" />
        <i className="c3" />
        <i className="c4" />
        <div className="plate plate--cam">
          <span className="plate__brand">Valpo Verde Conecta</span>
          <QrArt seed={HERO.qr} size={92} />
          <strong>{HERO.tree.common}</strong>
          <small>Escanéame</small>
        </div>
      </div>
      <button type="button" className="cz-detect" onClick={onOpen}>
        <span className="cz-detect__icon">
          <Icon name="qr" size={18} />
        </span>
        <span>
          <strong>Abrir Valpo Verde Conecta</strong>
          <small>Ficha del árbol · placa {HERO.qr}</small>
        </span>
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}

function Access({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"crear" | "ingresar">("crear");
  const [ok, setOk] = useState(true);
  return (
    <div className="cz-screen">
      <Bar onBack={onBack} title="Tu cuenta" />
      <div className="cz-pad">
        <div className="cz-lead">
          <span className="cz-lead__icon">
            <Icon name="user" size={22} />
          </span>
          <h1>Para reportar necesitas una cuenta</h1>
          <p>Así te avisamos cómo avanza tu reporte y evitamos reportes falsos. Ver la ficha del árbol no requiere cuenta.</p>
        </div>
        <div className="cz-tabs" role="tablist">
          {(["crear", "ingresar"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
              {m === "crear" ? "Crear cuenta" : "Ya tengo cuenta"}
            </button>
          ))}
        </div>
        <form
          className="cz-form"
          onSubmit={(e) => {
            e.preventDefault();
            onDone();
          }}
        >
          {mode === "crear" && (
            <label className="cz-field">
              <span>Nombre</span>
              <input defaultValue="Camila Rojas" autoComplete="off" />
            </label>
          )}
          <label className="cz-field">
            <span>Correo electrónico</span>
            <input type="email" defaultValue="camila@ejemplo.cl" autoComplete="off" />
          </label>
          <label className="cz-field">
            <span>Contraseña</span>
            <input type="password" defaultValue="••••••••••" autoComplete="off" />
          </label>
          {mode === "crear" && (
            <label className="cz-check">
              <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
              <span>
                Acepto que mis datos se usen solo para gestionar mis reportes. <u>Política de privacidad</u>
              </span>
            </label>
          )}
          <button type="submit" className="cz-btn" disabled={mode === "crear" && !ok}>
            {mode === "crear" ? "Crear cuenta y continuar" : "Ingresar"}
          </button>
          <button type="button" className="cz-btn cz-btn--ghost" onClick={onDone}>
            <Icon name="mail" size={17} />
            Recibir un enlace por correo
          </button>
        </form>
      </div>
    </div>
  );
}

const PRIORITIES: Priority[] = ["Crítica", "Alta", "Media", "Baja"];

function ReportForm({ onBack, onSend }: { onBack: () => void; onSend: (r: { tipo: IncType; prioridad: Priority; descripcion: string; foto: boolean }) => void }) {
  const [tipo, setTipo] = useState<IncType | null>(null);
  const [prioridad, setPrioridad] = useState<Priority>("Media");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(false);
  return (
    <div className="cz-screen">
      <Bar onBack={onBack} title="Reportar un problema" />
      <div className="cz-pad cz-pad--form">
        <div className="cz-treecard">
          <TreeArt compact />
          <div>
            <strong>{HERO.tree.common}</strong>
            <small>
              {HERO.tree.code} · {HERO.tree.place}
            </small>
            <em>
              <Icon name="check" size={13} stroke={2.4} /> Identificado por la placa QR
            </em>
          </div>
        </div>

        <h3 className="cz-q">¿Qué viste?</h3>
        <div className="cz-types">
          {INC_TYPES.map((t) => (
            <button key={t} type="button" className={tipo === t ? "is-on" : ""} aria-pressed={tipo === t} onClick={() => setTipo(t)}>
              <strong>{t}</strong>
              <small>{INC_HELP[t]}</small>
            </button>
          ))}
        </div>

        <h3 className="cz-q">¿Qué tan urgente te parece?</h3>
        <div className="cz-urg">
          {PRIORITIES.map((p) => (
            <button key={p} type="button" className={prioridad === p ? "is-on" : ""} aria-pressed={prioridad === p} onClick={() => setPrioridad(p)}>
              <Bars n={4 - PRIORITIES.indexOf(p)} />
              <strong>{p}</strong>
              <small>{PRIORITY_HELP[p]}</small>
            </button>
          ))}
        </div>
        {prioridad === "Crítica" && (
          <p className="cz-warn">
            <Icon name="alert" size={16} />
            Si hay personas en riesgo ahora, llama primero a Bomberos (132).
          </p>
        )}

        <h3 className="cz-q">
          Cuéntanos más <span>opcional</span>
        </h3>
        <textarea className="cz-text" rows={3} placeholder="Ej.: la rama cuelga sobre la banca del lado del kiosco" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />

        <h3 className="cz-q">
          Foto <span>recomendada</span>
        </h3>
        {foto ? (
          <div className="cz-photo">
            <div className="cz-photo__img" />
            <button type="button" onClick={() => setFoto(false)}>
              Quitar
            </button>
          </div>
        ) : (
          <button type="button" className="cz-addphoto" onClick={() => setFoto(true)}>
            <Icon name="camera" size={22} />
            Tomar o subir una foto
          </button>
        )}
        <p className="cz-note">
          <Icon name="pin" size={14} /> Se usa la ubicación registrada del árbol. No guardamos tu ubicación.
        </p>
      </div>
      <div className="cz-cta">
        <button type="button" className="cz-btn" disabled={!tipo} onClick={() => tipo && onSend({ tipo, prioridad, descripcion, foto })}>
          <Icon name="send" size={17} />
          {tipo ? "Enviar reporte" : "Elige qué viste para continuar"}
        </button>
      </div>
    </div>
  );
}

export function Bars({ n }: { n: number }) {
  return (
    <span className="ubars" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= n ? "on" : ""} style={{ height: 4 + i * 3 }} />
      ))}
    </span>
  );
}

function Sent({ r, onMine, onFicha }: { r: CitizenReport; onMine: () => void; onFicha: () => void }) {
  return (
    <div className="cz-screen cz-sent">
      <div className="cz-pad">
        <span className="cz-sent__check">
          <Icon name="check" size={40} stroke={2.6} />
        </span>
        <h1>¡Gracias, Camila!</h1>
        <p>Recibimos tu reporte. El equipo municipal lo revisará y te avisaremos por correo cada vez que cambie su estado.</p>
        <div className="cz-sent__code">
          <span>Número de reporte</span>
          <strong className="mono">{r.code}</strong>
          <IncChip s="Ingresada" />
        </div>
        <div className="cz-sent__sum">
          <div>
            <span>Árbol</span>
            <strong>{r.tree?.common}</strong>
          </div>
          <div>
            <span>Problema</span>
            <strong>{r.tipo}</strong>
          </div>
          <div>
            <span>Urgencia</span>
            <strong>{r.prioridad}</strong>
          </div>
        </div>
      </div>
      <div className="cz-cta cz-cta--stack">
        <button type="button" className="cz-btn" onClick={onMine}>
          Ver mis reportes
        </button>
        <button type="button" className="cz-btn cz-btn--ghost" onClick={onFicha}>
          Volver a la ficha del árbol
        </button>
      </div>
    </div>
  );
}

const FLOW: IncState[] = ["Ingresada", "En revisión", "Derivada", "Resuelta"];

function Mine({ list, onBack }: { list: CitizenReport[]; onBack: () => void }) {
  return (
    <div className="cz-screen">
      <Bar onBack={onBack} title="Mis reportes" />
      <div className="cz-pad cz-mine">
        <p className="cz-mine__hi">
          Hola, <strong>Camila</strong> · {list.length} reportes
        </p>
        {list.map((r) => {
          const step = r.estado === "Descartada" ? 1 : FLOW.indexOf(r.estado);
          return (
            <article key={r.code} className="cz-rep">
              <header>
                <div>
                  <strong>{r.tipo}</strong>
                  <small>
                    {r.tree?.common ?? "Sin árbol identificado"} · {r.fecha.slice(8, 10)}-{r.fecha.slice(5, 7)} · <span className="mono">{r.code}</span>
                  </small>
                </div>
                <IncChip s={r.estado} small />
              </header>
              <ol className={`cz-steps ${r.estado === "Descartada" ? "is-off" : ""}`} aria-label="Avance del reporte">
                {FLOW.map((s, i) => (
                  <li key={s} className={i <= step ? "done" : ""}>
                    <i />
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="cz-rep__msg">
                <Icon name="reply" size={14} />
                {r.respuesta ?? INC_PUBLIC[r.estado]}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function CitizenApp({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const [logged, setLogged] = useState(false);
  const [mine, setMine] = useState<CitizenReport[]>(() => REPORTS.filter((r) => r.persona === "Camila R."));
  const last = mine[0];

  const user = (
    <button type="button" className="cz-icon" aria-label={logged ? "Mis reportes" : "Ingresar"} onClick={() => go(logged ? "mis" : "acceso")}>
      <Icon name="user" size={19} />
    </button>
  );

  return (
    <div className="cz">
      {screen === "scan" && <Scan onOpen={() => go("ficha")} />}
      {screen === "ficha" && (
        <div className="cz-screen">
          <Bar right={user} />
          <div className="cz-scroll">
            <TreeFicha p={HERO} onReport={() => go(logged ? "reporte" : "acceso")} />
          </div>
        </div>
      )}
      {screen === "acceso" && (
        <Access
          onBack={() => go("ficha")}
          onDone={() => {
            setLogged(true);
            go("reporte");
          }}
        />
      )}
      {screen === "reporte" && (
        <ReportForm
          onBack={() => go("ficha")}
          onSend={(d) => {
            setLogged(true);
            setMine((m) => [
              { code: "INC-000149", fecha: "2026-10-18 10:12", estado: "Ingresada", tree: HERO.tree, place: HERO.tree.place, persona: "Camila R.", ...d },
              ...m.filter((r) => r.code !== "INC-000149"),
            ]);
            go("enviado");
          }}
        />
      )}
      {screen === "enviado" && last && <Sent r={last} onMine={() => go("mis")} onFicha={() => go("ficha")} />}
      {screen === "mis" && <Mine list={mine} onBack={() => go("ficha")} />}
    </div>
  );
}

/* ═════════ Vista de presentación (escritorio) ═════════ */

const STEPS: { s: Screen; icon: IconName; title: string; text: string }[] = [
  { s: "scan", icon: "qr", title: "Escanea la placa", text: "Cada árbol con placa tiene un QR propio. Se abre con la cámara del teléfono, sin instalar nada." },
  { s: "ficha", icon: "leaf", title: "Conoce el árbol", text: "Ficha pública: especie, edad, tamaño y ubicación. No requiere cuenta." },
  { s: "acceso", icon: "user", title: "Crea tu cuenta", text: "Solo para reportar. Permite avisar el avance y evita reportes falsos." },
  { s: "reporte", icon: "alert", title: "Reporta lo que ves", text: "Tipo de problema, urgencia, comentario y foto. El árbol ya viene identificado." },
  { s: "enviado", icon: "check", title: "Recibe tu número", text: "El reporte entra como incidencia en estado Ingresada." },
  { s: "mis", icon: "clock", title: "Sigue su avance", text: "Ve el estado y la respuesta del municipio en Mis reportes." },
];

const SAVED: [string, string][] = [
  ["tipo_incidencia", "¿Qué viste?"],
  ["prioridad_reportada", "Urgencia"],
  ["descripcion", "Cuéntanos más"],
  ["evidencia_fotografica", "Foto"],
  ["id_arbol · ubicacion · UTM", "Desde la placa QR"],
  ["origen_reporte", "Comunidad"],
  ["reportado_por", "Cuenta ciudadana *"],
  ["estado_incidencia", "Ingresada"],
];

export function CitizenView({ theme, onTheme, onMunicipal }: { theme: Theme; onTheme: () => void; onMunicipal: () => void }) {
  const [screen, setScreen] = useState<Screen>(() => STEPS.find((x) => location.hash.includes(`-${x.s}`))?.s ?? "scan");
  const [scale, setScale] = useState(1);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const fit = () => {
      setMobile(window.innerWidth < 760);
      setScale(Math.min(1, (window.innerHeight - 96) / 860, (window.innerWidth - 40) / 420));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  if (mobile)
    return (
      <div className="cz-mobile">
        <CitizenApp screen={screen} go={setScreen} />
        <button type="button" className="cz-mobile__switch" onClick={onMunicipal}>
          Maqueta · ver vista municipal
        </button>
      </div>
    );

  const idx = STEPS.findIndex((x) => x.s === screen);
  return (
    <div className={`cv theme-${theme}`}>
      <div className="backdrop" aria-hidden="true" />
      <header className="cv-top">
        <span className="brand">
          <img className="brand__logo" src={theme === "dark" ? logoLight : logoOlive} alt="SIVU" />
          <span className="cv-top__name">Valpo Verde Conecta</span>
          <span className="brand__tag">Maqueta</span>
        </span>
        <div className="cv-switch" role="tablist" aria-label="Vista">
          <button type="button" role="tab" aria-selected="true">
            <Icon name="user" size={15} /> Vista ciudadana
          </button>
          <button type="button" role="tab" aria-selected="false" onClick={onMunicipal}>
            <Icon name="building" size={15} /> Vista municipal
          </button>
        </div>
        <button type="button" className="icon-btn icon-btn--dark" style={{ width: 40, height: 40 }} aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={onTheme}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
      </header>

      <div className="cv-body">
        <aside className="cv-steps">
          <p className="cv-eyebrow">Recorrido ciudadano</p>
          <h1>De la placa del parque al reporte</h1>
          <ol>
            {STEPS.map((st, i) => (
              <li key={st.s}>
                <button type="button" className={`${i === idx ? "is-on" : ""} ${i < idx ? "is-done" : ""}`} onClick={() => setScreen(st.s)}>
                  <span className="cv-steps__n">{i < idx ? <Icon name="check" size={14} stroke={2.6} /> : i + 1}</span>
                  <span>
                    <strong>{st.title}</strong>
                    <small>{st.text}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="cv-phone" style={{ width: 410 * scale, height: 852 * scale }}>
          <div className="phone" style={{ transform: `scale(${scale})` }}>
            <div className="phone__notch" />
            <div className="phone__status">
              <span>10:12</span>
              <span className="phone__sig">
                <i />
                <i />
                <i />
                <b />
              </span>
            </div>
            <div className="phone__screen">
              <CitizenApp screen={screen} go={setScreen} />
            </div>
          </div>
        </div>

        <aside className="cv-side">
          <section className="panel cv-plate">
            <div className="panel__head">
              <h2>La placa en el parque</h2>
              <span className="panel__count">Una por árbol</span>
            </div>
            <div className="plate">
              <span className="plate__brand">Valpo Verde Conecta</span>
              <QrArt seed={HERO.qr} size={128} />
              <strong>{HERO.tree.common}</strong>
              <em>{HERO.tree.scientific}</em>
              <small>Escanéame · conoce este árbol y avísanos si ves algo raro</small>
              <span className="plate__code mono">{HERO.qr}</span>
            </div>
          </section>
          <section className="panel cv-saved">
            <div className="panel__head">
              <h2>Qué queda registrado</h2>
              <span className="panel__count">Hoja INCIDENCIA</span>
            </div>
            <ul>
              {SAVED.map(([f, v]) => (
                <li key={f}>
                  <code>{f}</code>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            <p className="panel__foot">* El modelo actual no tiene cuentas ciudadanas: el rol queda como decisión pendiente.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
