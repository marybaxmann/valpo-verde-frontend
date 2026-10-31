import { useId } from "react";
import "../styles/sivu-loader.css";

/**
 * Indicador de carga de SIVU: escena botánica horizontal. Una hoja
 * alargada flota en diagonal, llevada por dos corrientes de aire (estelas
 * como pinceladas pálidas que se afinan y se desvanecen), con dos hojas
 * pequeñas a su alrededor, una sombra difusa, el texto y tres puntos.
 *
 * Solo SVG + CSS, sin dependencias. Las ilustraciones son estáticas; el
 * movimiento vive en contenedores HTML (transform/opacity, hilo del
 * compositor) que oscilan de ida y vuelta con períodos distintos: el loop
 * es continuo y nunca se reinicia de golpe.
 *
 * - `fullscreen`: pantalla completa (sesión, perfil, cambio de pantalla).
 * - `inline`: espacios pequeños dentro de módulos, tarjetas y paneles
 *   (solo la hoja, su sombra y los puntos).
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
  // comparten (ni pierden) sus degradados y filtros.
  const uid = "sl" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const classes = ["sivu-loader", `sivu-loader--${variant}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <div className="sivu-loader__stage" aria-hidden="true">
        <div className="sivu-loader__breeze sivu-loader__breeze--left">
          <BreezeLeft uid={uid} />
        </div>
        <div className="sivu-loader__breeze sivu-loader__breeze--right">
          <BreezeRight uid={uid} />
        </div>
        <span className="sivu-loader__shadow" />
        <div className="sivu-loader__leaf-x">
          <div className="sivu-loader__leaf-y">
            <div className="sivu-loader__leaf-sway">
              <Leaf uid={uid} />
            </div>
          </div>
        </div>
        <div className="sivu-loader__mini sivu-loader__mini--a">
          <div className="sivu-loader__mini-sway">
            <Leaf uid={uid} mini />
          </div>
        </div>
        <div className="sivu-loader__mini sivu-loader__mini--b">
          <div className="sivu-loader__mini-sway">
            <Leaf uid={uid} mini />
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

/* ---------- Estelas de viento (escena 600×300) ----------
   Medialunas rellenas: gruesas al centro y afinadas en los extremos,
   con un degradado que las desvanece hacia las puntas y un desenfoque
   leve que las vuelve pincelada. Un trazo fino paralelo acompaña cada una. */

function BreezeLeft({ uid }: { uid: string }) {
  const g = `${uid}-breeze-l`;
  return (
    <svg viewBox="0 0 600 300" fill="none">
      <defs>
        <linearGradient id={g} x1="330" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-breeze)" stopOpacity="0" />
          <stop offset="0.55" stopColor="var(--sl-breeze)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--sl-breeze)" stopOpacity="0.85" />
        </linearGradient>
        <filter id={`${g}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <path
        filter={`url(#${g}-soft)`}
        fill={`url(#${g})`}
        d="M292 98 C205 96 142 124 146 162 C150 198 232 214 336 204 C252 204 182 192 172 162 C164 132 214 106 292 98 Z"
      />
      <path d="M318 84 C210 80 124 116 130 162 C134 196 186 214 246 218" stroke={`url(#${g})`} strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function BreezeRight({ uid }: { uid: string }) {
  const g = `${uid}-breeze-r`;
  return (
    <svg viewBox="0 0 600 300" fill="none">
      <defs>
        <linearGradient id={g} x1="300" y1="50" x2="452" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-breeze)" stopOpacity="0" />
          <stop offset="0.55" stopColor="var(--sl-breeze)" stopOpacity="0.75" />
          <stop offset="1" stopColor="var(--sl-breeze)" stopOpacity="0" />
        </linearGradient>
        <filter id={`${g}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <path
        filter={`url(#${g}-soft)`}
        fill={`url(#${g})`}
        d="M300 50 C384 34 466 58 472 98 C476 124 460 142 436 154 C452 136 460 118 454 98 C446 72 384 54 300 50 Z"
      />
      <path d="M352 30 C430 30 488 60 488 100 C488 122 474 138 458 148" stroke={`url(#${g})`} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

/* ---------- Hoja ----------
   Coordenadas locales 320×140: pecíolo a la izquierda, punta a la derecha.
   Lámina lanceolada con la nervadura levemente curvada hacia arriba;
   mitad superior iluminada, inferior en sombra suave. */

const BLADE =
  "M30 80 C58 46 126 24 200 28 C244 30 280 30 304 34 C276 60 234 92 162 104 C100 114 52 104 30 80 Z";
const LOWER_HALF = "M30 80 C110 83 210 72 304 34 C276 60 234 92 162 104 C100 114 52 104 30 80 Z";
const MIDRIB = "M30 80 C110 83 210 72 304 34";
const VEINS =
  "M72 80 C88 70 100 58 116 50 M112 80 C128 68 142 56 160 46 M152 78 C168 66 184 54 204 44 M194 74 C210 62 228 52 246 44 M236 66 C250 56 266 48 280 42 " +
  "M80 81 C94 90 108 96 124 99 M120 81 C136 88 152 92 168 93 M162 78 C178 84 194 86 210 85 M204 72 C218 76 232 76 246 73 M244 62 C256 64 268 62 278 58";

function Leaf({ uid, mini = false }: { uid: string; mini?: boolean }) {
  const id = (name: string) => `${uid}-${mini ? "m" : "l"}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  return (
    // La hoja pequeña se dibuja más ancha (estirada en alto): a ese tamaño,
    // la proporción de la principal se leería como una astilla.
    <svg className="sivu-loader__leaf" viewBox="0 0 320 140" preserveAspectRatio={mini ? "none" : undefined}>
      <defs>
        <linearGradient id={id("blade")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--sl-leaf-3)" />
          <stop offset="0.45" stopColor="var(--sl-leaf-2)" />
          <stop offset="1" stopColor="var(--sl-leaf-1)" />
        </linearGradient>
        <linearGradient id={id("shade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sl-leaf-4)" stopOpacity="0.15" />
          <stop offset="1" stopColor="var(--sl-leaf-4)" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id={id("light")} cx="0.55" cy="0.3" r="0.5">
          <stop offset="0" stopColor="#fbfde9" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fbfde9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("rib")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--sl-vein)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--sl-vein)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d="M31 80 C22 83 12 89 3 99" stroke="var(--sl-leaf-4)" strokeWidth={mini ? 6 : 3} strokeLinecap="round" fill="none" />
      <path d={BLADE} fill={url("blade")} />
      <path d={LOWER_HALF} fill={url("shade")} />
      <path d={BLADE} fill={url("light")} />
      {!mini && <path d={VEINS} stroke="var(--sl-vein)" strokeOpacity="0.32" strokeWidth="0.9" strokeLinecap="round" fill="none" />}
      <path d={MIDRIB} stroke={url("rib")} strokeWidth={mini ? 5 : 2.2} strokeLinecap="round" fill="none" />
      {/* Borde de luz en el canto superior. */}
      {!mini && <path d="M32 79 C59 47 126 25 200 29 C244 31 280 31 302 35" stroke="#fbfde9" strokeOpacity="0.4" strokeWidth="1" fill="none" />}
    </svg>
  );
}
