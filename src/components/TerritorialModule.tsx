import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import { getArcgisApiKey } from "../lib/arcgis";
import { Icon } from "./Icons";
import type { MapPoint } from "./ProjectMapView";

const ProjectMapView = lazy(() => import("./ProjectMapView"));

/**
 * Estructura común de los módulos con mapa protagonista (Fase 7;
 * maqueta SIVU Lab, pantallas Riesgo Arbóreo e Infraestructura, CC-057):
 * mapa a pantalla completa bajo la barra, encabezado flotante con el
 * módulo y el lugar, y una tarjeta flotante con el resumen del módulo
 * (`card`), que se puede minimizar para ver el mapa completo; en el
 * teléfono ocupa la mitad inferior. Solo consulta: las acciones de registro no viven aquí
 * (CC-059, punto 6; CC-061).
 */
export function TerritorialModule({
  moduleLabel,
  card,
  points,
  selectedId,
  onSelect,
  filtros,
  filtrosActivos = 0,
  registros,
}: {
  moduleLabel: string;
  card: ReactNode;
  /** Puntos del mapa (árboles de la API), si el módulo los tiene. */
  points?: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Contenido del panel «Filtros» (maqueta: `ListTools`); sin él no se muestra el botón. */
  filtros?: ReactNode;
  /** Filtros activos, para el número del botón. */
  filtrosActivos?: number;
  /** Registros de la lista, para «Lista · N registros». */
  registros?: number;
}) {
  const { projectId = "" } = useParams();
  const apiKey = getArcgisApiKey();
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minimizada, setMinimizada] = useState(false);
  const [verFiltros, setVerFiltros] = useState(false);
  const angosta = usePantallaAngosta();
  // Lo que tapa la tarjeta en computador (territory.css).
  // En pantalla angosta nada tapa el mapa (la tarjeta va debajo).
  const padding = angosta ? {} : { left: minimizada ? 0 : 400 };

  useEffect(() => {
    let cancelled = false;
    getProjectWithSector(projectId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el proyecto.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className={`sivu-terr ${minimizada ? "is-min" : ""}`}>
      {apiKey ? (
        <Suspense fallback={<div className="sivu-terr__map sivu-terr__map--loading">Cargando mapa…</div>}>
          <ProjectMapView
            apiKey={apiKey}
            points={points}
            selectedId={selectedId}
            onSelect={onSelect}
            sector={detail?.sector?.geometria_sector ?? null}
            padding={padding}
          />
        </Suspense>
      ) : (
        <div className="sivu-terr__map sivu-terr__map--loading">
          El mapa no está configurado en este entorno (falta la clave de ArcGIS).
        </div>
      )}

      <div className="sivu-terr__overlay">
        <header className="sivu-terr__place">
          <span className="sivu-terr__chip">Territorio · {moduleLabel}</span>
          <h1 className="sivu-terr__title">{detail?.sector?.nombre_sector ?? detail?.proyecto.nombre_proyecto ?? "…"}</h1>
          <p className="sivu-terr__meta">
            {error ? (
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {error}
              </span>
            ) : (
              detail?.proyecto.nombre_proyecto ?? "Cargando proyecto…"
            )}
          </p>
        </header>
        {!error && (
          <div className={`sivu-terr__dock ${minimizada ? "is-min" : ""}`}>
            <div className="sivu-terr__tools">
              {filtros && (
                <button
                  type="button"
                  className={`sivu-terr__toggle ${verFiltros ? "is-on" : ""}`}
                  aria-expanded={verFiltros}
                  onClick={() => setVerFiltros((v) => !v)}
                >
                  <Icon name="filter" size={14} />
                  Filtros
                  {filtrosActivos > 0 && <span className="sivu-terr__badge">{filtrosActivos}</span>}
                </button>
              )}
              <button
                type="button"
                className="sivu-terr__toggle"
                aria-expanded={!minimizada}
                aria-controls="sivu-terr-card"
                onClick={() => setMinimizada((m) => !m)}
              >
                <Icon name="list" size={14} />
                Lista
                {registros !== undefined && <span className="sivu-terr__count">{registros} registros</span>}
                <Icon name="chevron-down" size={13} />
              </button>
            </div>
            {filtros && verFiltros && <div className="sivu-terr__filters">{filtros}</div>}
            {!minimizada && (
              <section id="sivu-terr-card" className="sivu-terr__card">
                {card}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Mismo corte que territory.css (`max-width: 860px`). */
function usePantallaAngosta(): boolean {
  const consulta = "(max-width: 860px)";
  const [angosta, setAngosta] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambiar = () => setAngosta(mq.matches);
    mq.addEventListener("change", cambiar);
    return () => mq.removeEventListener("change", cambiar);
  }, []);
  return angosta;
}
