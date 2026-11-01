import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerIncidencia, revisarIncidencia } from "../api/incidencias";
import { obtenerCatalogos } from "../api/catalogs";
import { listarDiagnosticos } from "../api/diagnosticos";
import { ApiError } from "../api/client";
import type { IncidenciaDetalle, RevisionIncidenciaInput } from "../types/incidencia";
import type { Catalogos } from "../types/catalogs";
import type { Diagnostico } from "../types/diagnostico";
import { Icon } from "../components/Icons";
import { ClassificationBadge } from "../components/ClassificationBadge";
import { NewInspectionOrderModal } from "../components/NewInspectionOrderModal";
import { NewMaintenanceOrderModal } from "../components/NewMaintenanceOrderModal";
import { useAuth } from "../hooks/useAuth";
import { basePathForRole } from "../lib/roles";
import { fechaChile, fechaHoraChile } from "../lib/dates";
import { COLOR_PRIORIDAD, colorEstadoInc } from "../lib/incidencias";

/**
 * Revisión de una incidencia (B9; D-185 a D-189). Composición del tablero
 * «Revisión de una incidencia» de la maqueta del módulo: evidencia
 * fotográfica y reporte a la izquierda; árbol, reportante (solo Usuario
 * municipal) y resultado de la revisión a la derecha. Las reglas las valida
 * el backend; aquí cada resultado fija el estado que propone la maqueta.
 */

/** Resultado → estado y texto de la maqueta (D-187; «Requiere antecedentes» sigue en revisión con una OT de inspección). */
const RESULTADOS: Record<string, { estado: string; desc: string; submit: string; consecuencia: string; color: string }> = {
  validada: {
    estado: "derivada",
    color: "#8fd9b0",
    desc: "El reporte requiere atención: se deriva a una OT.",
    submit: "Registrar y derivar",
    consecuencia: "Pasa a «Derivada». El nombre y el RUT del reportante se eliminan. Luego crea la OT que corresponda.",
  },
  requiere_antecedentes: {
    estado: "en_revision",
    color: "#c9b6f5",
    desc: "Un Inspector confirma en terreno el estado del árbol.",
    submit: "Registrar y crear OT de inspección",
    consecuencia: "Se crea una OT de inspección vinculada. El nombre y el RUT se conservan hasta la resolución.",
  },
  descartada: {
    estado: "descartada",
    color: "#f3a98a",
    desc: "No corresponde atenderlo.",
    submit: "Registrar y descartar",
    consecuencia: "Pasa a «Descartada». Se borran las fotos y el nombre y el RUT del reportante.",
  },
};

export default function IncidenciaPage() {
  const { projectId = "", incidentId = "" } = useParams();
  const { profile } = useAuth();
  const isMunicipal = profile?.role === "usuario_municipal";
  const basePath = basePathForRole(profile?.role);

  const [version, setVersion] = useState(0);
  const [inc, setInc] = useState<{ v: number; data: IncidenciaDetalle } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [foto, setFoto] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [crear, setCrear] = useState<"inspeccion" | "mantenimiento" | null>(null);

  useEffect(() => {
    let cancelled = false;
    obtenerIncidencia(projectId, incidentId)
      .then((d) => !cancelled && setInc({ v: version, data: d }))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "No se pudo cargar la incidencia."));
    return () => {
      cancelled = true;
    };
  }, [projectId, incidentId, version]);

  useEffect(() => {
    let cancelled = false;
    obtenerCatalogos()
      .then((c) => !cancelled && setCatalogos(c))
      .catch(() => !cancelled && setCatalogos({}));
    return () => {
      cancelled = true;
    };
  }, []);

  const treeId = inc?.data.arbol?.id;
  useEffect(() => {
    if (!treeId) return;
    let cancelled = false;
    listarDiagnosticos(projectId, treeId)
      .then((ds) => !cancelled && setDiag(ds.find((d) => d.tree_id === treeId) ?? null))
      .catch(() => !cancelled && setDiag(null));
    return () => {
      cancelled = true;
    };
  }, [projectId, treeId]);

  const volver = `${basePath}/projects/${projectId}/incidencias`;
  if (error) {
    return (
      <div className="sivu-dash sivu-increv">
        <Link to={volver} className="sivu-insp__back">
          <Icon name="arrow-left" size={14} /> Bandeja de incidencias
        </Link>
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      </div>
    );
  }
  if (!inc) return <p className="sivu-state">Cargando la incidencia…</p>;

  const i = inc.data;
  const estado = i.estado_incidencia;
  const cerrada = estado.codigo === "resuelta" || estado.codigo === "descartada";
  const fotos = i.fotos;
  const fotoActual = fotos[Math.min(foto, Math.max(fotos.length - 1, 0))];
  const v = diag?.vigente;
  const riesgo = v?.resultado.clasificacion_riesgo ?? null;

  return (
    <div className="sivu-dash sivu-increv">
      <header className="sivu-increv__head">
        <div>
          <Link to={volver} className="sivu-insp__back">
            <Icon name="arrow-left" size={14} /> Bandeja de incidencias
          </Link>
          <div className="sivu-increv__title">
            <h1>{i.tipo_incidencia?.etiqueta ?? "Incidencia"}</h1>
            <span className="sivu-inc__code">{i.codigo_incidencia}</span>
            <span className="sivu-increv__estado" style={{ ["--c" as string]: colorEstadoInc(estado.codigo) }}>
              {estado.etiqueta}
            </span>
          </div>
        </div>
      </header>

      {aviso && (
        <p className="sivu-state sivu-state--ok" role="status">
          {aviso}
        </p>
      )}

      <div className="sivu-increv__grid">
        <div className="sivu-increv__col">
          <section className="sivu-increv__photo" aria-label="Evidencia fotográfica">
            {fotoActual ? (
              <>
                <a href={fotoActual.url} target="_blank" rel="noreferrer" title="Abrir en tamaño completo">
                  <img src={fotoActual.url} alt="Foto enviada con el reporte" />
                </a>
                {fotos.length > 1 && (
                  <div className="sivu-increv__photonav">
                    <button type="button" onClick={() => setFoto((f) => (f - 1 + fotos.length) % fotos.length)} aria-label="Foto anterior">
                      <Icon name="arrow-left" size={14} />
                    </button>
                    <span>
                      {Math.min(foto, fotos.length - 1) + 1} de {fotos.length}
                    </span>
                    <button type="button" onClick={() => setFoto((f) => (f + 1) % fotos.length)} aria-label="Foto siguiente">
                      <Icon name="arrow-right" size={14} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="sivu-increv__nophoto">
                <Icon name="camera" size={36} />
                <span>{estado.codigo === "descartada" ? "Las fotos se borraron al descartar el reporte." : "El reporte no tiene fotos."}</span>
              </div>
            )}
          </section>

          <section className="sivu-panel sivu-increv__report" aria-label="Reporte">
            {i.descripcion && <p className="sivu-increv__quote">«{i.descripcion}»</p>}
            <dl className="sivu-increv__facts">
              <div>
                <dt>Recibido</dt>
                <dd>{fechaHoraChile(i.fecha_reporte)}</dd>
              </div>
              <div>
                <dt>Origen</dt>
                <dd>{i.origen_reporte?.etiqueta ?? "—"}</dd>
              </div>
              <div>
                <dt>Ubicación</dt>
                <dd>{i.ubicacion ?? "—"}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="sivu-increv__col">
          <div className="sivu-increv__pair">
            <section className="sivu-panel sivu-increv__card" aria-label="Árbol">
              {i.arbol ? (
                <>
                  <div className="sivu-increv__cardtop">
                    <span className="sivu-inc__code">{i.arbol.tree_code}</span>
                    {riesgo ? <ClassificationBadge level={riesgo.etiqueta} label={`Riesgo ${riesgo.etiqueta}`} /> : <span className="status-pill">Sin evaluación</span>}
                  </div>
                  <strong className="sivu-increv__big">{i.arbol.nombre_comun ?? i.arbol.especie_cientifica ?? "—"}</strong>
                  {v ? (
                    <span className="sivu-inc__muted">
                      Vigente desde {fechaChile(v.desde)}
                      {v.resultado.prioridad ? ` · Prioridad ${v.resultado.prioridad.etiqueta}` : ""}
                    </span>
                  ) : (
                    <span className="sivu-inc__muted">Sin evaluación vigente.</span>
                  )}
                  <Link to={`${basePath}/projects/${projectId}/mapa?arbol=${i.arbol.id}`} className="sivu-increv__link">
                    Ver ficha del árbol <Icon name="arrow-right" size={12} />
                  </Link>
                </>
              ) : (
                <span className="sivu-inc__muted">Sin árbol identificado.</span>
              )}
            </section>

            <section className="sivu-panel sivu-increv__card sivu-increv__card--lock" aria-label="Reportante">
              <span className="sivu-increv__lock">
                <Icon name="lock" size={13} /> Solo Usuario municipal
              </span>
              {isMunicipal ? (
                i.reportante?.nombre ? (
                  <>
                    <div className="sivu-increv__kv">
                      <span>Nombre</span>
                      <strong>{i.reportante.nombre}</strong>
                    </div>
                    <div className="sivu-increv__kv">
                      <span>RUT</span>
                      <strong className="sivu-inc__code">{i.reportante.rut ?? "—"}</strong>
                    </div>
                  </>
                ) : (
                  <span className="sivu-inc__muted">{i.resultado_revision ? "Datos borrados tras la revisión." : "Sin datos del reportante."}</span>
                )
              ) : (
                <span className="sivu-inc__muted">Reservado.</span>
              )}
              <small className="sivu-inc__muted">
                Se eliminan al registrar Validada o Descartada. Con «Requiere antecedentes» se conservan hasta la resolución final.
              </small>
            </section>
          </div>

          {(i.resultado_revision || i.ot_derivadas.length > 0) && (
            <section className="sivu-panel sivu-increv__card" aria-label="Revisión registrada">
              <h2 className="sivu-increv__h2">Revisión registrada</h2>
              <dl className="sivu-increv__facts">
                <div>
                  <dt>Resultado</dt>
                  <dd>{i.resultado_revision?.etiqueta ?? "—"}</dd>
                </div>
                <div>
                  <dt>Prioridad municipal</dt>
                  <dd>{i.prioridad_municipal?.etiqueta ?? "—"}</dd>
                </div>
                <div>
                  <dt>Revisó</dt>
                  <dd>
                    {i.revisado_por ? i.revisado_por.nombre ?? "Ya no es miembro" : "—"}
                    {i.fecha_revision ? ` · ${fechaChile(i.fecha_revision)}` : ""}
                  </dd>
                </div>
              </dl>
              {i.observaciones_revision && <p className="sivu-increv__obs">{i.observaciones_revision}</p>}
              {i.ot_derivadas.length > 0 && (
                <ul className="sivu-inc__ots">
                  {i.ot_derivadas.map((o) => (
                    <li key={o.id}>
                      <strong>{o.codigo_ot ?? "OT"}</strong>
                      <span>{o.estado.etiqueta}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {isMunicipal && !cerrada && (
            <Revision
              key={inc.v}
              projectId={projectId}
              incidencia={i}
              catalogos={catalogos}
              onGuardada={(msg, siguiente) => {
                setAviso(msg);
                setVersion((x) => x + 1);
                if (siguiente) setCrear(siguiente);
              }}
              onCrear={setCrear}
            />
          )}
          {!isMunicipal && !cerrada && <p className="sivu-inc__muted">La revisión la registra el Usuario municipal.</p>}
        </div>
      </div>

      {crear === "inspeccion" && i.arbol && (
        <NewInspectionOrderModal
          projectId={projectId}
          arbolInicial={i.arbol.id}
          incidentId={i.id}
          onClose={() => setCrear(null)}
          onCreated={() => {
            setCrear(null);
            setAviso("Orden de inspección creada y vinculada a la incidencia.");
            setVersion((x) => x + 1);
          }}
        />
      )}
      {crear === "mantenimiento" && i.arbol && (
        <NewMaintenanceOrderModal
          projectId={projectId}
          arbolInicial={i.arbol.id}
          incidentId={i.id}
          onClose={() => setCrear(null)}
          onCreated={(codigo) => {
            setCrear(null);
            setAviso(`Orden ${codigo ?? ""} de mantenimiento creada y vinculada a la incidencia.`.replace("  ", " "));
            setVersion((x) => x + 1);
          }}
        />
      )}
    </div>
  );
}

function Revision({
  projectId,
  incidencia,
  catalogos,
  onGuardada,
  onCrear,
}: {
  projectId: string;
  incidencia: IncidenciaDetalle;
  catalogos: Catalogos | null;
  onGuardada: (msg: string, siguiente?: "inspeccion" | "mantenimiento") => void;
  onCrear: (tipo: "inspeccion" | "mantenimiento") => void;
}) {
  const derivada = incidencia.estado_incidencia.codigo === "derivada";
  const [resultado, setResultado] = useState(incidencia.resultado_revision?.codigo ?? "");
  const [prioridad, setPrioridad] = useState(incidencia.prioridad_municipal?.codigo ?? "");
  const [obs, setObs] = useState(incidencia.observaciones_revision ?? "");
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opciones = (catalogos?.resultado_revision ?? []).filter((c) => RESULTADOS[c.codigo]);
  const elegido = RESULTADOS[resultado];
  const faltan: string[] = [];
  if (!resultado) faltan.push("el resultado");
  if (resultado === "validada" && !prioridad) faltan.push("la prioridad municipal");

  async function enviar(body: RevisionIncidenciaInput, msg: string, siguiente?: "inspeccion") {
    setGuardando(true);
    setError(null);
    try {
      await revisarIncidencia(projectId, incidencia.id, body);
      onGuardada(msg, siguiente);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "Solo el Usuario municipal del proyecto revisa incidencias."
          : err instanceof Error
            ? err.message
            : "No se pudo guardar la revisión."
      );
      setGuardando(false);
      setConfirmar(false);
    }
  }

  function registrar() {
    if (!elegido) return;
    enviar(
      {
        estado_incidencia: elegido.estado,
        resultado_revision: resultado,
        observaciones_revision: obs.trim() || null,
        prioridad_municipal: resultado === "validada" ? prioridad : null,
      },
      `Revisión de ${incidencia.codigo_incidencia ?? "la incidencia"} registrada.`,
      resultado === "requiere_antecedentes" ? "inspeccion" : undefined
    );
  }

  // Ya derivada: crear la OT y, cuando se atendió, marcarla resuelta.
  if (derivada) {
    return (
      <section className="sivu-panel sivu-increv__review" aria-label="Seguimiento">
        <h2 className="sivu-increv__h2">Derivada</h2>
        <p className="sivu-inc__muted">Crea la orden de trabajo que corresponda y, cuando se haya atendido, marca la incidencia como resuelta.</p>
        <div className="sivu-increv__actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCrear("mantenimiento")}>
            <Icon name="wrench" size={14} /> Crear OT de mantenimiento
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCrear("inspeccion")}>
            <Icon name="check" size={14} /> Crear OT de inspección
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={guardando}
            onClick={() =>
              enviar(
                {
                  estado_incidencia: "resuelta",
                  resultado_revision: incidencia.resultado_revision?.codigo ?? "validada",
                  observaciones_revision: incidencia.observaciones_revision,
                  prioridad_municipal: incidencia.prioridad_municipal?.codigo ?? null,
                },
                `${incidencia.codigo_incidencia ?? "La incidencia"} quedó resuelta.`
              )
            }
          >
            {guardando ? "Guardando…" : "Marcar resuelta"}
          </button>
        </div>
        {error && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="sivu-panel sivu-increv__review" aria-label="Revisión municipal">
      <h2 className="sivu-increv__h2">Resultado de la revisión</h2>
      <div className="sivu-increv__opts" role="radiogroup" aria-label="Resultado">
        {opciones.map((o) => {
          const r = RESULTADOS[o.codigo];
          return (
            <button
              key={o.codigo}
              type="button"
              role="radio"
              aria-checked={resultado === o.codigo}
              className="sivu-increv__opt"
              style={{ ["--c" as string]: r.color }}
              onClick={() => {
                setResultado(o.codigo);
                if (o.codigo !== "validada") setPrioridad("");
                setConfirmar(false);
              }}
              disabled={guardando}
            >
              <strong>{o.etiqueta}</strong>
              <span>{r.desc}</span>
            </button>
          );
        })}
      </div>

      {resultado === "validada" && (
        <div className="sivu-increv__field">
          <span>Prioridad municipal</span>
          <div className="sivu-increv__prios" role="radiogroup" aria-label="Prioridad municipal">
            {(catalogos?.prioridad_municipal ?? []).map((p) => (
              <button
                key={p.codigo}
                type="button"
                role="radio"
                aria-checked={prioridad === p.codigo}
                className="sivu-increv__prio"
                style={{ ["--c" as string]: COLOR_PRIORIDAD[p.codigo] ?? "#c9d1cc" }}
                onClick={() => setPrioridad(p.codigo)}
                disabled={guardando}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="sivu-increv__field">
        <span>Observaciones de la revisión</span>
        <textarea
          rows={3}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Hallazgos o antecedentes que justifican el resultado"
          disabled={guardando}
        />
      </label>

      {error && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {error}
        </p>
      )}

      <div className="sivu-increv__submit">
        <span className="sivu-inc__muted">{elegido ? elegido.consecuencia : faltan.length ? `Falta elegir ${faltan.join(" y ")}.` : ""}</span>
        {confirmar ? (
          <span className="sivu-increv__actions">
            <button type="button" className="btn btn-danger btn-sm" onClick={registrar} disabled={guardando}>
              {guardando ? "Guardando…" : "Sí, descartar"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmar(false)} disabled={guardando}>
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={guardando || faltan.length > 0}
            onClick={() => (resultado === "descartada" ? setConfirmar(true) : registrar())}
          >
            {guardando ? "Guardando…" : elegido?.submit ?? "Registrar"}
          </button>
        )}
      </div>
    </section>
  );
}
