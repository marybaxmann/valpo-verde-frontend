import { useId } from "react";
import "../styles/sivu-loader.css";

/**
 * Indicador de carga de SIVU: una hoja que flota llevada por el viento,
 * sobre fondo limpio, con el texto de carga y una barra discreta.
 *
 * Solo SVG + CSS, sin dependencias. El movimiento se reparte en
 * contenedores anidados, cada uno con un solo eje y un período distinto;
 * todos oscilan de ida y vuelta, así que el loop nunca se reinicia de
 * golpe y la combinación no se ve repetitiva. Solo se animan `transform`
 * y `opacity` (hilo del compositor).
 *
 * - `fullscreen`: pantalla completa (sesión, perfil, cambio de pantalla).
 * - `inline`: espacios pequeños dentro de módulos, tarjetas y paneles.
 *
 * Con `prefers-reduced-motion` la hoja queda quieta y solo la barra
 * cambia de opacidad; el texto sigue informando el estado.
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
      <div className="sivu-loader__stage" aria-hidden="true">
        <WindCurves />
        <span className="sivu-loader__shadow" />
        <div className="sivu-loader__drift-x">
          <div className="sivu-loader__drift-y">
            <div className="sivu-loader__sway">
              <div className="sivu-loader__turn">
                <Leaf uid={uid} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="sivu-loader__message">{message}</p>
      <span className="sivu-loader__bar" aria-hidden="true" />
    </div>
  );
}

/** Dos trazos finos de viento que se dibujan y se desvanecen. */
function WindCurves() {
  return (
    <svg className="sivu-loader__wind" viewBox="0 0 120 150" fill="none">
      <path className="sivu-loader__gust sivu-loader__gust--a" pathLength={100} d="M4 52 C26 44 44 58 66 50 C78 46 86 40 92 42" />
      <path className="sivu-loader__gust sivu-loader__gust--b" pathLength={100} d="M22 104 C40 98 54 110 74 104 C88 100 98 94 112 98" />
    </svg>
  );
}

/** Hoja: lámina levemente asimétrica, punta curvada, nervadura. */
function Leaf({ uid }: { uid: string }) {
  return (
    <svg className="sivu-loader__leaf" viewBox="0 0 64 96">
      <defs>
        <linearGradient id={`${uid}-leaf`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="var(--sl-leaf-light)" />
          <stop offset="0.55" stopColor="var(--sl-leaf-mid)" />
          <stop offset="1" stopColor="var(--sl-leaf-dark)" />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Pecíolo */}
      <path d="M32 94 C31.5 88 31.5 84 32 79" stroke="var(--sl-leaf-dark)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Lámina */}
      <path
        d="M32 80 C14 72 8 54 11 38 C14 22 24 10 37 3 C38 2.6 38.8 3 38.8 4 C47 16 54 30 53 46 C52 63 44 75 32 80 Z"
        fill={`url(#${uid}-leaf)`}
      />
      {/* Brillo en la mitad iluminada */}
      <path d="M32 79 C17 71 11 55 13.5 39 C16 25 25 13 36 6 C30 22 28 46 32 79 Z" fill={`url(#${uid}-sheen)`} />
      {/* Nervadura */}
      <g fill="none" stroke="var(--sl-leaf-vein)" strokeLinecap="round">
        <path d="M32 79 C30.5 60 31.5 34 37.5 6" strokeWidth="1.3" />
        <path
          d="M31.4 66 C26 63 21 60 17.5 55 M31.6 66 C37 62 42 58 45.5 53 M31.2 52 C26 49 21 45 18 40 M31.7 52 C37 48 42 43 46 37 M32 38 C28 35 24.5 31 22 26 M32.6 38 C37 34 41 29 44 23 M34 24 C32 21 30 18 28.5 14 M34.6 24 C37.5 20 40 16 41.5 12"
          strokeWidth="0.75"
        />
      </g>
    </svg>
  );
}
