import { useId } from "react";
import "../styles/sivu-loader.css";

/**
 * Indicador de carga de SIVU: una hoja que se desprende de una rama y
 * flota sobre un paisaje del sur de Chile (volcán, lago, bosque).
 *
 * Solo SVG + CSS, sin dependencias. El paisaje son capas SVG estáticas;
 * lo que se mueve son contenedores HTML con `transform`/`opacity`, que el
 * navegador anima en el hilo del compositor: la hoja sigue fluida aunque
 * el hilo principal esté ocupado cargando la pantalla siguiente.
 *
 * - `fullscreen`: pantalla completa (sesión, perfil, cambio de pantalla).
 * - `inline`: escena pequeña dentro de un módulo, tarjeta o panel.
 *
 * Con `prefers-reduced-motion` la hoja queda quieta en la rama y solo
 * respira la opacidad; el texto sigue informando el estado.
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
  // comparten (ni pierden) sus degradados.
  const uid = "sl" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const classes = ["sivu-loader", `sivu-loader--${variant}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <div className="sivu-loader__scene" aria-hidden="true">
        <LandscapeFar uid={uid} />
        <div className="sivu-loader__layer sivu-loader__mist">
          <Mist uid={uid} />
        </div>
        <div className="sivu-loader__layer sivu-loader__parallax-mid">
          <LandscapeMid />
        </div>
        <div className="sivu-loader__layer sivu-loader__parallax-near">
          <LandscapeNear />
        </div>
        <div className="sivu-loader__layer sivu-loader__grass sivu-loader__grass--a">
          <Grass blades={GRASS_A} />
        </div>
        <div className="sivu-loader__layer sivu-loader__grass sivu-loader__grass--b">
          <Grass blades={GRASS_B} />
        </div>
        <Twig />
        <div className="sivu-loader__leaf-x">
          <div className="sivu-loader__leaf-y">
            <div className="sivu-loader__leaf-sway">
              <div className="sivu-loader__leaf-tumble">
                <Leaf uid={uid} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="sivu-loader__message">{message}</p>
    </div>
  );
}

/* ---------- Capas del paisaje (viewBox común 480×300) ---------- */

const VIEWBOX = "0 0 480 300";

function LandscapeFar({ uid }: { uid: string }) {
  return (
    <svg className="sivu-loader__layer" viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sl-sky-top)" />
          <stop offset="1" stopColor="var(--sl-sky-bottom)" />
        </linearGradient>
        <radialGradient id={`${uid}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--sl-sun)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--sl-sun)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-40" y="-20" width="560" height="340" fill={`url(#${uid}-sky)`} />
      <circle cx="350" cy="96" r="78" fill={`url(#${uid}-sun)`} />
      {/* Cordillera lejana */}
      <path
        d="M-40 170 L20 142 L58 152 L104 124 L150 146 L196 132 L232 144 L262 128 L380 140 L420 122 L470 140 L520 132 L520 300 L-40 300 Z"
        fill="var(--sl-far)"
      />
      {/* Volcán con cumbre nevada */}
      <path d="M196 168 C238 132 268 90 290 74 C298 69 304 69 312 74 C336 92 370 132 418 168 Z" fill="var(--sl-volcano)" />
      <path
        d="M273 88 C280 80 286 75 290 74 C298 69 304 69 312 74 C318 79 324 85 330 92 C322 90 318 96 312 92 C306 98 300 92 294 98 C288 92 282 96 273 88 Z"
        fill="var(--sl-snow)"
      />
    </svg>
  );
}

function Mist({ uid }: { uid: string }) {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`${uid}-mist`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--sl-mist)" stopOpacity="0.75" />
          <stop offset="1" stopColor="var(--sl-mist)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="150" rx="150" ry="16" fill={`url(#${uid}-mist)`} />
      <ellipse cx="380" cy="160" rx="170" ry="14" fill={`url(#${uid}-mist)`} />
    </svg>
  );
}

function LandscapeMid() {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
      <path d="M-40 182 C40 160 110 168 170 178 C240 190 300 164 380 170 C430 174 480 168 520 176 L520 300 L-40 300 Z" fill="var(--sl-mid)" />
      {/* Lago */}
      <path d="M-40 204 C80 198 200 200 300 199 C380 198 460 201 520 203 L520 224 L-40 224 Z" fill="var(--sl-lake)" />
      <g className="sivu-loader__shimmer" stroke="var(--sl-lake-shine)" strokeWidth="1.2" strokeLinecap="round">
        <line x1="120" y1="209" x2="168" y2="209" />
        <line x1="300" y1="213" x2="336" y2="213" />
        <line x1="210" y1="217" x2="232" y2="217" />
      </g>
    </svg>
  );
}

/** Bosque de coníferas en la ribera: siluetas pequeñas, nunca protagonistas. */
const CONIFERS: Array<[number, number, number]> = [
  [22, 222, 1], [36, 218, 1.25], [50, 224, 0.9], [64, 220, 1.1], [78, 226, 0.8],
  [356, 224, 0.85], [372, 219, 1.15], [388, 222, 1], [404, 216, 1.3], [420, 222, 0.95], [436, 218, 1.1], [452, 224, 0.85],
];

function LandscapeNear() {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
      <g fill="var(--sl-forest)">
        {CONIFERS.map(([x, y, s]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y - 26 * s} L${x + 7 * s} ${y - 8 * s} L${x + 4 * s} ${y - 8 * s} L${x + 9 * s} ${y + 2} L${x - 9 * s} ${y + 2} L${x - 4 * s} ${y - 8 * s} L${x - 7 * s} ${y - 8 * s} Z`}
          />
        ))}
      </g>
      <path d="M-40 232 C40 216 120 220 200 232 C270 242 340 222 420 220 C460 219 490 224 520 228 L520 300 L-40 300 Z" fill="var(--sl-near)" />
      <path d="M-40 262 C60 246 160 250 250 258 C330 265 420 248 520 252 L520 300 L-40 300 Z" fill="var(--sl-ground)" />
      {/* Sendero de tierra */}
      <path d="M232 300 C246 284 268 272 300 262 C312 259 322 258 330 258 C316 264 296 276 284 300 Z" fill="var(--sl-earth)" />
    </svg>
  );
}

type Blade = [x: number, h: number, lean: number];

const GRASS_A: Blade[] = [
  [8, 22, -4], [18, 30, 3], [30, 18, 5], [44, 26, -2], [120, 16, 4], [136, 22, -3],
  [392, 20, 3], [410, 28, -4], [424, 18, 2], [452, 30, 4], [468, 20, -3],
];
const GRASS_B: Blade[] = [
  [12, 16, 6], [26, 24, -5], [38, 14, 3], [128, 12, -4], [178, 14, 3],
  [400, 14, -2], [418, 22, 5], [440, 16, -4], [460, 24, 2],
];

function Grass({ blades }: { blades: Blade[] }) {
  return (
    <svg viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="var(--sl-grass)" strokeWidth="1.6" strokeLinecap="round">
        {blades.map(([x, h, lean]) => (
          <path key={`${x}-${h}`} d={`M${x} 300 Q${x + lean * 0.3} ${300 - h * 0.6} ${x + lean} ${300 - h}`} />
        ))}
      </g>
    </svg>
  );
}

/** Rama que entra desde la esquina: de ella se desprende la hoja. */
function Twig() {
  return (
    <svg className="sivu-loader__layer" viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
      <path d="M-20 22 C14 30 44 40 82 60" fill="none" stroke="var(--sl-twig)" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 34 C36 26 40 22 46 18" fill="none" stroke="var(--sl-twig)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M46 18 C54 10 66 10 70 8 C66 16 58 22 46 18 Z" fill="var(--sl-twig-leaf)" />
      <path d="M18 30 C14 40 16 52 12 60 C24 52 26 40 18 30 Z" fill="var(--sl-twig-leaf)" />
    </svg>
  );
}

/** Hoja protagonista. El pecíolo (arriba, al centro) es el punto de giro. */
function Leaf({ uid }: { uid: string }) {
  return (
    <svg className="sivu-loader__leaf" viewBox="0 0 40 90">
      <defs>
        <linearGradient id={`${uid}-leaf`} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="var(--sl-leaf-light)" />
          <stop offset="0.5" stopColor="var(--sl-leaf-mid)" />
          <stop offset="1" stopColor="var(--sl-leaf-dark)" />
        </linearGradient>
      </defs>
      <path d="M20 0 L20 11" stroke="var(--sl-leaf-dark)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 10 C35 24 37 54 21 87 C5 56 4 24 20 10 Z" fill={`url(#${uid}-leaf)`} />
      <g fill="none" stroke="var(--sl-leaf-vein)" strokeLinecap="round">
        <path d="M20 12 Q22 48 21 84" strokeWidth="1.1" />
        <path d="M20.6 26 Q26 26 30 22 M20.2 26 Q14 26 10 22 M21 38 Q27 38 32 33 M20.6 38 Q14 38 8.5 33 M21.4 50 Q27 51 31.5 46 M21 50 Q15 51 9.5 46 M21.4 62 Q26 63 29 59 M21 62 Q16 63 12.5 59" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
