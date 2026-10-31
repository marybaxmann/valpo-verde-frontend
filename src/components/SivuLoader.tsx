import { useId, type CSSProperties } from "react";
import "../styles/sivu-loader.css";

/**
 * Indicador de carga de SIVU: escena botánica de hojas llevadas por una
 * brisa suave. Una hoja grande flota en diagonal entre dos estelas de
 * viento (pinceladas salvia que se afinan y desvanecen), con dos hojas
 * pequeñas alrededor, sombra difusa, el texto de carga y tres puntos.
 *
 * Toda la geometría se dibuja en las coordenadas de la ilustración de
 * referencia (escena de 1267×783): cada pieza es un SVG cuyo viewBox es
 * su propio recuadro dentro de la escena, y se ubica en % de ella. Así la
 * composición escala sin deformarse y cada pieza se anima por separado.
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

const SCENE_W = 1267;
const SCENE_H = 783;
const SCENE_VIEWBOX = `0 0 ${SCENE_W} ${SCENE_H}`;

type Box = { x: number; y: number; w: number; h: number };

/** Recuadro de la escena → posición en % y viewBox de la pieza. */
function place({ x, y, w }: Box): CSSProperties {
  return {
    left: `${(x / SCENE_W) * 100}%`,
    top: `${(y / SCENE_H) * 100}%`,
    width: `${(w / SCENE_W) * 100}%`,
  };
}
const viewBox = ({ x, y, w, h }: Box) => `${x} ${y} ${w} ${h}`;

const LEAF_BOX: Box = { x: 404, y: 200, w: 540, h: 376 };
const MINI_A_BOX: Box = { x: 284, y: 204, w: 118, h: 70 };
const MINI_B_BOX: Box = { x: 838, y: 564, w: 132, h: 102 };
const SHADOW_BOX: Box = { x: 370, y: 722, w: 510, h: 46 };

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
        <div className="sivu-loader__breeze sivu-loader__breeze--left">
          <BreezeLeft uid={uid} />
        </div>
        <div className="sivu-loader__breeze sivu-loader__breeze--right">
          <BreezeRight uid={uid} />
        </div>
        <span className="sivu-loader__shadow" style={{ ...place(SHADOW_BOX), height: `${(SHADOW_BOX.h / SCENE_H) * 100}%` }} />
        <div className="sivu-loader__piece sivu-loader__leaf-x" style={place(LEAF_BOX)}>
          <div className="sivu-loader__leaf-y">
            <div className="sivu-loader__leaf-sway">
              <MainLeaf uid={uid} />
            </div>
          </div>
        </div>
        <div className="sivu-loader__piece sivu-loader__mini sivu-loader__mini--a" style={place(MINI_A_BOX)}>
          <div className="sivu-loader__mini-sway">
            <MiniLeafA uid={uid} />
          </div>
        </div>
        <div className="sivu-loader__piece sivu-loader__mini sivu-loader__mini--b" style={place(MINI_B_BOX)}>
          <div className="sivu-loader__mini-sway">
            <MiniLeafB uid={uid} />
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
   Medialunas rellenas (gruesas al centro, afinadas en las puntas) con un
   degradado que las desvanece hacia los extremos y un desenfoque leve
   que las vuelve pincelada. */

function BreezeLeft({ uid }: { uid: string }) {
  const g = `${uid}-bl`;
  return (
    <svg viewBox={SCENE_VIEWBOX} fill="none">
      <defs>
        <linearGradient id={`${g}-wide`} x1="560" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-breeze)" stopOpacity="0" />
          <stop offset="0.22" stopColor="var(--sl-breeze)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--sl-breeze)" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${g}-thin`} x1="510" y1="310" x2="238" y2="534" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-breeze-line)" stopOpacity="0" />
          <stop offset="0.55" stopColor="var(--sl-breeze-line)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--sl-breeze-line)" stopOpacity="0" />
        </linearGradient>
        <filter id={`${g}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>
      <path
        filter={`url(#${g}-soft)`}
        fill={`url(#${g}-wide)`}
        d="M532 302 C362 330 176 420 160 502 C146 584 330 654 572 668 C340 656 192 590 192 506 C192 432 368 338 532 302 Z"
      />
      <path
        fill={`url(#${g}-thin)`}
        d="M512 310 C384 336 252 398 236 458 C228 492 230 514 240 534 C238 512 238 494 244 466 C262 406 386 344 512 310 Z"
      />
    </svg>
  );
}

function BreezeRight({ uid }: { uid: string }) {
  const g = `${uid}-br`;
  return (
    <svg viewBox={SCENE_VIEWBOX} fill="none">
      <defs>
        <linearGradient id={g} x1="866" y1="84" x2="1010" y2="372" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-breeze-line)" stopOpacity="0" />
          <stop offset="0.45" stopColor="var(--sl-breeze-line)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--sl-breeze-line)" stopOpacity="0" />
        </linearGradient>
        <filter id={`${g}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>
      <path
        filter={`url(#${g}-soft)`}
        fill={`url(#${g})`}
        d="M866 84 C992 96 1096 156 1099 230 C1102 294 1054 342 1010 372 C1044 334 1084 288 1082 232 C1078 170 984 108 866 84 Z"
      />
      {/* Continuación casi imperceptible hacia la hoja. */}
      <path d="M1010 372 C984 398 956 420 928 436" stroke="var(--sl-breeze-line)" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Hoja principal ----------
   Ovado-lanceolada con punta alargada que se curva hacia arriba.
   Mitad superior (hacia arriba a la izquierda) más oscura, mitad inferior
   verde amarillento; nervadura central clara y nervaduras secundarias
   paralelas que se curvan hacia la punta. */

const LEAF_BLADE =
  "M486 524 C530 470 590 388 680 336 C750 298 830 290 878 270 C896 258 912 236 925 212 " +
  "C929 208 933 211 931 217 C918 240 904 258 891 280 C880 342 868 420 820 476 " +
  "C770 532 692 566 622 563 C572 560 522 542 486 524 Z";
const LEAF_LOWER =
  "M486 524 C600 482 760 390 890 276 C880 342 868 420 820 476 C770 532 692 566 622 563 C572 560 522 542 486 524 Z";
const LEAF_MIDRIB = "M486 524 C600 482 760 390 890 276 C904 262 916 240 928 214";

/** Nervaduras secundarias, calculadas sobre la curva de la nervadura central. */
function leafVeins(side: "upper" | "lower") {
  const p0 = [486, 524], p1 = [600, 482], p2 = [760, 390], p3 = [890, 276];
  const at = (t: number) => {
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
  };
  const tangent = (t: number) => {
    const u = 1 - t;
    const d = [0, 1].map(
      (i) => 3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i]),
    );
    const len = Math.hypot(d[0], d[1]);
    return [d[0] / len, d[1] / len];
  };
  const count = 11;
  const maxHalf = side === "upper" ? 118 : 104;
  const sign = side === "upper" ? 1 : -1;
  const parts: string[] = [];
  for (let k = 0; k < count; k++) {
    const t = 0.07 + (k / (count - 1)) * 0.86;
    const [px, py] = at(t);
    const [tx, ty] = tangent(t);
    // Normal hacia el borde: arriba-izquierda para la mitad superior.
    const nx = ty * sign, ny = -tx * sign;
    const half = maxHalf * Math.pow(Math.sin(Math.PI * Math.min(0.98, t * 0.92 + 0.08)), 0.75);
    const ex = px + nx * half * 0.92 + tx * half * 0.95;
    const ey = py + ny * half * 0.92 + ty * half * 0.95;
    const cx = px + nx * half * 0.55 + tx * half * 0.12;
    const cy = py + ny * half * 0.55 + ty * half * 0.12;
    parts.push(`M${px.toFixed(1)} ${py.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
  }
  return parts.join(" ");
}

const VEINS_UPPER = leafVeins("upper");
const VEINS_LOWER = leafVeins("lower");

function MainLeaf({ uid }: { uid: string }) {
  const id = (name: string) => `${uid}-leaf-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  return (
    <svg className="sivu-loader__art" viewBox={viewBox(LEAF_BOX)}>
      <defs>
        {/* Luz de abajo a la derecha, sombra arriba a la izquierda. */}
        <linearGradient id={id("blade")} x1="610" y1="330" x2="770" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-leaf-4)" />
          <stop offset="0.45" stopColor="var(--sl-leaf-3)" />
          <stop offset="1" stopColor="var(--sl-leaf-2)" />
        </linearGradient>
        <linearGradient id={id("lower")} x1="700" y1="420" x2="800" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-leaf-2)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--sl-leaf-1)" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={id("glow")} cx="720" cy="470" r="170" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e8f5c8" stopOpacity="0.18" />
          <stop offset="1" stopColor="#e8f5c8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("rib")} x1="486" y1="524" x2="928" y2="214" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-vein)" />
          <stop offset="1" stopColor="var(--sl-vein)" stopOpacity="0.55" />
        </linearGradient>
        <clipPath id={id("clip")}>
          <path d={LEAF_BLADE} />
        </clipPath>
      </defs>

      {/* Pecíolo */}
      <path d="M418 521 C442 528 466 528 490 524" stroke="var(--sl-leaf-3)" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M420 519 C444 525 466 525 488 522" stroke="var(--sl-vein)" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" fill="none" />

      <g clipPath={url("clip")}>
        <path d={LEAF_BLADE} fill={url("blade")} />
        <path d={LEAF_LOWER} fill={url("lower")} />
        <path d={LEAF_BLADE} fill={url("glow")} />
        <path d={VEINS_UPPER} stroke="var(--sl-vein)" strokeOpacity="0.42" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d={VEINS_LOWER} stroke="var(--sl-leaf-4)" strokeOpacity="0.28" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Sombra fina junto a la nervadura central: el limbo se pliega. */}
        <path d={LEAF_MIDRIB} transform="translate(-1.5 -2)" stroke="var(--sl-leaf-4)" strokeOpacity="0.45" strokeWidth="3" fill="none" />
      </g>
      <path d={LEAF_MIDRIB} stroke={url("rib")} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Canto: algo más oscuro arriba, luz en el borde inferior. */}
      <path d="M486 524 C530 470 590 388 680 336 C750 298 830 290 878 270" stroke="var(--sl-leaf-4)" strokeOpacity="0.55" strokeWidth="1.4" fill="none" />
      <path d="M891 280 C880 342 868 420 820 476 C770 532 692 566 622 563" stroke="#eef8d2" strokeOpacity="0.45" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

/* ---------- Hojas pequeñas ---------- */

function MiniLeafA({ uid }: { uid: string }) {
  const g = `${uid}-mini-a`;
  return (
    <svg className="sivu-loader__art" viewBox={viewBox(MINI_A_BOX)}>
      <defs>
        <linearGradient id={g} x1="300" y1="212" x2="370" y2="262" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-leaf-2)" />
          <stop offset="1" stopColor="var(--sl-leaf-3)" />
        </linearGradient>
      </defs>
      <path d="M383 260 L396 268" stroke="var(--sl-leaf-3)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M385 262 C364 270 328 264 308 248 C298 238 293 224 291 212 C306 211 338 216 358 228 C375 238 384 250 385 262 Z" fill={`url(#${g})`} />
      <path d="M385 262 C360 246 322 226 293 213" stroke="var(--sl-vein)" strokeOpacity="0.6" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

function MiniLeafB({ uid }: { uid: string }) {
  const g = `${uid}-mini-b`;
  return (
    <svg className="sivu-loader__art" viewBox={viewBox(MINI_B_BOX)}>
      <defs>
        <linearGradient id={g} x1="880" y1="600" x2="930" y2="650" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--sl-leaf-3)" />
          <stop offset="1" stopColor="var(--sl-leaf-2)" />
        </linearGradient>
      </defs>
      <path d="M853 650 L845 660" stroke="var(--sl-leaf-3)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M852 650 C864 616 896 592 932 584 C946 580 956 575 963 571 C960 594 946 622 920 640 C898 656 870 660 852 650 Z" fill={`url(#${g})`} />
      <path d="M852 650 C888 628 928 602 962 573" stroke="var(--sl-vein)" strokeOpacity="0.6" strokeWidth="1.3" fill="none" />
    </svg>
  );
}
