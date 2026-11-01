import { useState, type ReactNode } from "react";
import type { FichaPublica } from "../../types/fichaPublica";
import { Icon, type IconName } from "../Icons";
import { SivuLogo } from "../SivuLogo";
import hoja from "../../assets/loader/hoja.webp";
import hojaChicaA from "../../assets/loader/hoja-chica-a.webp";
import hojaChicaB from "../../assets/loader/hoja-chica-b.webp";
import { ReporteCiudadano } from "./ReporteCiudadano";

/**
 * Valpo Verde Conecta: la identidad digital de un árbol para quien escanea
 * su placa QR (CC-062, PR-022). Cuatro secciones pensadas para el teléfono.
 *
 * Reglas que sigue:
 * - Solo muestra lo que llega en la ficha pública; distingue lo propio del
 *   ejemplar («Este árbol») de lo general de su especie («Su especie»).
 * - Nunca riesgo, evaluaciones, coordenadas ni datos administrativos.
 * - Lo que CC-062 aún no autoriza o no tiene fuente (fotos, altura, edad,
 *   contenido por especie, beneficios, historia) se muestra como
 *   «Próximamente», sin valores: no se inventan datos.
 */

type Seccion = "quien" | "aporto" | "vida" | "cuidarme";

const SECCIONES: { id: Seccion; titulo: string; icono: IconName }[] = [
  { id: "quien", titulo: "¿Quién soy?", icono: "leaf" },
  { id: "aporto", titulo: "¿Qué aporto?", icono: "sparkle" },
  { id: "vida", titulo: "¿Cómo es mi vida?", icono: "calendar" },
  { id: "cuidarme", titulo: "¿Cómo cuidarme?", icono: "user" },
];

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
  const esp = ficha.especie;
  const nombre = ficha.nombre_comun ?? ficha.especie_cientifica ?? "Árbol de Valparaíso";

  const ir = (id: Seccion) => document.getElementById(`vvc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="vvc">
      <header className="vvc-top">
        <SivuLogo height={22} />
        <span className="vvc-top__brand">Valpo Verde Conecta</span>
      </header>

      <section className="vvc-hero" aria-label={nombre}>
        <div className="vvc-hero__art" aria-hidden="true">
          <img className="vvc-hero__leaf" src={hoja} alt="" />
          <img className="vvc-hero__mini vvc-hero__mini--a" src={hojaChicaA} alt="" />
          <img className="vvc-hero__mini vvc-hero__mini--b" src={hojaChicaB} alt="" />
        </div>
        <p className="vvc-hero__hola">Hola, soy</p>
        <h1 className="vvc-hero__name">{nombre}</h1>
        {ficha.especie_cientifica && ficha.nombre_comun && <p className="vvc-hero__sci">{ficha.especie_cientifica}</p>}
        {ficha.ubicacion_descriptiva && (
          <p className="vvc-hero__place">
            <Icon name="pin" size={15} /> {ficha.ubicacion_descriptiva}
          </p>
        )}
      </section>

      <nav className="vvc-nav" aria-label="Secciones">
        {SECCIONES.map((s) => (
          <button key={s.id} type="button" className="vvc-nav__item" onClick={() => ir(s.id)}>
            <Icon name={s.icono} size={16} />
            <span>{s.titulo}</span>
          </button>
        ))}
      </nav>

      <main className="vvc-body">
        <Bloque id="quien" titulo="¿Quién soy?" bajada="Mi nombre, mi familia y de dónde vengo.">
          <div className="vvc-grid">
            <Dato ambito="arbol" etiqueta="Nombre común" valor={ficha.nombre_comun} />
            <Dato ambito="arbol" etiqueta="Nombre científico" valor={ficha.especie_cientifica} cursiva />
            <Dato ambito="especie" etiqueta="Género" valor={esp?.genero ?? null} cursiva />
            <Dato ambito="especie" etiqueta="Familia" valor={esp?.familia ?? null} />
            <Dato ambito="especie" etiqueta="Origen" valor={esp?.origen_biogeografico?.etiqueta ?? null} ancho />
          </div>
          <Proximamente
            icono="camera"
            titulo="Mis fotografías"
            texto="Aquí verás fotos de este árbol. Su publicación aún no está autorizada en la ficha ciudadana."
          />
          <Proximamente icono="ruler" titulo="Mi edad y mi altura" texto="Datos de este árbol que se mostrarán cuando su publicación esté definida." />
          <Proximamente icono="sparkle" titulo="Curiosidades de mi especie" texto="Contenido sobre la especie, preparado y revisado por el equipo de SIVU." />
        </Bloque>

        <Bloque id="aporto" titulo="¿Qué aporto a Valparaíso?" bajada="Lo que hago por la ciudad, explicado en simple.">
          <div className="vvc-benefits">
            <Beneficio icono="sun" titulo="Sombra" texto="La superficie que cubre mi copa y el alivio que da en días de calor." />
            <Beneficio icono="leaf" titulo="Carbono" texto="El carbono que guardo en mi madera y el que capturo cada año." />
            <Beneficio icono="eye" titulo="Aire" texto="Los contaminantes que mis hojas ayudan a retener." />
            <Beneficio icono="layers" titulo="Agua" texto="La lluvia que retengo y que no escurre por la calle." />
          </div>
          <p className="vvc-note">
            <Icon name="clock" size={14} /> Cada cifra aparecerá aquí cuando su método de cálculo esté validado en SIVU. No mostramos estimaciones sin respaldo.
          </p>
        </Bloque>

        <Bloque id="vida" titulo="¿Cómo es mi vida?" bajada="Cómo cambio con las estaciones y lo que he vivido.">
          <div className="vvc-grid">
            <Dato ambito="especie" etiqueta="Mi follaje" valor={esp?.persistencia_follaje?.etiqueta ?? null} />
            <Dato ambito="especie" etiqueta="Mis hojas" valor={esp?.tipo_hoja?.etiqueta ?? null} />
          </div>
          <Proximamente icono="calendar" titulo="Mi año" texto="Cuándo florezco, cuándo cambian mis hojas y qué pasa conmigo en cada estación." />
          <Proximamente icono="clock" titulo="Mi historia" texto="Los cuidados que he recibido y fotos de cómo he cambiado con los años." />
        </Bloque>

        <Bloque id="cuidarme" titulo="¿Cómo puedes cuidarme?" bajada="Pequeños gestos que me ayudan a vivir mejor.">
          <Proximamente icono="leaf" titulo="Consejos de cuidado" texto="Recomendaciones simples para cuidarme en la vereda y en la plaza." />
          <div className="vvc-report">
            <span className="vvc-report__icon">
              <Icon name="alert" size={22} />
            </span>
            <div>
              <h3>¿Me ves en problemas?</h3>
              <p>Si ves una rama rota, raíces levantadas o algo que te preocupe, avísale al municipio. Yo quedo identificado automáticamente.</p>
            </div>
            <button type="button" className="vvc-btn" onClick={() => setReportando(true)}>
              Reportar un problema
            </button>
          </div>
        </Bloque>

        <footer className="vvc-foot">
          <p>Información del inventario de arbolado urbano de Valparaíso · SIVU</p>
          <p className="vvc-foot__keys">
            <span className="vvc-tag vvc-tag--arbol">Este árbol</span> datos de este ejemplar ·{" "}
            <span className="vvc-tag vvc-tag--especie">Su especie</span> datos generales de su especie
          </p>
        </footer>
      </main>

      {!reportando && (
        <div className="vvc-fab">
          <button type="button" className="vvc-btn vvc-btn--fab" onClick={() => setReportando(true)}>
            <Icon name="alert" size={18} /> Reportar un problema
          </button>
        </div>
      )}

      {reportando && <ReporteCiudadano nombreArbol={nombre} qrToken={qrToken} vistaPrevia={vistaPrevia} onCerrar={() => setReportando(false)} />}
    </div>
  );
}

function Bloque({ id, titulo, bajada, children }: { id: Seccion; titulo: string; bajada: string; children: ReactNode }) {
  return (
    <section id={`vvc-${id}`} className="vvc-block" aria-labelledby={`vvc-${id}-t`}>
      <h2 id={`vvc-${id}-t`}>{titulo}</h2>
      <p className="vvc-block__sub">{bajada}</p>
      {children}
    </section>
  );
}

/** Un dato real; sin valor, lo dice en lugar de inventarlo. */
function Dato({
  ambito,
  etiqueta,
  valor,
  cursiva = false,
  ancho = false,
}: {
  ambito: "arbol" | "especie";
  etiqueta: string;
  valor: string | null;
  cursiva?: boolean;
  ancho?: boolean;
}) {
  return (
    <div className={`vvc-dato ${ancho ? "vvc-dato--ancho" : ""}`}>
      <span className={`vvc-tag vvc-tag--${ambito}`}>{ambito === "arbol" ? "Este árbol" : "Su especie"}</span>
      <span className="vvc-dato__k">{etiqueta}</span>
      {valor ? <strong className={cursiva ? "vvc-it" : ""}>{valor}</strong> : <span className="vvc-dato__vacio">Aún sin registrar</span>}
    </div>
  );
}

function Proximamente({ icono, titulo, texto }: { icono: IconName; titulo: string; texto: string }) {
  return (
    <div className="vvc-soon">
      <span className="vvc-soon__icon">
        <Icon name={icono} size={18} />
      </span>
      <div>
        <strong>{titulo}</strong>
        <p>{texto}</p>
      </div>
      <span className="vvc-soon__tag">Próximamente</span>
    </div>
  );
}

function Beneficio({ icono, titulo, texto }: { icono: IconName; titulo: string; texto: string }) {
  return (
    <div className="vvc-benefit">
      <span className="vvc-benefit__icon">
        <Icon name={icono} size={20} />
      </span>
      <strong>{titulo}</strong>
      <p>{texto}</p>
      <span className="vvc-soon__tag">Próximamente</span>
    </div>
  );
}
