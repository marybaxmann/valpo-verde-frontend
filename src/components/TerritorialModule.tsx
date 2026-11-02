import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import type { ProjectWithSector } from "../types/project";
import { getArcgisApiKey } from "../lib/arcgis";
import { Icon } from "./Icons";
import type { MapPoint } from "./ProjectMapView";

const ProjectMapView = lazy(() => import("./ProjectMapView"));

/**
 * Estructura común de los módulos con mapa protagonista (Fase 7; maqueta
 * SIVU Lab, pantallas Riesgo Arbóreo e Infraestructura, CC-057; solo el
 * diseño): mapa a pantalla completa, arriba a la izquierda el lugar y el
 * resumen del módulo (`card`); abajo a la izquierda «Filtros» y «Lista»,
 * que abren su panel; abajo al centro la leyenda (`leyendaInferior`); y a
 * la derecha la ficha del árbol elegido (`sheet`). Solo consulta: las
 * acciones de registro no viven aquí (CC-059, punto 6; CC-061).
 */
export function TerritorialModule({
  moduleLabel,
  card,
  lista,
  points,
  selectedId,
  onSelect,
  filtros,
  filtrosActivos = 0,
  registros,
  leyendaInferior,
  sheet,
}: {
  moduleLabel: string;
  /** Resumen del módulo, siempre a la vista (maqueta: `.ov`). */
  card: ReactNode;
  /** Lista de árboles, que se abre con «Lista» (maqueta: `ListTools`). */
  lista?: ReactNode;
  /** Puntos del mapa (árboles de la API), si el módulo los tiene. */
  points?: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Contenido del panel «Filtros»; sin él no se muestra el botón. */
  filtros?: ReactNode;
  /** Filtros activos, para el número del botón. */
  filtrosActivos?: number;
  /** Registros de la lista, para «Lista · N registros». */
  registros?: number;
  /** Leyenda flotante abajo al centro (maqueta: barra de Infraestructura). */
  leyendaInferior?: ReactNode;
  /** Ficha del árbol elegido, a la derecha del mapa (maqueta: `.sheet`). */
  sheet?: ReactNode;
}) {
  const { projectId = "" } = useParams();
  const apiKey = getArcgisApiKey();
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"lista" | "filtros" | null>(null);
  const angosta = usePantallaAngosta();
  // Lo que tapan el resumen (izquierda) y la ficha (derecha) en computador.
  const padding = angosta ? {} : { left: 380, right: sheet ? 432 : 0 };

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

  const alternar = (p: "lista" | "filtros") => setPanel((actual) => (actual === p ? null : p));

  return (
    <div className={`sivu-terr ${sheet ? "has-sheet" : ""} ${panel ? "has-panel" : ""}`}>
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
        {!error && <section className="sivu-terr__card">{card}</section>}
      </div>

      {!error && (lista || filtros) && (
        <div className="sivu-terr__bottom">
          {panel === "filtros" && filtros && <div className="sivu-terr__panel">{filtros}</div>}
          {panel === "lista" && lista && (
            <div className="sivu-terr__panel sivu-terr__panel--list" id="sivu-terr-lista">
              {lista}
            </div>
          )}
          <div className="sivu-terr__tools">
            {filtros && (
              <button
                type="button"
                className={`sivu-terr__toggle ${panel === "filtros" ? "is-on" : ""}`}
                aria-expanded={panel === "filtros"}
                onClick={() => alternar("filtros")}
              >
                <Icon name="filter" size={14} />
                Filtros
                {filtrosActivos > 0 && <span className="sivu-terr__badge">{filtrosActivos}</span>}
              </button>
            )}
            {lista && (
              <button
                type="button"
                className={`sivu-terr__toggle ${panel === "lista" ? "is-on" : ""}`}
                aria-expanded={panel === "lista"}
                aria-controls="sivu-terr-lista"
                onClick={() => alternar("lista")}
              >
                <Icon name="list" size={14} />
                Lista
                {registros !== undefined && <span className="sivu-terr__count">{registros} registros</span>}
                <Icon name="chevron-down" size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {!error && leyendaInferior && <div className="sivu-terr__legendbar">{leyendaInferior}</div>}

      {sheet}
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
