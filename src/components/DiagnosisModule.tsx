import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarInventarioCompleto } from "../api/inventory";
import { obtenerCatalogos } from "../api/catalogs";
import type { CatalogoItem } from "../types/catalogs";
import { finalizadaYaVigente, type Componente, type Diagnostico, type ResultadoDiagnostico } from "../types/diagnostico";
import type { ArbolInventario } from "../types/inventory";
import { TerritorialModule } from "./TerritorialModule";
import { ClassificationBadge, getClassificationTone } from "./ClassificationBadge";
import { Icon } from "./Icons";
import { fechaChile } from "../lib/dates";

type Vista = "riesgo" | "infraestructura";

/**
 * Riesgo Arbóreo e Infraestructura con la evaluación vigente de cada árbol
 * (B18 `vigente`; CC-050). Todo valor viene de la API con su etiqueta; el
 * frontend no calcula ni cuenta. Sin evaluación vigente, el árbol se
 * muestra «Evaluación pendiente» (REGLAS_GENERALES «Historial y vigencia»);
 * una inspección finalizada cuya OT no se completa se ve aparte, por confirmar.
 */
export function DiagnosisModule({ vista }: { vista: Vista }) {
  const { projectId = "" } = useParams();
  const [datos, setDatos] = useState<{ arboles: ArbolInventario[]; diag: Map<string, Diagnostico> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [leyenda, setLeyenda] = useState<CatalogoItem[] | null>(null);

  // Leyenda del mapa con las etiquetas del catálogo de la API (PR-021).
  useEffect(() => {
    let cancelled = false;
    obtenerCatalogos()
      .then((c) => {
        if (!cancelled) setLeyenda(c[vista === "riesgo" ? "clasificacion_riesgo" : "clasificacion_infraestructura"] ?? []);
      })
      .catch(() => {
        if (!cancelled) setLeyenda([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vista]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listarInventarioCompleto(projectId, {}), listarDiagnosticos(projectId)])
      .then(([arboles, diags]) => {
        if (!cancelled) setDatos({ arboles, diag: new Map(diags.map((d) => [d.tree_id, d])) });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar los diagnósticos.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const valor = (d: Diagnostico | undefined) =>
    vista === "riesgo" ? d?.vigente?.resultado.clasificacion_riesgo : d?.vigente?.resultado.infraestructura?.clasificacion;
  const titulo = vista === "riesgo" ? "Riesgo Arbóreo" : "Infraestructura";
  const points = (datos?.arboles ?? [])
    .filter((a) => a.ubicacion)
    .map((a) => {
      const v = valor(datos?.diag.get(a.id));
      return {
        id: a.id,
        lng: a.ubicacion!.lng,
        lat: a.ubicacion!.lat,
        title: a.tree_code,
        tone: v ? getClassificationTone(v.etiqueta) : ("neutral" as const),
      };
    });
  const arbol = datos?.arboles.find((a) => a.id === elegido) ?? null;
  const diag = elegido ? datos?.diag.get(elegido) : undefined;


  return (
    <TerritorialModule
      moduleLabel={titulo}
      points={points}
      selectedId={elegido}
      onSelect={setElegido}
      card={
        <>
          <div className="sivu-panel__head">
            <h2>{titulo}</h2>
            <span className="sivu-diag__tag">Evaluación vigente</span>
          </div>
          {leyenda && leyenda.length > 0 && (
            <ul className="sivu-diag__legend" aria-label="Leyenda del mapa">
              {[...leyenda]
                .sort((a, b) => a.orden - b.orden)
                .map((c) => (
                  <li key={c.codigo}>
                    <span className={`sivu-diag__dot sivu-diag__dot--${getClassificationTone(c.etiqueta)}`} aria-hidden="true" />
                    {c.etiqueta}
                  </li>
                ))}
              <li>
                <span className="sivu-diag__dot sivu-diag__dot--neutral" aria-hidden="true" />
                Evaluación pendiente
              </li>
            </ul>
          )}
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!datos && !error && <p className="sivu-state">Cargando árboles y diagnósticos…</p>}
          {datos && datos.arboles.length === 0 && <p className="sivu-state">El proyecto no tiene árboles registrados.</p>}

          {datos && arbol && (
            <div className="sivu-diag__detail">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setElegido(null)}>
                <Icon name="arrow-left" size={13} /> Todos los árboles
              </button>
              <h3>
                {arbol.tree_code} · <em>{arbol.especie_cientifica ?? "sin especie"}</em>
              </h3>
              {!diag?.vigente ? (
                <p className="sivu-state">Evaluación pendiente: el árbol todavía no tiene una orden de trabajo completada.</p>
              ) : (
                <>
                  <p className="sivu-diag__meta">Vigente desde el {fechaChile(diag.vigente.desde)}</p>
                  {vista === "riesgo" ? <DetalleRiesgo r={diag.vigente.resultado} /> : <DetalleInfra r={diag.vigente.resultado} />}
                  <dl className="sivu-diag__dl">
                    <div>
                      <dt>Prioridad</dt>
                      <dd>{diag.vigente.resultado.prioridad?.etiqueta ?? "—"}</dd>
                    </div>
                    {finalizadaYaVigente(diag) && (
                      <>
                        <div>
                          <dt>Próxima inspección</dt>
                          <dd>{diag.fecha_proxima_inspeccion ? fechaChile(diag.fecha_proxima_inspeccion) : "—"}</dd>
                        </div>
                        <div>
                          <dt>Próximo monitoreo</dt>
                          <dd>{diag.fecha_proximo_monitoreo ? fechaChile(diag.fecha_proximo_monitoreo) : "—"}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                </>
              )}
              {diag && !finalizadaYaVigente(diag) && (
                <details className="sivu-diag__pending" open={!diag.vigente}>
                  <summary>
                    {diag.tipo_inspeccion?.etiqueta ?? "Inspección"} {diag.codigo_inspeccion ?? ""} finalizada
                    {diag.fecha_inspeccion ? ` el ${fechaChile(diag.fecha_inspeccion)}` : ""}: pasa a vigente al completar su orden
                  </summary>
                  {vista === "riesgo" ? <DetalleRiesgo r={diag.resultado} /> : <DetalleInfra r={diag.resultado} />}
                </details>
              )}
            </div>
          )}

          {datos && !arbol && datos.arboles.length > 0 && (
            <ul className="sivu-diag__list" aria-label="Árboles del proyecto">
              {datos.arboles.map((a) => {
                const v = valor(datos.diag.get(a.id));
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => setElegido(a.id)}>
                      <span>
                        <strong>{a.tree_code}</strong> <em>{a.especie_cientifica ?? ""}</em>
                      </span>
                      {v ? <ClassificationBadge level={v.etiqueta} /> : <span className="status-pill">Evaluación pendiente</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="sivu-terr__note">
            Muestra la evaluación vigente de cada árbol. Una inspección finalizada pasa a vigente cuando se completa su orden de trabajo.
          </p>
        </>
      }
    />
  );
}

function DetalleRiesgo({ r }: { r: ResultadoDiagnostico }) {
  const c = r.componentes;
  const filas: [string, Componente | null][] = [
    ["Raíces y cuello", c?.raices_cuello ?? null],
    ["Tronco", c?.tronco ?? null],
    ["Copa y ramas", c?.copa_ramas ?? null],
  ];
  return (
    <>
      <div className="sivu-diag__main">
        <span>Clasificación de riesgo</span>
        {r.clasificacion_riesgo ? (
          <ClassificationBadge level={r.clasificacion_riesgo.etiqueta} />
        ) : (
          <span className="status-pill">—</span>
        )}
      </div>
      <table className="sivu-diag__table">
        <thead>
          <tr>
            <th>Componente</th>
            <th>Probabilidad de falla</th>
            <th>Clasificación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([nombre, comp]) => (
            <tr key={nombre}>
              <td>{nombre}</td>
              <td>{comp?.probabilidad_falla?.etiqueta ?? "—"}</td>
              <td>{comp?.clasificacion ? <ClassificationBadge level={comp.clasificacion.etiqueta} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DetalleInfra({ r }: { r: ResultadoDiagnostico }) {
  const inf = r.infraestructura;
  return (
    <>
      <div className="sivu-diag__main">
        <span>Afectación de infraestructura</span>
        {inf?.clasificacion ? <ClassificationBadge level={inf.clasificacion.etiqueta} /> : <span className="status-pill">—</span>}
      </div>
      <dl className="sivu-diag__dl">
        <div>
          <dt>Puntaje</dt>
          <dd>{inf?.puntaje ?? "—"}</dd>
        </div>
        <div>
          <dt>Porcentaje</dt>
          <dd>{inf?.porcentaje != null ? `${inf.porcentaje.toLocaleString("es-CL", { maximumFractionDigits: 1 })} %` : "—"}</dd>
        </div>
      </dl>
    </>
  );
}
