import type { CSSProperties } from "react";
import brisaIzquierda from "../assets/loader/brisa-izquierda.webp";
import brisaDerecha from "../assets/loader/brisa-derecha.webp";
import sombra from "../assets/loader/sombra.webp";
import hoja from "../assets/loader/hoja.webp";
import hojaChicaA from "../assets/loader/hoja-chica-a.webp";
import hojaChicaB from "../assets/loader/hoja-chica-b.webp";

/**
 * Animación de carga de SIVU (diseño de la responsable, «SivuLoader», 2026-10-31):
 * una hoja que flota con la brisa. `fullscreen` para la sesión y el perfil;
 * `inline` para la carga dentro de un módulo (sin brisas ni hojas chicas).
 * Solo presentación: no sabe qué se está cargando.
 */

const MENSAJE = "Preparando tu entorno verde…";

/** Lienzo de la escena original; las capas se ubican en porcentajes de él. */
const LIENZO = { x: 110, y: 50, w: 1040, h: 733 };
const CAPAS = {
  brisaIzquierda: { x: 120, y: 270, w: 520, h: 420 },
  brisaDerecha: { x: 840, y: 60, w: 290, h: 400 },
  sombra: { x: 300, y: 690, w: 680, h: 93 },
  hoja: { x: 404, y: 196, w: 544, h: 384 },
  hojaChicaA: { x: 280, y: 200, w: 124, h: 78 },
  hojaChicaB: { x: 834, y: 560, w: 140, h: 110 },
};
/** Punto alrededor del cual giran las brisas (el centro de la hoja). */
const PIVOTE = { x: 676, y: 388 };

type Caja = { x: number; y: number; w: number; h: number };
const pct = (n: number) => `${n}%`;

function ubicar(c: Caja, conPivote = false): CSSProperties {
  const estilo: CSSProperties = {
    left: pct(((c.x - LIENZO.x) / LIENZO.w) * 100),
    top: pct(((c.y - LIENZO.y) / LIENZO.h) * 100),
    width: pct((c.w / LIENZO.w) * 100),
  };
  if (conPivote) estilo.transformOrigin = `${pct(((PIVOTE.x - c.x) / c.w) * 100)} ${pct(((PIVOTE.y - c.y) / c.h) * 100)}`;
  return estilo;
}

function Imagen({ src, caja }: { src: string; caja: Caja }) {
  return <img className="sivu-loader__img" src={src} width={caja.w} height={caja.h} alt="" draggable={false} />;
}

export function SivuLoader({
  variant = "inline",
  message = MENSAJE,
}: {
  variant?: "fullscreen" | "inline";
  message?: string;
}) {
  return (
    <div className={`sivu-loader sivu-loader--${variant}`} role="status" aria-live="polite" aria-busy="true">
      <div className="sivu-loader__stage" style={{ aspectRatio: `${LIENZO.w} / ${LIENZO.h}` }} aria-hidden="true">
        <div className="sivu-loader__layer sivu-loader__breeze sivu-loader__breeze--left" style={ubicar(CAPAS.brisaIzquierda, true)}>
          <Imagen src={brisaIzquierda} caja={CAPAS.brisaIzquierda} />
        </div>
        <div className="sivu-loader__layer sivu-loader__breeze sivu-loader__breeze--right" style={ubicar(CAPAS.brisaDerecha, true)}>
          <Imagen src={brisaDerecha} caja={CAPAS.brisaDerecha} />
        </div>
        <div className="sivu-loader__layer sivu-loader__shadow" style={ubicar(CAPAS.sombra)}>
          <Imagen src={sombra} caja={CAPAS.sombra} />
        </div>
        <div className="sivu-loader__layer sivu-loader__leaf-x" style={ubicar(CAPAS.hoja)}>
          <div className="sivu-loader__leaf-y">
            <div className="sivu-loader__leaf-sway">
              <Imagen src={hoja} caja={CAPAS.hoja} />
            </div>
          </div>
        </div>
        <div className="sivu-loader__layer sivu-loader__mini sivu-loader__mini--a" style={ubicar(CAPAS.hojaChicaA)}>
          <div className="sivu-loader__mini-sway">
            <Imagen src={hojaChicaA} caja={CAPAS.hojaChicaA} />
          </div>
        </div>
        <div className="sivu-loader__layer sivu-loader__mini sivu-loader__mini--b" style={ubicar(CAPAS.hojaChicaB)}>
          <div className="sivu-loader__mini-sway">
            <Imagen src={hojaChicaB} caja={CAPAS.hojaChicaB} />
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
