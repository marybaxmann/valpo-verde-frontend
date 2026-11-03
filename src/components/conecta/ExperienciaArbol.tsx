import { useState, type ReactNode } from "react";
import type { FichaPublica } from "../../types/fichaPublica";
import { Icon, type IconName } from "../Icons";
import { SivuLogo } from "../SivuLogo";
import hoja from "../../assets/loader/hoja.webp";
import hojaChicaA from "../../assets/loader/hoja-chica-a.webp";
import hojaChicaB from "../../assets/loader/hoja-chica-b.webp";
import { ReporteCiudadano } from "./ReporteCiudadano";
import { SeguimientoReporte } from "./SeguimientoReporte";
import { fotoDeEspecie } from "./fotosEspecie";
import { contenidoDeEspecie } from "./contenidoEspecie";

/**
 * Valpo Verde Conecta: la identidad digital de un árbol para quien escanea
 * su placa QR (CC-062, PR-022). Portada con saludo y cuatro tarjetas que
 * abren cada sección (¿Quién soy?, ¿Qué aporto?, ¿Cómo es mi vida?, ¿Cómo
 * cuidarme?), y el acceso a «Reportar un problema», que llega al equipo
 * municipal como incidencia de la comunidad (módulo Incidencias).
 *
 * Reglas que sigue:
 * - Solo muestra lo que llega en la ficha pública; distingue lo propio del
 *   ejemplar («Este árbol») de lo general de su especie («Su especie»).
 * - Nunca riesgo, evaluaciones, coordenadas ni datos administrativos.
 * - Lo que CC-062 aún no autoriza o no tiene fuente (fotos, altura, edad,
 *   contenido por especie, beneficios, historia) se muestra como
 *   «Próximamente», sin valores: no se inventan datos.
 * - Textos ciudadanos por especie (contenidoEspecie.ts): solo de
 *   divulgación, sin rótulo en pantalla (su estado queda en
 *   contenidoEspecie.ts y en git); un valor de la API
 *   siempre tiene prioridad sobre ellos.
 */

type Seccion = "quien" | "aporto" | "vida" | "cuidarme";

const SECCIONES: {
  id: Seccion;
  titulo: string;
  tarjeta: string;
  bajada: string;
  icono: IconName;
}[] = [
  {
    id: "quien",
    titulo: "¿Quién soy?",
    tarjeta: "Quién soy",
    bajada: "Mi especie y mi familia",
    icono: "leaf",
  },
  {
    id: "aporto",
    titulo: "¿Qué aporto a Valparaíso?",
    tarjeta: "Mis beneficios",
    bajada: "Lo que aporto",
    icono: "sun",
  },
  {
    id: "vida",
    titulo: "¿Cómo es mi vida?",
    tarjeta: "Mi historia",
    bajada: "Mi año y mi vida",
    icono: "calendar",
  },
  {
    id: "cuidarme",
    titulo: "¿Cómo puedes cuidarme?",
    tarjeta: "Cómo cuidarme",
    bajada: "Consejos sencillos",
    icono: "user",
  },
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
  const [consultando, setConsultando] = useState(false);
  const esp = ficha.sobre_la_especie;
  const txt = contenidoDeEspecie(ficha.especie_cientifica);
  const tmp = txt?.temporal ?? null;
  const nombreComun = ficha.nombre_comun ?? txt?.nombreComun ?? null;
  const nombre =
    nombreComun ?? ficha.especie_cientifica ?? "Árbol de Valparaíso";
  const origenApi =
    esp?.origen_biogeografico?.codigo === "no_determinado"
      ? null
      : (esp?.origen_biogeografico?.etiqueta ?? null);

  const foto = fotoDeEspecie(ficha.especie_cientifica);

  const [abierta, setAbierta] = useState<Seccion | null>(null);
  const seccion = SECCIONES.find((x) => x.id === abierta) ?? null;

  return (
    <div className="vvc">
      <header className="vvc-top">
        <SivuLogo height={22} />
        <span className="vvc-top__brand">Valpo Verde Conecta</span>
      </header>

      <main className="vvc-home">
        {foto ? (
          <figure className="vvc-photo-hero vvc-photo-hero--foto">
            <img
              className="vvc-photo-hero__img"
              src={foto}
              alt={`Foto referencial de ${nombre}`}
            />
            <figcaption className="vvc-photo-hero__chip">
              <Icon name="camera" size={13} /> Foto referencial de la especie
            </figcaption>
          </figure>
        ) : (
          <div className="vvc-photo-hero" aria-hidden="true">
            <img className="vvc-hero__leaf" src={hoja} alt="" />
            <img
              className="vvc-hero__mini vvc-hero__mini--a"
              src={hojaChicaA}
              alt=""
            />
            <img
              className="vvc-hero__mini vvc-hero__mini--b"
              src={hojaChicaB}
              alt=""
            />
            <span className="vvc-photo-hero__chip">
              <Icon name="camera" size={13} /> Mi foto, próximamente
            </span>
          </div>
        )}

        <h1 className="vvc-hero__name">¡Hola, soy {nombre}!</h1>
        {ficha.especie_cientifica && nombreComun && (
          <p className="vvc-hero__sci">{ficha.especie_cientifica}</p>
        )}
        {ficha.ubicacion_descriptiva && (
          <p className="vvc-hero__place">
            <Icon name="pin" size={15} /> {ficha.ubicacion_descriptiva}
          </p>
        )}
        <p className="vvc-intro">
          Soy parte del arbolado urbano de Valparaíso. Descubre quién soy, lo
          que aporto a la ciudad y cómo puedes cuidarme.
        </p>

        <div className="vvc-tiles">
          {SECCIONES.map((x) => (
            <button
              key={x.id}
              type="button"
              className="vvc-tile"
              onClick={() => setAbierta(x.id)}
            >
              <Icon name={x.icono} size={20} />
              <strong>{x.tarjeta}</strong>
              <span>{x.bajada}</span>
            </button>
          ))}
        </div>

        <ReportarCard onReportar={() => setReportando(true)} />

        <button
          type="button"
          className="vvc-link vvc-link--center"
          onClick={() => setConsultando(true)}
        >
          ¿Ya enviaste un reporte? Consulta su estado
        </button>

        <footer className="vvc-foot">
          <p>
            Información del inventario de arbolado urbano de Valparaíso · SIVU
          </p>
        </footer>
      </main>

      {seccion && (
        <section className="vvc-panel" aria-labelledby="vvc-panel-t">
          <header className="vvc-panel__head">
            <button
              type="button"
              className="vvc-icon-btn"
              onClick={() => setAbierta(null)}
              aria-label="Volver"
            >
              <Icon name="arrow-left" size={18} />
            </button>
            <h2 id="vvc-panel-t">{seccion.titulo}</h2>
          </header>
          <div className="vvc-body">
            {abierta === "quien" && (
              <Bloque
                id="quien"
                titulo="¿Quién soy?"
                bajada="Mi nombre, mi familia y de dónde vengo."
              >
                <div className="vvc-grid">
                  <Dato
                    ambito="arbol"
                    etiqueta="Nombre común"
                    valor={nombreComun}
                  />
                  <Dato
                    ambito="arbol"
                    etiqueta="Nombre científico"
                    valor={ficha.especie_cientifica}
                    cursiva
                  />
                  <Dato
                    ambito="especie"
                    etiqueta="Género"
                    valor={esp?.genero ?? txt?.genero ?? null}
                    cursiva
                  />
                  <Dato
                    ambito="especie"
                    etiqueta="Familia"
                    valor={esp?.familia ?? txt?.familia ?? null}
                  />
                  <Dato
                    ambito="especie"
                    etiqueta="Origen"
                    valor={
                      origenApi ??
                      txt?.origen ??
                      esp?.origen_biogeografico?.etiqueta ??
                      null
                    }
                    ancho
                  />
                </div>
                {tmp ? (
                  <Texto
                    icono="camera"
                    titulo="Mis fotografías"
                    texto={tmp.fotos}
                    imagen={foto}
                  />
                ) : (
                  <Proximamente
                    icono="camera"
                    titulo="Mis fotografías"
                    texto="Aquí verás fotos de este árbol. Su publicación aún no está autorizada en la ficha ciudadana."
                  />
                )}
                {tmp ? (
                  <Texto
                    icono="ruler"
                    titulo="Mi edad y mi altura"
                    texto={tmp.edadAltura}
                  />
                ) : (
                  <Proximamente
                    icono="ruler"
                    titulo="Mi edad y mi altura"
                    texto="Datos de este árbol que se mostrarán cuando su publicación esté definida."
                  />
                )}
                {txt ? (
                  <Texto
                    icono="sparkle"
                    titulo="Curiosidades de mi especie"
                    texto={txt.curiosidades}
                  />
                ) : (
                  <Proximamente
                    icono="sparkle"
                    titulo="Curiosidades de mi especie"
                    texto="Contenido sobre la especie, preparado y revisado por el equipo de SIVU."
                  />
                )}
              </Bloque>
            )}

            {abierta === "aporto" && (
              <Bloque
                id="aporto"
                titulo="¿Qué aporto a Valparaíso?"
                bajada="Lo que hago por la ciudad, explicado en simple."
              >
                {txt && (
                  <Texto
                    icono="sun"
                    titulo="Mis beneficios"
                    texto={txt.beneficios}
                  />
                )}
                <div className="vvc-benefits">
                  <Beneficio
                    icono="sun"
                    titulo="Sombra"
                    texto={
                      tmp?.sombra ??
                      "La superficie que cubre mi copa y el alivio que da en días de calor."
                    }
                    etiqueta={tmp ? null : undefined}
                  />
                  <Beneficio
                    icono="leaf"
                    titulo="Carbono"
                    texto={
                      tmp?.carbono ??
                      "El carbono que guardo en mi madera y el que capturo cada año."
                    }
                    etiqueta={tmp ? null : undefined}
                  />
                  <Beneficio
                    icono="eye"
                    titulo="Aire"
                    texto={
                      txt?.aire ??
                      "Los contaminantes que mis hojas ayudan a retener."
                    }
                    etiqueta={txt ? null : undefined}
                  />
                  <Beneficio
                    icono="layers"
                    titulo="Agua"
                    texto={
                      txt?.agua ??
                      "La lluvia que retengo y que no escurre por la calle."
                    }
                    etiqueta={txt ? null : undefined}
                  />
                </div>
                <p className="vvc-note">
                  <Icon name="clock" size={14} /> Cada cifra aparecerá aquí
                  cuando su método de cálculo esté validado en SIVU. No
                  mostramos estimaciones sin respaldo.
                </p>
              </Bloque>
            )}

            {abierta === "vida" && (
              <Bloque
                id="vida"
                titulo="¿Cómo es mi vida?"
                bajada="Cómo cambio con las estaciones y lo que he vivido."
              >
                {(!txt || esp?.persistencia_follaje || esp?.tipo_hoja) && (
                  <div className="vvc-grid">
                    <Dato
                      ambito="especie"
                      etiqueta="Mi follaje"
                      valor={esp?.persistencia_follaje?.etiqueta ?? null}
                    />
                    <Dato
                      ambito="especie"
                      etiqueta="Mis hojas"
                      valor={esp?.tipo_hoja?.etiqueta ?? null}
                    />
                  </div>
                )}
                {txt && (
                  <>
                    <Texto
                      icono="leaf"
                      titulo="Mi follaje"
                      texto={txt.follaje}
                    />
                    <Texto icono="leaf" titulo="Mis hojas" texto={txt.hojas} />
                  </>
                )}
                {txt ? (
                  <Texto icono="calendar" titulo="Mi año" texto={txt.miAno} />
                ) : (
                  <Proximamente
                    icono="calendar"
                    titulo="Mi año"
                    texto="Cuándo florezco, cuándo cambian mis hojas y qué pasa conmigo en cada estación."
                  />
                )}
                {tmp ? (
                  <Texto
                    icono="clock"
                    titulo="Mi historia"
                    texto={tmp.historia}
                  />
                ) : (
                  <Proximamente
                    icono="clock"
                    titulo="Mi historia"
                    texto="Los cuidados que he recibido y fotos de cómo he cambiado con los años."
                  />
                )}
              </Bloque>
            )}

            {abierta === "cuidarme" && (
              <Bloque
                id="cuidarme"
                titulo="¿Cómo puedes cuidarme?"
                bajada="Pequeños gestos que me ayudan a vivir mejor."
              >
                {txt ? (
                  <>
                    <Texto
                      icono="user"
                      titulo="¿Cómo puedes cuidarme?"
                      texto={txt.comoCuidarme}
                    />
                    <Texto
                      icono="leaf"
                      titulo="Consejos de cuidado"
                      texto={txt.consejos}
                    />
                  </>
                ) : (
                  <Proximamente
                    icono="leaf"
                    titulo="Consejos de cuidado"
                    texto="Recomendaciones simples para cuidarme en la vereda y en la plaza."
                  />
                )}
                <ReportarCard onReportar={() => setReportando(true)} />
              </Bloque>
            )}

            <footer className="vvc-foot">
              <p>
                Información del inventario de arbolado urbano de Valparaíso ·
                SIVU
              </p>
              <p className="vvc-foot__keys">
                <span className="vvc-tag vvc-tag--arbol">Este árbol</span> datos
                de este ejemplar ·{" "}
                <span className="vvc-tag vvc-tag--especie">Su especie</span>{" "}
                datos generales de su especie
              </p>
            </footer>
          </div>
        </section>
      )}

      {reportando && (
        <ReporteCiudadano
          nombreArbol={nombre}
          qrToken={qrToken}
          vistaPrevia={vistaPrevia}
          onCerrar={() => setReportando(false)}
        />
      )}

      {consultando && (
        <SeguimientoReporte
          vistaPrevia={vistaPrevia}
          onCerrar={() => setConsultando(false)}
        />
      )}
    </div>
  );
}

function Bloque({
  id,
  titulo,
  bajada,
  children,
}: {
  id: Seccion;
  titulo: string;
  bajada: string;
  children: ReactNode;
}) {
  return (
    <section id={`vvc-${id}`} className="vvc-block" aria-label={titulo}>
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
      <span className={`vvc-tag vvc-tag--${ambito}`}>
        {ambito === "arbol" ? "Este árbol" : "Su especie"}
      </span>
      <span className="vvc-dato__k">{etiqueta}</span>
      {valor ? (
        <strong className={cursiva ? "vvc-it" : ""}>{valor}</strong>
      ) : (
        <span className="vvc-dato__vacio">Aún sin registrar</span>
      )}
    </div>
  );
}

function Proximamente({
  icono,
  titulo,
  texto,
}: {
  icono: IconName;
  titulo: string;
  texto: string;
}) {
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

/** Texto ciudadano de la especie (contenidoEspecie.ts). */
function Texto({
  icono,
  titulo,
  texto,
  imagen = null,
}: {
  icono: IconName;
  titulo: string;
  texto: string;
  imagen?: string | null;
}) {
  return (
    <div className="vvc-soon vvc-soon--texto">
      <span className="vvc-soon__icon">
        <Icon name={icono} size={18} />
      </span>
      <div>
        <strong>{titulo}</strong>
        <p>{texto}</p>
        {imagen && <img className="vvc-soon__img" src={imagen} alt={titulo} />}
      </div>
    </div>
  );
}

function Beneficio({
  icono,
  titulo,
  texto,
  etiqueta = "Próximamente",
}: {
  icono: IconName;
  titulo: string;
  texto: string;
  /** null = sin rótulo. */
  etiqueta?: string | null;
}) {
  return (
    <div className="vvc-benefit">
      <span className="vvc-benefit__icon">
        <Icon name={icono} size={20} />
      </span>
      <strong>{titulo}</strong>
      <p>{texto}</p>
      {etiqueta && <span className="vvc-soon__tag">{etiqueta}</span>}
    </div>
  );
}

/** Acceso destacado al formulario: el reporte llega al municipio como incidencia de la comunidad. */
function ReportarCard({ onReportar }: { onReportar: () => void }) {
  return (
    <div className="vvc-report">
      <span className="vvc-report__icon">
        <Icon name="alert" size={20} />
      </span>
      <div>
        <h3>¿Viste algún problema con este árbol?</h3>
        <p>
          Ayuda a cuidar el arbolado urbano informando una incidencia al
          municipio. El árbol queda identificado por su código QR.
        </p>
      </div>
      <button type="button" className="vvc-btn" onClick={onReportar}>
        Reportar un problema
      </button>
    </div>
  );
}
