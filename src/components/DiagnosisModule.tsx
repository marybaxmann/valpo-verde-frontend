import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarInventarioCompleto } from "../api/inventory";
import type { Componente, Diagnostico } from "../types/diagnostico";
import type { ArbolInventario } from "../types/inventory";
import { TerritorialModule } from "./TerritorialModule";
import { ClassificationBadge } from "./ClassificationBadge";
import { Icon } from "./Icons";
import { fechaChile } from "../lib/dates";

type Vista = "riesgo" | "infraestructura";

/**
 * Riesgo Arbóreo e Infraestructura con el diagnóstico de la última
 * inspección finalizada de cada árbol (B18 mínimo). Todo valor viene de la
 * API con su etiqueta; el frontend no calcula ni cuenta. Es el diagnóstico
 * finalizado, no el vigente (la vigencia llega al completar la OT, CC-050).
 * Un árbol sin diagnóstico se muestra «Sin evaluación».
 */
export function DiagnosisModule({ vista }: { vista: Vista }) {
  const { projectId = "" } = useParams();
  const [datos, setDatos] = useState<{ arboles: ArbolInventario[]; diag: Map<string, Diagnostico> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);

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

  const titulo = vista === "riesgo" ? "Riesgo Arbóreo" : "Infraestructura";
  const points = (datos?.arboles ?? [])
    .filter((a) => a.ubicacion)
    .map((a) => ({ id: a.id, lng: a.ubicacion!.lng, lat: a.ubicacion!.lat, title: a.tree_code }));
  const arbol = datos?.arboles.find((a) => a.id === elegido) ?? null;
  const diag = elegido ? datos?.diag.get(elegido) : undefined;

  const valor = (d: Diagnostico | undefined) =>
    vista === "riesgo" ? d?.resultado.clasificacion_riesgo : d?.resultado.infraestructura?.clasificacion;

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
            <span className="sivu-diag__tag">Diagnóstico finalizado</span>
          </div>
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
              {!diag ? (
                <p className="sivu-state">Sin evaluación.</p>
              ) : (
                <>
                  <p className="sivu-diag__meta">
                    {diag.tipo_inspeccion?.etiqueta ?? "Inspección"} {diag.codigo_inspeccion ?? ""}
                    {diag.fecha_inspeccion ? ` · ${fechaChile(diag.fecha_inspeccion)}` : ""}
                  </p>
                  {vista === "riesgo" ? <DetalleRiesgo d={diag} /> : <DetalleInfra d={diag} />}
                  <dl className="sivu-diag__dl">
                    <div>
                      <dt>Prioridad</dt>
                      <dd>{diag.resultado.prioridad?.etiqueta ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Próxima inspección</dt>
                      <dd>{diag.fecha_proxima_inspeccion ? fechaChile(diag.fecha_proxima_inspeccion) : "—"}</dd>
                    </div>
                    <div>
                      <dt>Próximo monitoreo</dt>
                      <dd>{diag.fecha_proximo_monitoreo ? fechaChile(diag.fecha_proximo_monitoreo) : "—"}</dd>
                    </div>
                  </dl>
                </>
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
                      {v ? <ClassificationBadge level={v.etiqueta} /> : <span className="status-pill">Sin evaluación</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="sivu-terr__note">
            Muestra la última inspección finalizada de cada árbol; pasa a vigente cuando se completa su orden de trabajo.
          </p>
        </>
      }
    />
  );
}

function DetalleRiesgo({ d }: { d: Diagnostico }) {
  const c = d.resultado.componentes;
  const filas: [string, Componente | null][] = [
    ["Raíces y cuello", c?.raices_cuello ?? null],
    ["Tronco", c?.tronco ?? null],
    ["Copa y ramas", c?.copa_ramas ?? null],
  ];
  return (
    <>
      <div className="sivu-diag__main">
        <span>Clasificación de riesgo</span>
        {d.resultado.clasificacion_riesgo ? (
          <ClassificationBadge level={d.resultado.clasificacion_riesgo.etiqueta} />
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

function DetalleInfra({ d }: { d: Diagnostico }) {
  const inf = d.resultado.infraestructura;
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
