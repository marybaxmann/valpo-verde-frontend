import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarRevisiones } from "../api/mantenimiento";
import type { OtEnRevision } from "../types/mantenimiento";
import { OtMantenimiento } from "../components/OtMantenimiento";
import { Icon } from "../components/Icons";
import { useAuth } from "../hooks/useAuth";
import { fechaChile } from "../lib/dates";

/**
 * «Revisiones de mantenimiento» del Inspector (CC-064 b; #61): las OT de
 * Mantenimiento donde es el Inspector revisor asignado, de todos sus
 * proyectos (GET /api/sivu/work-orders/revisiones). Por defecto, solo las
 * que tienen una ejecución esperando su revisión.
 */
export default function RevisionesPage() {
  const { profile } = useAuth();
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [ots, setOts] = useState<OtEnRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    listarRevisiones({ solo_pendientes: soloPendientes })
      .then((r) => {
        if (cancelado) return;
        setOts(r);
        setError(null);
      })
      .catch((e: unknown) => !cancelado && setError(e instanceof Error ? e.message : "No se pudieron cargar las revisiones."));
    return () => {
      cancelado = true;
    };
  }, [soloPendientes, version]);

  const selected = ots?.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="sivu-dash">
      <Link to="/inspector/mis-ot" className="sivu-insp__back">
        <Icon name="arrow-left" size={14} /> Mis OT
      </Link>
      <header className="sivu-phead">
        <div>
          <h1 className="sivu-phead__title">Revisiones de mantenimiento</h1>
          <p className="sivu-phead__meta">
            {!ots && !error && "Cargando…"}
            {error && (
              <span className="sivu-phead__error">
                <Icon name="alert" size={13} /> {error}
              </span>
            )}
            {ots && !error && "Órdenes de mantenimiento en las que eres el Inspector revisor"}
          </p>
        </div>
      </header>

      <div className="sivu-mant__filter">
        <label className="sivu-newot__check">
          <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
          Solo las que esperan mi revisión
        </label>
      </div>

      {aviso && (
        <p className="sivu-state sivu-state--ok sivu-mant__aviso" role="status">
          {aviso}
          <button type="button" className="sivu-panel__link" onClick={() => setAviso(null)}>
            Cerrar
          </button>
        </p>
      )}

      <div className="sivu-rev">
        <article className="sivu-panel sivu-mant__list">
          <div className="sivu-panel__head">
            <h2>Órdenes</h2>
            {ots && <span className="sivu-mant__count">{ots.length}</span>}
          </div>
          {ots && ots.length === 0 && (
            <p className="sivu-mant__muted">
              {soloPendientes ? "No tienes ejecuciones esperando tu revisión." : "No tienes órdenes de mantenimiento abiertas como revisor. Las completadas se ven en el módulo Mantención de cada proyecto."}
            </p>
          )}
          {ots && ots.length > 0 && (
            <ul className="sivu-mant__items">
              {ots.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`sivu-mant__item ${o.id === selectedId ? "is-sel" : ""}`}
                    onClick={() => setSelectedId(o.id)}
                  >
                    <span className="sivu-mant__code">{o.codigo_ot ?? "—"}</span>
                    <span className="sivu-mant__item-text">
                      <strong>
                        {o.accion.etiqueta}
                        {o.subtipo ? ` · ${o.subtipo.etiqueta}` : ""}
                      </strong>
                      <small>
                        {o.arbol ? `${o.arbol.tree_code}${o.arbol.nombre_comun ? ` · ${o.arbol.nombre_comun}` : ""}` : "—"} ·{" "}
                        {o.proyecto.nombre_proyecto ?? "—"}
                      </small>
                      {o.ejecucion_pendiente && (
                        <small>
                          Ejecución {o.ejecucion_pendiente.codigo_mantenimiento ?? ""} del {fechaChile(o.ejecucion_pendiente.fecha_ejecucion)}
                        </small>
                      )}
                    </span>
                    <span className="sivu-mant__state">{o.ejecucion_pendiente ? "Por revisar" : o.estado.etiqueta}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

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
              <dd>
                {selected.accion.etiqueta}
                {selected.subtipo ? ` · ${selected.subtipo.etiqueta}` : ""}
              </dd>
              <dt>Árbol</dt>
              <dd>
                {selected.arbol ? `${selected.arbol.tree_code} · ${selected.arbol.nombre_comun ?? selected.arbol.especie_cientifica ?? ""}` : "—"}
                {selected.arbol?.ubicacion_descriptiva && <small>{selected.arbol.ubicacion_descriptiva}</small>}
              </dd>
              <dt>Estado</dt>
              <dd>{selected.estado.etiqueta}</dd>
              <dt>Encargado</dt>
              <dd>{selected.responsable?.nombre ?? "—"}</dd>
              <dt>Proyecto</dt>
              <dd>{selected.proyecto.nombre_proyecto ?? "—"}</dd>
            </dl>
            <OtMantenimiento
              key={selected.id}
              ot={selected}
              role={profile?.role ?? null}
              userId={profile?.id ?? null}
              onChanged={(m) => {
                setAviso(`${selected.codigo_ot ?? "Orden"}: ${m}`);
                setVersion((v) => v + 1);
              }}
            />
          </article>
        )}
      </div>
    </div>
  );
}
