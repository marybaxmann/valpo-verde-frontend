import { useEffect, useRef, useState } from "react";
import type { FichaPublica } from "../../types/fichaPublica";
import { Icon } from "../Icons";
import { SivuLogo } from "../SivuLogo";
import hoja from "../../assets/loader/hoja.webp";
import hojaChicaA from "../../assets/loader/hoja-chica-a.webp";
import hojaChicaB from "../../assets/loader/hoja-chica-b.webp";
import { ReporteCiudadano } from "./ReporteCiudadano";
import { SeguimientoReporte } from "./SeguimientoReporte";
import { fotoDeEspecie } from "./fotosEspecie";
import { contenidoDeEspecie, estacionActual, type Estacion, type FichaEspecie, type IconoAporte } from "./contenidoEspecie";

/**
 * Valpo Verde Conecta: la ficha de un árbol para quien escanea su placa QR
 * (CC-062, PR-022). Diseño V5 aprobado por la responsable (2026-11-14): lo
 * principal se entiende de un vistazo —foto, nombre, una curiosidad y dos
 * beneficios— y lo demás vive en un solo desplegable, «Conoce más sobre mí»,
 * en mini tarjetas (reconocimiento con foto, quién soy, historia, mi año y
 * cuidados). Al final, «Reportar un problema», que llega al municipio como
 * incidencia de la comunidad (módulo Incidencias).
 *
 * Reglas que sigue:
 * - Nunca riesgo, evaluaciones, coordenadas ni datos administrativos.
 * - La foto principal es la referencial de la especie, rotulada como tal,
 *   hasta que exista la foto propia del ejemplar (P2c y P6).
 * - Sin texto de la especie, la ficha queda en su forma mínima: no se
 *   inventa contenido.
 */

const AHORA = estacionActual();

const ESTACIONES: { id: Estacion; etiqueta: string; d: string; color: string }[] = [
  { id: "prim", etiqueta: "Primavera", d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12", color: "#4f8a3a" },
  { id: "ver", etiqueta: "Verano", d: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4", color: "#b07a10" },
  { id: "oto", etiqueta: "Otoño", d: "M12 22v-6 M12 16 8 12l1-3-3-1 2-3 2 1 2-4 2 4 2-1 2 3-3 1 1 3Z", color: "#b5541e" },
  { id: "inv", etiqueta: "Invierno", d: "M12 2v20 M4.9 6l14.2 12 M19.1 6 4.9 18 M9 3l3 3 3-3 M9 21l3-3 3 3", color: "#5a7590" },
];

/** Trazos de los íconos propios de la ficha (mismo estilo de línea que Icons.tsx). */
const TRAZO: Record<IconoAporte | "globo" | "libro" | "corazon" | "pina" | "reloj" | "chispa" | "lupa", string> = {
  sombra: "M12 22v-6 M8 16h8 M7 16a5 5 0 0 1-.6-9.9A6 6 0 0 1 17.6 6.1 5 5 0 0 1 17 16",
  frescor: "M12 2v20 M4.9 6l14.2 12 M19.1 6 4.9 18 M9 3l3 3 3-3 M9 21l3-3 3 3",
  pajaro: "M16 7h.01 M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.3-2.3L2 20 M20 7l2 .5-2 .5 M10 18v3 M14 17.8V21",
  abeja: "M12 20a4 6 0 1 0 0-12 4 6 0 0 0 0 12Z M8.4 12h7.2 M8.4 15.5h7.2 M10 8.5C8.5 5 4 5 4 7.5S7.5 10 10 9 M14 8.5C15.5 5 20 5 20 7.5S16.5 10 14 9",
  flor: "M12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z M12 8a3 3 0 1 1 3-3 3 3 0 1 1 1 5.6 3 3 0 1 1-3 4.4M12 8a3 3 0 1 0-3-3 3 3 0 1 0-1 5.6 3 3 0 1 0 3 4.4 M12 15v7",
  siempreverde: "M12 2l5 7h-3l4 6h-3l3 5H6l3-5H6l4-6H7Z M12 20v2",
  hito: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z m4.2-14.2-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1Z",
  generaciones: "M5 22h14 M5 2h14 M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22 M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2",
  globo: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M2 12h20 M12 2a15 15 0 0 1 0 20 M12 2a15 15 0 0 0 0 20",
  libro: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z",
  corazon: "M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z",
  pina: "M12 2c3 2 5 5 5 9s-2 8-5 11c-3-3-5-7-5-11s2-7 5-9Z M8 8h8 M7.5 12h9 M8.5 16h7",
  reloj: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2",
  chispa: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z M19 16v4 M17 18h4",
  lupa: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-3.5-3.5",
};

/** Foto abierta en el visor a pantalla completa. */
interface FotoVisor {
  src: string;
  alt: string;
  pie: string;
}

function Trazo({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** «Av. Pedro Montt, sector Plaza Victoria; árbol en…» → lo anterior al primer «;». */
function ubicacionBreve(texto: string | null): string | null {
  if (!texto) return null;
  return texto.split(";")[0].trim() || null;
}

export function ExperienciaArbol({
  ficha,
  qrToken,
  vistaPrevia = false,
}: {
  ficha: FichaPublica;
  /** Identifica el árbol en el reporte; en la vista previa no se envía nada. */
  qrToken: string | null;
  vistaPrevia?: boolean;
}) {
  const [reportando, setReportando] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [visor, setVisor] = useState<FotoVisor | null>(null);
  const txt = contenidoDeEspecie(ficha.especie_cientifica);
  // Sin especie identificada (p. ej. «Sin identificar» en el inventario) no se usa ese rótulo como nombre.
  const sinEspecie = !txt && !ficha.especie_cientifica;
  const nombre = sinEspecie ? "Árbol de Valparaíso" : (txt?.nombreComun ?? ficha.nombre_comun ?? ficha.especie_cientifica ?? "Árbol de Valparaíso");
  const saludo = txt ? `${txt.articulo} ${nombre}` : sinEspecie ? "un árbol de Valparaíso" : nombre;
  const foto = fotoDeEspecie(ficha.especie_cientifica);
  const lugar = ubicacionBreve(ficha.ubicacion_descriptiva);

  return (
    <div className="vvc">
      <header className="vvc-top">
        <SivuLogo height={22} />
        <span className="vvc-top__brand">Valpo Verde Conecta</span>
      </header>

      <main className="vvc-home">
        {foto ? (
          <figure className="vvc-photo-hero vvc-photo-hero--foto">
            <button
              type="button"
              className="vvc-foto-btn"
              aria-label={`Ver en grande la foto referencial de ${nombre}`}
              onClick={() => setVisor({ src: foto, alt: `Foto referencial de ${nombre}`, pie: `${nombre} · Foto referencial de la especie` })}
            >
              <img className="vvc-photo-hero__img" src={foto} alt={`Foto referencial de ${nombre}`} />
              <span className="vvc-foto-btn__ampliar" aria-hidden="true">
                <Icon name="expand" size={15} />
              </span>
            </button>
            <figcaption className="vvc-photo-hero__chip">
              <Icon name="camera" size={13} /> Foto referencial de la especie
            </figcaption>
          </figure>
        ) : (
          <div className="vvc-photo-hero" aria-hidden="true">
            <img className="vvc-hero__leaf" src={hoja} alt="" />
            <img className="vvc-hero__mini vvc-hero__mini--a" src={hojaChicaA} alt="" />
            <img className="vvc-hero__mini vvc-hero__mini--b" src={hojaChicaB} alt="" />
            <span className="vvc-photo-hero__chip">
              <Icon name="camera" size={13} /> Mi foto, próximamente
            </span>
          </div>
        )}

        <h1 className="vvc-hero__name">¡Hola, soy {saludo}!</h1>
        {(ficha.especie_cientifica || lugar) && (
          <p className="vvc-hero__meta">
            {ficha.especie_cientifica && txt && <i>{ficha.especie_cientifica}</i>}
            {lugar && (
              <span>
                <Icon name="pin" size={14} /> {lugar}
              </span>
            )}
          </p>
        )}

        {txt ? (
          <>
            <section className="vvc-curio" aria-label="¿Sabías que?">
              <span className="vvc-curio__ic">
                <Trazo d={TRAZO.chispa} size={17} />
              </span>
              <span className="vvc-curio__k">¿Sabías que…?</span>
              <p>{txt.curiosidad}</p>
            </section>

            <div className="vvc-aportes" aria-label="Mis aportes a Valparaíso">
              {txt.aportes.map(([icono, titulo]) => (
                <div key={titulo} className="vvc-aporte">
                  <span>
                    <Trazo d={TRAZO[icono]} size={19} />
                  </span>
                  <strong>{titulo}</strong>
                </div>
              ))}
            </div>

            <ConoceMas txt={txt} onVer={setVisor} />
          </>
        ) : (
          <p className="vvc-intro">Soy parte del arbolado urbano de Valparaíso. Si ves algo raro en mí, avísale al municipio.</p>
        )}

        <div className="vvc-report vvc-report--compacto">
          <span className="vvc-report__icon">
            <Icon name="alert" size={19} />
          </span>
          <h3>¿Viste un problema con este árbol?</h3>
          <button type="button" className="vvc-btn" onClick={() => setReportando(true)}>
            Reportar un problema
          </button>
        </div>

        <button type="button" className="vvc-link vvc-link--center" onClick={() => setConsultando(true)}>
          ¿Ya enviaste un reporte? Consulta su estado
        </button>

        <footer className="vvc-foot">
          <p>Información del inventario de arbolado urbano de Valparaíso · SIVU</p>
        </footer>
      </main>

      {reportando && (
        <ReporteCiudadano nombreArbol={nombre} qrToken={qrToken} vistaPrevia={vistaPrevia} onCerrar={() => setReportando(false)} />
      )}

      {consultando && <SeguimientoReporte vistaPrevia={vistaPrevia} onCerrar={() => setConsultando(false)} />}

      {visor && <VisorFoto foto={visor} onCerrar={() => setVisor(null)} />}
    </div>
  );
}

/** «Conoce más sobre mí»: un solo desplegable con mini tarjetas. */
function ConoceMas({ txt, onVer }: { txt: FichaEspecie; onVer: (f: FotoVisor) => void }) {
  const [rasgo, setRasgo] = useState(0);
  const [estacion, setEstacion] = useState<Estacion>(AHORA);
  const [paso, setPaso] = useState(0);
  const r = txt.rasgos[rasgo] ?? txt.rasgos[0];

  return (
    <details className="vvc-mas">
      <summary>
        Conoce más sobre mí <Icon name="chevron-down" size={18} />
      </summary>
      <div className="vvc-bento">
        <section className="vvc-mini vvc-mini--ancha vvc-reco" aria-label="Reconóceme">
          <div className="vvc-reco__img">
            <span className="vvc-reco__k">
              <Trazo d={TRAZO.lupa} size={12} /> Reconóceme
            </span>
            {r.foto ? (
              <button
                type="button"
                className="vvc-foto-btn"
                aria-label={`Ver en grande: ${r.etiqueta}`}
                onClick={() => onVer({ src: r.foto as string, alt: r.etiqueta, pie: `${txt.nombreComun} · ${r.etiqueta}` })}
              >
                <img src={r.foto} alt={r.etiqueta} />
                <span className="vvc-foto-btn__ampliar" aria-hidden="true">
                  <Icon name="expand" size={14} />
                </span>
              </button>
            ) : (
              <span className="vvc-reco__vacio">
                <Icon name="camera" size={22} /> Foto próximamente
              </span>
            )}
          </div>
          <div className="vvc-reco__pie">
            <p>{r.texto}</p>
            {txt.rasgos.length > 1 && (
              <div className="vvc-chips" role="group" aria-label="Rasgos">
                {txt.rasgos.map((x, i) => (
                  <button key={x.etiqueta} type="button" className="vvc-chip" aria-pressed={i === rasgo} onClick={() => setRasgo(i)}>
                    {x.etiqueta}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="vvc-mini" aria-label="Quién soy">
          <span className="vvc-mini__k">
            <Trazo d={TRAZO.globo} size={14} /> Quién soy
          </span>
          <p>{txt.quienSoy}</p>
        </section>

        <section className="vvc-mini vvc-mini--dato" aria-label="Mi historia">
          <span className="vvc-mini__k">
            <Trazo d={TRAZO.libro} size={14} /> Mi historia
          </span>
          <p>{txt.historia}</p>
        </section>

        {txt.ciclo ? (
          <section className="vvc-mini vvc-mini--ancha" aria-label={txt.ciclo.titulo}>
            <span className="vvc-mini__k">
              <Icon name="calendar" size={14} /> {txt.ciclo.titulo}
            </span>
            <div className="vvc-anio vvc-anio--3">
              {txt.ciclo.pasos.map((p, i) => (
                <button key={p.etiqueta} type="button" className="vvc-est" aria-pressed={i === paso} onClick={() => setPaso(i)}>
                  <span className="vvc-est__ic" style={{ color: "#4f8a3a" }}>
                    <Trazo d={[TRAZO.pina, TRAZO.reloj, ESTACIONES[0].d][i] ?? TRAZO.pina} size={17} />
                  </span>
                  {p.etiqueta}
                </button>
              ))}
            </div>
            <p className="vvc-anio__tx">{txt.ciclo.pasos[paso].texto}</p>
          </section>
        ) : (
          txt.anio && (
            <section className="vvc-mini vvc-mini--ancha" aria-label="Mi año">
              <span className="vvc-mini__k">
                <Icon name="calendar" size={14} /> Mi año
              </span>
              <div className="vvc-anio">
                {ESTACIONES.map((e) => (
                  <button key={e.id} type="button" className="vvc-est" aria-pressed={e.id === estacion} onClick={() => setEstacion(e.id)}>
                    {e.id === AHORA && <span className="vvc-est__ahora">Ahora</span>}
                    <span className="vvc-est__ic" style={{ color: e.color }}>
                      <Trazo d={e.d} size={17} />
                    </span>
                    {e.etiqueta}
                  </button>
                ))}
              </div>
              <p className="vvc-anio__tx">{txt.anio[estacion]}</p>
            </section>
          )
        )}

        <section className="vvc-mini vvc-mini--consejo vvc-mini--ancha" aria-label="Cuídame">
          <span className="vvc-mini__k">
            <Trazo d={TRAZO.corazon} size={14} /> Cuídame
          </span>
          <p>{txt.consejo}</p>
        </section>
      </div>
    </details>
  );
}

/**
 * Visor a pantalla completa: la foto se ve entera (sin recorte) sobre fondo
 * oscuro. Se cierra con el botón, tocando fuera de la foto o con Escape; el
 * gesto de pellizcar del teléfono sigue funcionando para acercar.
 */
function VisorFoto({ foto, onCerrar }: { foto: FotoVisor; onCerrar: () => void }) {
  const cerrar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    cerrar.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
      previo?.focus();
    };
  }, [onCerrar]);

  return (
    <div className="vvc-visor" role="dialog" aria-modal="true" aria-label={foto.alt} onClick={onCerrar}>
      <button ref={cerrar} type="button" className="vvc-visor__cerrar" onClick={onCerrar} aria-label="Cerrar foto">
        <Icon name="close" size={20} />
      </button>
      <img className="vvc-visor__img" src={foto.src} alt={foto.alt} onClick={(e) => e.stopPropagation()} />
      <p className="vvc-visor__pie">{foto.pie}</p>
    </div>
  );
}
