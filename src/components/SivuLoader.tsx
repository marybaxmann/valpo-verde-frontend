import { useId } from "react";
import "../styles/sivu-loader.css";

/**
 * Indicador de carga de SIVU: ilustración botánica animada. Una hoja
 * semirrealista flota envuelta por dos estelas de viento (que pasan por
 * detrás y por delante de ella), acompañada por dos hojas pequeñas, con
 * su sombra en el suelo, el texto de carga y tres puntos.
 *
 * Solo SVG + CSS, sin dependencias. Las ilustraciones son estáticas; el
 * movimiento vive en contenedores HTML (transform/opacity, hilo del
 * compositor) que oscilan de ida y vuelta: el loop no se reinicia de
 * golpe. Lo único que se anima dentro del SVG es el trazo de las estelas.
 *
 * - `fullscreen`: pantalla completa (sesión, perfil, cambio de pantalla).
 * - `inline`: espacios pequeños dentro de módulos, tarjetas y paneles
 *   (sin estelas ni hojas pequeñas).
 *
 * Con `prefers-reduced-motion` la escena queda quieta y solo los puntos
 * cambian de opacidad; el texto sigue informando el estado.
 */
export type SivuLoaderVariant = "fullscreen" | "inline";

export const SIVU_LOADER_DEFAULT_MESSAGE = "Preparando tu entorno verde…";

export function SivuLoader({
  variant = "inline",
  message = SIVU_LOADER_DEFAULT_MESSAGE,
  className,
}: {
  variant?: SivuLoaderVariant;
  /** Texto visible y anunciado por lectores de pantalla. */
  message?: string;
  className?: string;
}) {
  // Ids únicos por instancia: varios loaders en la misma página no
  // comparten (ni pierden) sus degradados, filtros y recortes.
  const uid = "sl" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const classes = ["sivu-loader", `sivu-loader--${variant}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <div className="sivu-loader__stage" aria-hidden="true">
        <span className="sivu-loader__shadow" />
        <div className="sivu-loader__float-x">
          <div className="sivu-loader__float-y">
            <WindTrails uid={uid} half="back" />
            <div className="sivu-loader__leaf-wrap">
              <div className="sivu-loader__sway">
                <div className="sivu-loader__tilt">
                  <Leaf uid={uid} />
                </div>
              </div>
            </div>
            <WindTrails uid={uid} half="front" />
          </div>
        </div>
        <div className="sivu-loader__mini sivu-loader__mini--a">
          <div className="sivu-loader__mini-spin">
            <MiniLeaf uid={uid} tone="a" />
          </div>
        </div>
        <div className="sivu-loader__mini sivu-loader__mini--b">
          <div className="sivu-loader__mini-spin">
            <MiniLeaf uid={uid} tone="b" />
          </div>
        </div>
      </div>
      <p className="sivu-loader__message">{message}</p>
      <span className="sivu-loader__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/* ---------- Estelas de viento ----------
   Cada estela es una elipse inclinada alrededor de la hoja. Se dibuja
   dos veces con el mismo trazo animado: la mitad superior en una capa
   detrás de la hoja y la inferior en una capa delante, así la estela la
   envuelve. Cola fina + cabeza algo más marcada = trazo que se afina. */

const TRAILS = [
  { key: "a", rx: 172, ry: 50, rotate: -16 },
  { key: "b", rx: 150, ry: 66, rotate: 24 },
] as const;

function ellipsePath(rx: number, ry: number) {
  return `M${-rx} 0 A${rx} ${ry} 0 1 0 ${rx} 0 A${rx} ${ry} 0 1 0 ${-rx} 0`;
}

function WindTrails({ uid, half }: { uid: string; half: "back" | "front" }) {
  return (
    <svg className={`sivu-loader__trails sivu-loader__trails--${half}`} viewBox="0 0 400 400" fill="none">
      <defs>
        <clipPath id={`${uid}-clip-${half}`}>
          {/* Coordenadas locales de cada elipse: y < 0 atrás, y > 0 adelante. */}
          <rect x="-220" y={half === "back" ? -120 : 0} width="440" height="120" />
        </clipPath>
        <linearGradient id={`${uid}-trail`} x1="-180" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-trail-soft)" stopOpacity="0" />
          <stop offset="0.3" stopColor="var(--sl-trail-soft)" />
          <stop offset="0.7" stopColor="var(--sl-trail)" />
          <stop offset="1" stopColor="var(--sl-trail)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {TRAILS.map((t) => (
        <g key={t.key} transform={`translate(200 194) rotate(${t.rotate})`}>
          <g clipPath={`url(#${uid}-clip-${half})`} className={`sivu-loader__trail sivu-loader__trail--${t.key}`}>
            <path className="sivu-loader__trail-tail" d={ellipsePath(t.rx, t.ry)} pathLength={100} stroke={`url(#${uid}-trail)`} />
            <path className="sivu-loader__trail-head" d={ellipsePath(t.rx, t.ry)} pathLength={100} stroke={`url(#${uid}-trail)`} />
          </g>
        </g>
      ))}
    </svg>
  );
}

/* ---------- Hoja principal ----------
   Lámina asimétrica con la punta curvada, plegada levemente sobre la
   nervadura central: mitad iluminada, mitad en sombra, brillo difuso,
   textura fina, borde y nervaduras secundarias que se curvan hacia la
   punta. Coordenadas locales 200×320; pecíolo abajo. */

const BLADE =
  "M100 262 C52 248 30 190 34 140 C38 88 70 44 114 16 C142 52 168 100 166 152 C164 206 138 248 100 262 Z";
const BLADE_SHADE_HALF = "M100 262 C96 200 98 120 114 16 C142 52 168 100 166 152 C164 206 138 248 100 262 Z";
const MIDRIB = "M100 262 C96 200 98 120 114 16";

/** [y en la nervadura, x en la nervadura, x borde izquierdo, x borde derecho] */
const VEINS: Array<[number, number, number, number]> = [
  [238, 98.6, 50, 150],
  [210, 97.6, 40, 160],
  [182, 97.2, 36, 165],
  [154, 98, 37, 165],
  [126, 99.6, 42, 160],
  [98, 102, 52, 150],
  [72, 105, 66, 137],
];

function veinPaths() {
  return VEINS.map(([y, mx, lx, rx]) => {
    const rise = 30;
    const left = `M${mx} ${y} C${mx - 16} ${y - 4} ${lx + 18} ${y - rise * 0.55} ${lx + 6} ${y - rise}`;
    const right = `M${mx} ${y} C${mx + 16} ${y - 4} ${rx - 18} ${y - rise * 0.55} ${rx - 6} ${y - rise}`;
    return `${left} ${right}`;
  }).join(" ");
}

const VEINS_D = veinPaths();

function Leaf({ uid }: { uid: string }) {
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  return (
    <svg className="sivu-loader__leaf" viewBox="0 0 200 320">
      <defs>
        <linearGradient id={id("blade")} x1="0.12" y1="0.05" x2="0.88" y2="0.95">
          <stop offset="0" stopColor="var(--sl-leaf-1)" />
          <stop offset="0.34" stopColor="var(--sl-leaf-2)" />
          <stop offset="0.68" stopColor="var(--sl-leaf-3)" />
          <stop offset="1" stopColor="var(--sl-leaf-4)" />
        </linearGradient>
        <linearGradient id={id("fold")} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stopColor="#06281b" stopOpacity="0.04" />
          <stop offset="1" stopColor="#06281b" stopOpacity="0.36" />
        </linearGradient>
        <radialGradient id={id("light")} cx="0.34" cy="0.36" r="0.55">
          <stop offset="0" stopColor="#fffbe8" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#fffbe8" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fffbe8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("rib")} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--sl-vein)" stopOpacity="0.95" />
          <stop offset="1" stopColor="var(--sl-vein)" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={id("stem")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6e9f4f" />
          <stop offset="1" stopColor="#2e5f3c" />
        </linearGradient>
        <clipPath id={id("clip")}>
          <path d={BLADE} />
        </clipPath>
        {/* Textura fina de la lámina (estática: se rasteriza una vez). */}
        <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0.55 -0.12" />
        </filter>
      </defs>

      {/* Pecíolo */}
      <path d="M100 262 C99 280 96 296 90 310" stroke={url("stem")} strokeWidth="5" strokeLinecap="round" fill="none" />

      <g clipPath={url("clip")}>
        <path d={BLADE} fill={url("blade")} />
        <path d={BLADE_SHADE_HALF} fill={url("fold")} />
        <rect width="200" height="320" filter={url("grain")} opacity="0.5" />
        <path d={BLADE} fill={url("light")} />
        {/* Nervaduras secundarias: claro encima, sombra corrida debajo = relieve. */}
        <path d={VEINS_D} transform="translate(0.8 1.2)" stroke="#06281b" strokeOpacity="0.18" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d={VEINS_D} stroke="var(--sl-vein)" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" fill="none" />
        {/* Nervadura central */}
        <path d={MIDRIB} transform="translate(1.4 1)" stroke="#06281b" strokeOpacity="0.22" strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <path d={MIDRIB} stroke={url("rib")} strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>

      {/* Borde: oscuro en todo el contorno, luz en el lado iluminado. */}
      <path d={BLADE} fill="none" stroke="var(--sl-leaf-4)" strokeOpacity="0.55" strokeWidth="1.3" />
      <path d="M100 261 C53 247 31 190 35 140 C39 89 71 45 113 18" fill="none" stroke="#fffbe8" strokeOpacity="0.45" strokeWidth="1" />
    </svg>
  );
}

/** Hoja pequeña de acompañamiento: misma forma, menos detalle. */
function MiniLeaf({ uid, tone }: { uid: string; tone: "a" | "b" }) {
  const gid = `${uid}-mini-${tone}`;
  return (
    <svg className="sivu-loader__mini-leaf" viewBox="0 0 200 320">
      <defs>
        <linearGradient id={gid} x1="0.1" y1="0.05" x2="0.9" y2="0.95">
          <stop offset="0" stopColor={tone === "a" ? "var(--sl-leaf-1)" : "var(--sl-leaf-2)"} />
          <stop offset="1" stopColor={tone === "a" ? "var(--sl-leaf-3)" : "var(--sl-leaf-4)"} />
        </linearGradient>
      </defs>
      <path d="M100 262 C99 280 96 296 90 310" stroke="var(--sl-leaf-4)" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d={BLADE} fill={`url(#${gid})`} />
      <path d={BLADE_SHADE_HALF} fill="#06281b" fillOpacity="0.16" />
      <path d={MIDRIB} stroke="var(--sl-vein)" strokeOpacity="0.7" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
