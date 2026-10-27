import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { listarOtsProyecto } from "../api/workOrders";
import { ESTADOS_OT_ABIERTOS, ESTADOS_OT_CERRADOS, type OtListada } from "../types/workOrder";
import { Icon } from "../components/Icons";
import { getArcgisApiKey } from "../lib/arcgis";
import { fechaChile, hoyChile } from "../lib/dates";
import type { MapPoint } from "../components/ProjectMapView";

const ProjectMapView = lazy(() => import("../components/ProjectMapView"));

const PAGE = 200;
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** AAAA-MM-DD de una fecha de la API (fecha o marca de tiempo). */
function dia(iso: string): string {
  return iso.slice(0, 10);
}

/** Celdas del mes (semanas de lunes a domingo); null fuera del mes. */
function celdasDelMes(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function titulo(ot: OtListada): string {
  return ot.subtipo ? `${ot.accion.etiqueta} · ${ot.subtipo.etiqueta}` : ot.accion.etiqueta;
}

function arbolTexto(ot: OtListada): string {
  if (!ot.arbol) return "Sin árbol (Levantamiento)";
  const nombre = ot.arbol.nombre_comun ?? ot.arbol.especie_cientifica;
  return nombre ? `${ot.arbol.tree_code} · ${nombre}` : ot.arbol.tree_code;
}

/**
 * Mantención (Fase 7, Paso 4): OT de Mantenimiento del proyecto con la
 * composición de la maqueta SIVU Lab (CC-057) — calendario protagonista,
 * lista lateral y minimapa —, leídas de B3 (GET /api/sivu/projects/:id/
 * work-orders?tipo_ot=mantenimiento; CC-065). Las OT de Inspección van
 * en su módulo (CC-061). Estados y etiquetas, de la API; sin «Vencida»
 * (no es un estado de CC-050) y sin conteos por estado en el navegador:
 * solo el total que entrega la API. Solo lectura: `acciones` viene vacío
 * para el Usuario municipal y el Administrador; crear una OT de
 * Mantenimiento espera el #61.
 */
export default function MaintenancePage() {
  const { projectId = "" } = useParams();
  const apiKey = getArcgisApiKey();
  const hoy = hoyChile();
  const [incluirCerradas, setIncluirCerradas] = useState(false);
  const [ots, setOts] = useState<OtListada[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mes, setMes] = useState(() => ({ year: Number(hoy.slice(0, 4)), month: Number(hoy.slice(5, 7)) - 1 }));

  const estados = incluirCerradas ? [...ESTADOS_OT_ABIERTOS, ...ESTADOS_OT_CERRADOS] : undefined;

  useEffect(() => {
    let cancelled = false;
    listarOtsProyecto(projectId, { tipo_ot: "mantenimiento", estado: estados, limit: PAGE, offset: 0 })
      .then((res) => {
        if (cancelled) return;
        setOts(res.data);
        setTotal(res.total);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar las órdenes de trabajo.");
      });
    return () => {
      cancelled = true;
    };
    // `estados` se deriva de `incluirCerradas`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, incluirCerradas]);

  function cargarMas() {
    if (!ots) return;
    setCargandoMas(true);
    listarOtsProyecto(projectId, { tipo_ot: "mantenimiento", estado: estados, limit: PAGE, offset: ots.length })
      .then((res) => {
        setOts([...ots, ...res.data]);
        setTotal(res.total);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron cargar más órdenes."))
      .finally(() => setCargandoMas(false));
  }

  const loading = ots === null && !error;
  const conFecha = useMemo(() => (ots ?? []).filter((o) => o.fecha_accion_programada), [ots]);
  const sinFecha = useMemo(() => (ots ?? []).filter((o) => !o.fecha_accion_programada), [ots]);
  const porDia = useMemo(() => {
    const m = new Map<string, OtListada[]>();
    for (const o of conFecha) {
      const k = dia(o.fecha_accion_programada as string);
      m.set(k, [...(m.get(k) ?? []), o]);
    }
    return m;
  }, [conFecha]);
  const puntos: MapPoint[] = useMemo(
    () =>
      (ots ?? [])
        .filter((o) => o.arbol?.ubicacion)
        .map((o) => ({ id: o.id, lng: o.arbol!.ubicacion!.lng, lat: o.arbol!.ubicacion!.lat, title: o.codigo_ot ?? o.arbol!.tree_code })),
    [ots]
  );
  const selected = (ots ?? []).find((o) => o.id === selectedId) ?? null;
  const celdas = celdasDelMes(mes.year, mes.month);

  function moverMes(delta: number) {
    setMes(({ year, month }) => {
      const d = new Date(Date.UTC(year, month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  return (
    <div className="sivu-mant">
      <header className="sivu-phead">
        <div>
          <h1 className="sivu-phead__title">Mantención</h1>
          <p className="sivu-phead__meta">
            {loading && "Cargando órdenes de trabajo…"}
            {error && (
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {error}
              </span>
            )}
            {ots && !error && "Órdenes de trabajo de mantenimiento del proyecto"}
          </p>
        </div>
        <div className="sivu-mant__head-right">
          {ots && !error && (
            <span className="sivu-mant__total">
              <strong>{total}</strong> {incluirCerradas ? "órdenes en total" : total === 1 ? "orden abierta" : "órdenes abiertas"}
            </span>
          )}
          <div className="sivu-seg" role="radiogroup" aria-label="Estados de las órdenes">
            <button
              type="button"
              role="radio"
              aria-checked={!incluirCerradas}
              className={`sivu-seg__opt ${!incluirCerradas ? "is-on" : ""}`}
              onClick={() => setIncluirCerradas(false)}
            >
              Abiertas
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={incluirCerradas}
              className={`sivu-seg__opt ${incluirCerradas ? "is-on" : ""}`}
              onClick={() => setIncluirCerradas(true)}
            >
              Incluir completadas y canceladas
            </button>
          </div>
        </div>
      </header>

      {!error && (
        <div className="sivu-mant__layout">
          <article className="sivu-panel sivu-mant__cal">
            <div className="sivu-mant__cal-head">
              <h2>
                {MESES[mes.month]} <span>{mes.year}</span>
              </h2>
              <div className="sivu-mant__cal-nav">
                <button type="button" className="sivu-topbar__icon-btn" onClick={() => moverMes(-1)} aria-label="Mes anterior">
                  <Icon name="arrow-left" size={15} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setMes({ year: Number(hoy.slice(0, 4)), month: Number(hoy.slice(5, 7)) - 1 })}
                >
                  Hoy
                </button>
                <button type="button" className="sivu-topbar__icon-btn" onClick={() => moverMes(1)} aria-label="Mes siguiente">
                  <Icon name="arrow-right" size={15} />
                </button>
              </div>
            </div>
            <div className="sivu-mant__grid" role="grid" aria-label={`${MESES[mes.month]} ${mes.year}`}>
              {DIAS.map((d) => (
                <div key={d} className="sivu-mant__dow" role="columnheader">
                  {d}
                </div>
              ))}
              {celdas.map((c, i) => (
                <div
                  key={c ?? `x${i}`}
                  role="gridcell"
                  className={`sivu-mant__day ${c ? "" : "is-out"} ${c === hoy ? "is-today" : ""}`}
                >
                  {c && <span className="sivu-mant__daynum">{Number(c.slice(8))}</span>}
                  {c &&
                    (porDia.get(c) ?? []).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`sivu-mant__evt ${o.id === selectedId ? "is-sel" : ""}`}
                        title={`${titulo(o)} · ${o.estado.etiqueta}`}
                        onClick={() => setSelectedId(o.id)}
                      >
                        {titulo(o)}
                      </button>
                    ))}
                </div>
              ))}
            </div>
            {ots && conFecha.length === 0 && (
              <p className="sivu-mant__cal-empty">
                Ninguna orden tiene fecha programada. La fecha la ingresa el responsable al programar la orden.
              </p>
            )}
          </article>

          <aside className="sivu-mant__side">
            {selected && (
              <article className="sivu-panel sivu-mant__detail">
                <div className="sivu-panel__head">
                  <h2>{selected.codigo_ot ?? "Orden de trabajo"}</h2>
                  <button type="button" className="sivu-panel__link" onClick={() => setSelectedId(null)}>
                    Cerrar
                  </button>
                </div>
                <dl className="sivu-mant__dl">
                  <dt>Acción</dt>
                  <dd>{titulo(selected)}</dd>
                  <dt>Estado</dt>
                  <dd>{selected.estado.etiqueta}</dd>
                  <dt>Prioridad</dt>
                  <dd>{selected.prioridad?.etiqueta ?? "—"}</dd>
                  <dt>Árbol</dt>
                  <dd>
                    {arbolTexto(selected)}
                    {selected.arbol?.ubicacion_descriptiva && <small>{selected.arbol.ubicacion_descriptiva}</small>}
                  </dd>
                  <dt>Responsable</dt>
                  <dd>
                    {selected.responsable?.nombre ??
                      (selected.responsable?.fuera_del_proyecto ? "Ya no es miembro del proyecto" : "—")}
                  </dd>
                  <dt>Fecha programada</dt>
                  <dd>{selected.fecha_accion_programada ? dia(selected.fecha_accion_programada) : "Sin programar"}</dd>
                  <dt>Creada</dt>
                  <dd>{fechaChile(selected.fecha_creacion_ot)}</dd>
                  {selected.fecha_completada_ot && (
                    <>
                      <dt>Completada</dt>
                      <dd>{fechaChile(selected.fecha_completada_ot)}</dd>
                    </>
                  )}
                  {selected.requiere_revision_inspector !== null && (
                    <>
                      <dt>Revisión del Inspector</dt>
                      <dd>{selected.requiere_revision_inspector ? "Requerida" : "No requerida"}</dd>
                    </>
                  )}
                </dl>
              </article>
            )}

            <article className="sivu-panel sivu-mant__list">
              <div className="sivu-panel__head">
                <h2>Órdenes sin fecha</h2>
                {ots && <span className="sivu-mant__count">{sinFecha.length}</span>}
              </div>
              {loading && <p className="sivu-mant__muted">Cargando…</p>}
              {ots && ots.length === 0 && (
                <p className="sivu-mant__muted">
                  {incluirCerradas
                    ? "El proyecto no tiene órdenes de mantenimiento."
                    : "No hay órdenes de mantenimiento abiertas."}
                </p>
              )}
              {ots && ots.length > 0 && sinFecha.length === 0 && (
                <p className="sivu-mant__muted">Todas las órdenes están programadas en el calendario.</p>
              )}
              {sinFecha.length > 0 && (
                <ul className="sivu-mant__items">
                  {sinFecha.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className={`sivu-mant__item ${o.id === selectedId ? "is-sel" : ""}`}
                        onClick={() => setSelectedId(o.id)}
                      >
                        <span className="sivu-mant__code">{o.codigo_ot ?? "—"}</span>
                        <span className="sivu-mant__item-text">
                          <strong>{titulo(o)}</strong>
                          <small>{arbolTexto(o)}</small>
                        </span>
                        <span className="sivu-mant__state">{o.estado.etiqueta}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {ots && ots.length < total && (
                <button type="button" className="btn btn-ghost btn-sm sivu-mant__more" onClick={cargarMas} disabled={cargandoMas}>
                  {cargandoMas ? "Cargando…" : `Cargar más (${ots.length} de ${total})`}
                </button>
              )}
            </article>

            <article className="sivu-panel sivu-mant__map">
              <div className="sivu-panel__head">
                <h2>Mapa</h2>
                {ots && <span className="sivu-mant__count">{puntos.length} con ubicación</span>}
              </div>
              <div className="sivu-mant__map-box">
                {apiKey ? (
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
    </div>
  );
}
