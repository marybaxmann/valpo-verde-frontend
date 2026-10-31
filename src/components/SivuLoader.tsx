import type { CSSProperties } from "react";
import breezeLeftSrc from "../assets/sivu-loader/breeze-left.webp";
import breezeRightSrc from "../assets/sivu-loader/breeze-right.webp";
import leafMainSrc from "../assets/sivu-loader/leaf-main.webp";
import leafSmallASrc from "../assets/sivu-loader/leaf-small-a.webp";
import leafSmallBSrc from "../assets/sivu-loader/leaf-small-b.webp";
import shadowSrc from "../assets/sivu-loader/shadow.webp";
import "../styles/sivu-loader.css";

/**
 * Indicador de carga de SIVU: la ilustración de referencia (hojas
 * llevadas por una brisa suave), animada.
 *
 * La ilustración no se redibuja: cada elemento es una imagen transparente
 * recortada de la referencia (src/assets/sivu-loader/), con su recuadro en
 * las coordenadas de esa imagen (1267×783). Cada capa se ubica en % de la
 * escena, así la composición escala sin deformarse, y se anima por
 * separado solo con CSS (transform/opacity, hilo del compositor),
 * oscilando de ida y vuelta: el loop es continuo y nunca salta.
 *
 * Para reemplazar el arte basta con nuevas imágenes transparentes del
 * mismo nombre alineadas a la misma escena (o ajustar los recuadros).
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

type Box = { x: number; y: number; w: number; h: number };

/** Parte de la referencia que se muestra (sin los márgenes vacíos). */
const SCENE: Box = { x: 110, y: 50, w: 1040, h: 733 };

/** Recuadro de cada capa en la referencia (px de la imagen original). */
const LAYERS = {
  breezeLeft: { x: 120, y: 270, w: 520, h: 420 },
  breezeRight: { x: 840, y: 60, w: 290, h: 400 },
  shadow: { x: 300, y: 690, w: 680, h: 93 },
  leafMain: { x: 404, y: 196, w: 544, h: 384 },
  leafSmallA: { x: 280, y: 200, w: 124, h: 78 },
  leafSmallB: { x: 834, y: 560, w: 140, h: 110 },
} satisfies Record<string, Box>;

/** Centro de la hoja principal: eje de las corrientes de aire. */
const LEAF_CENTER = { x: 676, y: 388 };

const pct = (v: number) => `${v}%`;

function place(box: Box, rotateAroundLeaf = false): CSSProperties {
  const style: CSSProperties = {
    left: pct(((box.x - SCENE.x) / SCENE.w) * 100),
    top: pct(((box.y - SCENE.y) / SCENE.h) * 100),
    width: pct((box.w / SCENE.w) * 100),
  };
  if (rotateAroundLeaf) {
    style.transformOrigin = `${pct(((LEAF_CENTER.x - box.x) / box.w) * 100)} ${pct(((LEAF_CENTER.y - box.y) / box.h) * 100)}`;
  }
  return style;
}

function Layer({ src, box }: { src: string; box: Box }) {
  return <img className="sivu-loader__img" src={src} width={box.w} height={box.h} alt="" draggable={false} />;
}

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
  const classes = ["sivu-loader", `sivu-loader--${variant}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <div
        className="sivu-loader__stage"
        style={{ aspectRatio: `${SCENE.w} / ${SCENE.h}` }}
        aria-hidden="true"
      >
        <div className="sivu-loader__layer sivu-loader__breeze sivu-loader__breeze--left" style={place(LAYERS.breezeLeft, true)}>
          <Layer src={breezeLeftSrc} box={LAYERS.breezeLeft} />
        </div>
        <div className="sivu-loader__layer sivu-loader__breeze sivu-loader__breeze--right" style={place(LAYERS.breezeRight, true)}>
          <Layer src={breezeRightSrc} box={LAYERS.breezeRight} />
        </div>
        <div className="sivu-loader__layer sivu-loader__shadow" style={place(LAYERS.shadow)}>
          <Layer src={shadowSrc} box={LAYERS.shadow} />
        </div>
        <div className="sivu-loader__layer sivu-loader__leaf-x" style={place(LAYERS.leafMain)}>
          <div className="sivu-loader__leaf-y">
            <div className="sivu-loader__leaf-sway">
              <Layer src={leafMainSrc} box={LAYERS.leafMain} />
            </div>
          </div>
        </div>
        <div className="sivu-loader__layer sivu-loader__mini sivu-loader__mini--a" style={place(LAYERS.leafSmallA)}>
          <div className="sivu-loader__mini-sway">
            <Layer src={leafSmallASrc} box={LAYERS.leafSmallA} />
          </div>
        </div>
        <div className="sivu-loader__layer sivu-loader__mini sivu-loader__mini--b" style={place(LAYERS.leafSmallB)}>
          <div className="sivu-loader__mini-sway">
            <Layer src={leafSmallBSrc} box={LAYERS.leafSmallB} />
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
