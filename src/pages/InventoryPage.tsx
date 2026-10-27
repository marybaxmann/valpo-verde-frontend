import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectWithSector } from "../api/projects";
import { listarInventario, listarInventarioCompleto } from "../api/inventory";
import type { ProjectWithSector } from "../types/project";
import type { ArbolAlta } from "../types/treeAlta";
import { ESTADOS_CICLO_VIDA_B1, type ArbolInventario } from "../types/inventory";
import { Icon } from "../components/Icons";
import { PendingNotice } from "../components/PendingNotice";
import { NewTreeModal } from "../components/NewTreeModal";
import { useAuth } from "../hooks/useAuth";
import { ESTADO_PROYECTO_LABEL } from "../lib/projects";
import { getArcgisApiKey } from "../lib/arcgis";
import { fechaChile } from "../lib/dates";
import type { MapPoint } from "../components/ProjectMapView";

const ProjectMapView = lazy(() => import("../components/ProjectMapView"));

const PAGE = 50;

/**
 * Inventario (Fase 7, Paso 4): composición de la maqueta SIVU Lab
 * (CC-057) — tabla protagonista, especies y minimapa al lado — con B1
 * (GET /api/sivu/projects/:id/trees; paginado, búsqueda y filtro por ciclo
 * de vida en el backend). Muestra solo lo que B1 entrega hoy; DAP, altura,
 * riesgo efectivo, vigencia y la etiqueta del ciclo de vida están aprobados
 * y quedan como pendientes de integración (no se simulan ni se calculan).
 * El ciclo de vida se muestra con el código que llega, sin inventar su
 * etiqueta (PR-021). El minimapa recorre todas las páginas de B1.
 * «Nuevo árbol»: alta municipal mínima (POST /api/sivu/projects/:id/trees),
 * solo Usuario municipal (PR-003 v8.0). Aquí no se editan datos técnicos.
 */
export default function InventoryPage() {
  const { projectId = "" } = useParams();
  const { profile } = useAuth();
  const apiKey = getArcgisApiKey();
  const isMunicipal = profile?.role === "usuario_municipal";
  const [detail, setDetail] = useState<ProjectWithSector | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ArbolAlta[]>([]);

  // Filtros (los resuelve el backend).
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);

  const [pagina, setPagina] = useState<{ data: ArbolInventario[]; total: number } | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [todos, setTodos] = useState<ArbolInventario[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectWithSector(projectId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setProjectError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setProjectError(err instanceof Error ? err.message : "No se pudo cargar el proyecto.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // La búsqueda se envía 300 ms después de dejar de escribir.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setBusqueda(texto.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  // Página de la tabla.
  useEffect(() => {
    let cancelled = false;
    listarInventario(projectId, {
      limit: PAGE,
      offset,
      estado_ciclo_vida: estado || undefined,
      busqueda: busqueda || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setPagina({ data: res.data, total: res.total });
        setListError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setListError(err instanceof Error ? err.message : "No se pudo cargar el inventario.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, offset, estado, busqueda, version]);

  // Todos los árboles con los mismos filtros, para el minimapa.
  useEffect(() => {
    let cancelled = false;
    listarInventarioCompleto(projectId, { estado_ciclo_vida: estado || undefined, busqueda: busqueda || undefined })
      .then((rows) => {
        if (cancelled) return;
        setTodos(rows);
        setMapError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setMapError(err instanceof Error ? err.message : "No se pudieron cargar los árboles del mapa.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, estado, busqueda, version]);

  const puntos: MapPoint[] = useMemo(
    () =>
      (todos ?? [])
        .filter((a) => a.ubicacion)
        .map((a) => ({ id: a.id, lng: a.ubicacion!.lng, lat: a.ubicacion!.lat, title: a.tree_code })),
    [todos]
  );
  const selected = (todos ?? []).find((a) => a.id === selectedId) ?? (pagina?.data ?? []).find((a) => a.id === selectedId) ?? null;

  const project = detail?.proyecto;
  const cerrado = project?.estado_proyecto === "cerrado";
  const total = pagina?.total ?? 0;
  const desde = total === 0 ? 0 : offset + 1;
  const hasta = Math.min(offset + PAGE, total);
  const filtrando = Boolean(estado || busqueda);

  return (
    <div className="sivu-inv">
      <header className="sivu-phead">
        <div>
          <div className="sivu-phead__eyebrow">
            {project && (
              <span className={`sivu-chip ${project.estado_proyecto === "activo" ? "sivu-chip--ok" : ""}`}>
                {ESTADO_PROYECTO_LABEL[project.estado_proyecto]}
              </span>
            )}
            {detail?.sector && <span>{detail.sector.nombre_sector}</span>}
          </div>
          <h1 className="sivu-phead__title">Inventario</h1>
          <p className="sivu-phead__meta">
            {!detail && !projectError && "Cargando proyecto…"}
            {projectError && (
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {projectError}
              </span>
            )}
            {project && pagina && `${pagina.total} ${pagina.total === 1 ? "árbol" : "árboles"}${filtrando ? " con estos filtros" : " en el proyecto"}`}
          </p>
        </div>
        {/* Alta: solo Usuario municipal y con el proyecto activo (CC-042: un proyecto cerrado es solo consulta). */}
        {isMunicipal && project && !cerrado && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={15} />
            Nuevo árbol
          </button>
        )}
      </header>

      {created.length > 0 && (
        <div className="sivu-inv__created" role="status">
          <Icon name="check" size={15} />
          <span>
            {created.length === 1 ? "Árbol registrado: " : "Árboles registrados en esta visita: "}
            {created.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <strong>{a.tree_code}</strong> ({a.especie_cientifica ?? a.nombre_comun})
              </span>
            ))}
            .
          </span>
        </div>
      )}

      {!projectError && (
        <div className="sivu-inv__layout">
          <article className="sivu-panel sivu-inv__table">
            <div className="sivu-inv__toolbar">
              <label className="sivu-inv__search">
                <Icon name="search" size={15} />
                <input
                  type="search"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Buscar por especie o nombre común"
                  aria-label="Buscar por especie o nombre común"
                />
              </label>
              <div className="sivu-seg" role="radiogroup" aria-label="Ciclo de vida">
                <button
                  type="button"
                  role="radio"
                  aria-checked={estado === ""}
                  className={`sivu-seg__opt ${estado === "" ? "is-on" : ""}`}
                  onClick={() => {
                    setEstado("");
                    setOffset(0);
                  }}
                >
                  Todos
                </button>
                {ESTADOS_CICLO_VIDA_B1.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={estado === c}
                    title="Código del ciclo de vida (la etiqueta llegará con B1)"
                    className={`sivu-seg__opt sivu-inv__code-opt ${estado === c ? "is-on" : ""}`}
                    onClick={() => {
                      setEstado(c);
                      setOffset(0);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <p className="sivu-inv__pending-cols">
              Pendientes de integración en el listado: DAP, altura, riesgo efectivo, fecha de vigencia y etiqueta del
              ciclo de vida.
            </p>

            <div className="sivu-table-scroll">
              <table className="sivu-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Especie</th>
                    <th>Ciclo de vida</th>
                    <th>Sector</th>
                    <th>Ubicación</th>
                    <th>Registro</th>
                    <th aria-label="En el mapa" />
                  </tr>
                </thead>
                <tbody>
                  {!pagina && !listError && (
                    <tr>
                      <td colSpan={7} className="sivu-inv__state">
                        Cargando inventario…
                      </td>
                    </tr>
                  )}
                  {listError && (
                    <tr>
                      <td colSpan={7} className="sivu-inv__state sivu-inv__state--error">
                        <Icon name="alert" size={13} /> {listError}
                      </td>
                    </tr>
                  )}
                  {pagina && !listError && pagina.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="sivu-inv__state">
                        {filtrando ? "Ningún árbol coincide con la búsqueda o el filtro." : "El proyecto todavía no tiene árboles registrados."}
                      </td>
                    </tr>
                  )}
                  {pagina &&
                    !listError &&
                    pagina.data.map((a) => (
                      <tr
                        key={a.id}
                        className={`sivu-table__row--interactive ${a.id === selectedId ? "is-sel" : ""}`}
                        onClick={() => setSelectedId(a.id)}
                      >
                        <td className="sivu-inv__code">{a.tree_code}</td>
                        <td>
                          <span className="sivu-inv__species">
                            <strong>{a.nombre_comun ?? a.especie_cientifica ?? "—"}</strong>
                            {a.especie_cientifica && a.nombre_comun && <em>{a.especie_cientifica}</em>}
                          </span>
                        </td>
                        <td>
                          <span className="sivu-inv__lifecycle">{a.estado_ciclo_vida}</span>
                        </td>
                        <td>{a.sector ?? "—"}</td>
                        <td className="sivu-inv__place">{a.ubicacion_descriptiva ?? "—"}</td>
                        <td className="sivu-table__num">{fechaChile(a.fecha_registro)}</td>
                        <td className="sivu-inv__geo" title={a.ubicacion ? "Con ubicación" : "Sin ubicación"}>
                          {a.ubicacion ? <Icon name="pin" size={14} /> : <span aria-label="Sin ubicación">—</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {pagina && total > 0 && (
              <div className="sivu-inv__pager">
                <span>
                  {desde}–{hasta} de {total}
                </span>
                <button
                  type="button"
                  className="sivu-topbar__icon-btn"
                  aria-label="Página anterior"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE))}
                >
                  <Icon name="arrow-left" size={14} />
                </button>
                <button
                  type="button"
                  className="sivu-topbar__icon-btn"
                  aria-label="Página siguiente"
                  disabled={offset + PAGE >= total}
                  onClick={() => setOffset(offset + PAGE)}
                >
                  <Icon name="arrow-right" size={14} />
                </button>
              </div>
            )}
          </article>

          <aside className="sivu-inv__side">
            {selected && (
              <article className="sivu-panel">
                <div className="sivu-panel__head">
                  <h2>{selected.tree_code}</h2>
                  <button type="button" className="sivu-panel__link" onClick={() => setSelectedId(null)}>
                    Cerrar
                  </button>
                </div>
                <dl className="sivu-mant__dl">
                  <dt>Especie</dt>
                  <dd>{selected.especie_cientifica ?? "—"}</dd>
                  <dt>Nombre común</dt>
                  <dd>{selected.nombre_comun ?? "—"}</dd>
                  <dt>Ciclo de vida</dt>
                  <dd>{selected.estado_ciclo_vida}</dd>
                  <dt>Sector</dt>
                  <dd>{selected.sector ?? "—"}</dd>
                  <dt>Ubicación</dt>
                  <dd>{selected.ubicacion_descriptiva ?? "—"}</dd>
                  <dt>UTM 19S</dt>
                  <dd>
                    {selected.utm_este !== null && selected.utm_norte !== null
                      ? `${selected.utm_este} / ${selected.utm_norte}`
                      : "—"}
                  </dd>
                  <dt>Registro</dt>
                  <dd>{fechaChile(selected.fecha_registro)}</dd>
                </dl>
              </article>
            )}
            <article className="sivu-panel">
              <div className="sivu-panel__head">
                <h2>Especies</h2>
              </div>
              <PendingNotice what="el resumen por especie del inventario" refs="B7" compact />
            </article>
            <article className="sivu-panel">
              <div className="sivu-panel__head">
                <h2>Mapa</h2>
                {todos && <span className="sivu-mant__count">{puntos.length} con ubicación</span>}
              </div>
              <div className="sivu-mant__map-box">
                {mapError ? (
                  <p className="sivu-mant__muted">{mapError}</p>
                ) : apiKey ? (
                  <Suspense fallback={<p className="sivu-mant__muted">Cargando mapa…</p>}>
                    <ProjectMapView
                      apiKey={apiKey}
                      points={puntos}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      className="sivu-mant__map-inner"
                    />
                  </Suspense>
                ) : (
                  <p className="sivu-mant__muted">El mapa no está configurado en este entorno.</p>
                )}
              </div>
            </article>
          </aside>
        </div>
      )}

      {creating && (
        <NewTreeModal
          projectId={projectId}
          onClose={() => setCreating(false)}
          onCreated={(arbol) => {
            setCreating(false);
            setCreated((prev) => [...prev, arbol]);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
