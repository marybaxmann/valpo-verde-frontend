import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listarMisOts } from "../api/workOrders";
import {
  calcularInspeccion,
  crearBorrador,
  finalizarInspeccion,
  guardarBorrador,
  listarFotos,
  obtenerEsquemaFormulario,
  subirFoto,
} from "../api/inspections";
import { ApiError } from "../api/client";
import type { OtListada } from "../types/workOrder";
import type {
  CalculoRespuesta,
  CampoFormulario,
  EsquemaFormulario,
  FinalizacionRespuesta,
  FotoInspeccion,
  VistaFoto,
} from "../types/inspection";
import { InspectionField } from "../components/InspectionField";
import { PendingNotice } from "../components/PendingNotice";
import { Icon } from "../components/Icons";
import { armarBody, cumple, ordenar, valorInvalido, valoresConvertidos, type ValoresCrudos, type ValorCrudo } from "../lib/inspectionForm";
import { fechaChile } from "../lib/dates";

/** Las cuatro vistas obligatorias de Evaluación inicial (PR-010 v4.0, D-27). Etiquetas pendientes del backend. */
const VISTAS: VistaFoto[] = ["arbol_completo", "base", "tronco", "copa"];

/**
 * Sin lectura de la inspección en curso (B17), el id del borrador y lo
 * escrito se recuerdan en este navegador para poder retomarlo. Es solo una
 * comodidad local: la fuente es el backend.
 */
const claveLocal = (otId: string) => `sivu-inspeccion-${otId}`;
interface CopiaLocal {
  inspectionId: string | null;
  valores: ValoresCrudos;
}
function leerCopia(otId: string): CopiaLocal {
  try {
    const raw = localStorage.getItem(claveLocal(otId));
    if (raw) return JSON.parse(raw) as CopiaLocal;
  } catch {
    /* sin almacenamiento: se empieza vacío */
  }
  return { inspectionId: null, valores: {} };
}
function guardarCopia(otId: string, copia: CopiaLocal) {
  try {
    localStorage.setItem(claveLocal(otId), JSON.stringify(copia));
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
}

function mensaje(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError && err.status === 403) return "Solo el Inspector responsable de esta OT puede registrar la inspección.";
  return err instanceof Error ? err.message : porDefecto;
}

/** Referencia del árbol ya registrado (B4), solo para orientar; no se copia al formulario. */
function referenciaArbol(ot: OtListada, campo: string): string | null {
  const a = ot.arbol;
  if (!a) return null;
  if (campo === "especie_cientifica") return a.especie_cientifica;
  if (campo === "nombre_comun") return a.nombre_comun;
  if (campo === "ubicacion_descriptiva") return a.ubicacion_descriptiva;
  return null;
}

export default function InspectionFormPage() {
  const { workOrderId = "" } = useParams();
  const [ot, setOt] = useState<OtListada | null>(null);
  const [esquema, setEsquema] = useState<EsquemaFormulario | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [inspectionId, setInspectionId] = useState<string | null>(() => leerCopia(workOrderId).inspectionId);
  const [valores, setValores] = useState<ValoresCrudos>(() => leerCopia(workOrderId).valores);
  const [sinGuardar, setSinGuardar] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [guardadoError, setGuardadoError] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState<string | null>(null);

  const [fotos, setFotos] = useState<FotoInspeccion[] | null>(null);
  const [fotosError, setFotosError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<VistaFoto | null>(null);

  const [calculo, setCalculo] = useState<CalculoRespuesta | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [calculoError, setCalculoError] = useState<string | null>(null);

  const [confirmando, setConfirmando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [final, setFinal] = useState<FinalizacionRespuesta | null>(null);
  const [finalError, setFinalError] = useState<string | null>(null);

  // OT (desde B4: no hay lectura de una sola OT) y luego el esquema de su proyecto (B16).
  useEffect(() => {
    let cancelado = false;
    listarMisOts({ limit: 200 })
      .then((res) => {
        const encontrada = res.data.find((o) => o.id === workOrderId) ?? null;
        if (!encontrada) throw new Error("Esta OT no está entre tus órdenes abiertas.");
        if (cancelado) return null;
        setOt(encontrada);
        return obtenerEsquemaFormulario(encontrada.proyecto.id);
      })
      .then((e) => {
        if (!cancelado && e) setEsquema(e);
      })
      .catch((err: unknown) => {
        if (!cancelado) setErrorCarga(mensaje(err, "No se pudo cargar la OT."));
      });
    return () => {
      cancelado = true;
    };
  }, [workOrderId]);

  // Fotos del borrador, cuando ya existe.
  useEffect(() => {
    if (!inspectionId) return;
    let cancelado = false;
    listarFotos(inspectionId)
      .then((f) => !cancelado && setFotos(f))
      .catch((err: unknown) => !cancelado && setFotosError(mensaje(err, "No se pudieron cargar las fotos.")));
    return () => {
      cancelado = true;
    };
  }, [inspectionId]);

  const camposArbol = useMemo(() => (esquema ? ordenar(esquema.campos_arbol) : []), [esquema]);
  const variables = useMemo(() => (esquema ? ordenar(esquema.variables) : []), [esquema]);
  const todos = useMemo(() => [...camposArbol, ...variables], [camposArbol, variables]);
  const convertidos = useMemo(() => valoresConvertidos(todos, valores), [todos, valores]);
  const faltantes = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of calculo?.campos_faltantes ?? []) m.set(f.campo, f.motivo);
    return m;
  }, [calculo]);
  const hayInvalidos = todos.some((c) => valorInvalido(c, valores[c.identificador]));
  const finalizada = final?.finalizada === true;
  const bloqueado = guardando || finalizando || finalizada;

  function cambiar(id: string, v: ValorCrudo) {
    setValores((prev) => {
      const next = { ...prev, [id]: v };
      guardarCopia(workOrderId, { inspectionId, valores: next });
      return next;
    });
    setSinGuardar(true);
    setGuardadoOk(null);
    setCalculo(null); // la huella ya no corresponde
    setConfirmando(false);
  }

  async function guardar() {
    if (!esquema || hayInvalidos) return;
    setGuardando(true);
    setGuardadoError(null);
    setGuardadoOk(null);
    try {
      const body = armarBody(esquema.variables, esquema.campos_arbol, valores);
      const res = inspectionId ? await guardarBorrador(inspectionId, body) : await crearBorrador(workOrderId, body);
      setInspectionId(res.inspection_id);
      guardarCopia(workOrderId, { inspectionId: res.inspection_id, valores });
      setSinGuardar(false);
      setCalculo(null);
      setGuardadoOk("Borrador guardado.");
    } catch (err) {
      setGuardadoError(mensaje(err, "No se pudo guardar el borrador."));
    } finally {
      setGuardando(false);
    }
  }

  async function subir(vista: VistaFoto, archivo: File | undefined) {
    if (!archivo || !inspectionId) return;
    setSubiendo(vista);
    setFotosError(null);
    try {
      await subirFoto(inspectionId, vista, archivo);
      setFotos(await listarFotos(inspectionId));
      setCalculo(null);
    } catch (err) {
      setFotosError(mensaje(err, "No se pudo subir la foto."));
    } finally {
      setSubiendo(null);
    }
  }

  async function calcular() {
    if (!inspectionId) return;
    setCalculando(true);
    setCalculoError(null);
    try {
      setCalculo(await calcularInspeccion(inspectionId));
    } catch (err) {
      setCalculoError(mensaje(err, "No se pudo calcular."));
    } finally {
      setCalculando(false);
    }
  }

  async function finalizar() {
    if (!inspectionId || !calculo) return;
    setFinalizando(true);
    setFinalError(null);
    try {
      const res = await finalizarInspeccion(inspectionId, calculo.huella);
      setFinal(res);
      setConfirmando(false);
      if (res.finalizada) {
        try {
          localStorage.removeItem(claveLocal(workOrderId));
        } catch {
          /* nada que limpiar */
        }
      }
    } catch (err) {
      setFinalError(
        err instanceof ApiError && err.status === 409
          ? "El borrador cambió desde el último cálculo. Vuelve a calcular antes de finalizar."
          : mensaje(err, "No se pudo finalizar.")
      );
      setCalculo(null);
    } finally {
      setFinalizando(false);
    }
  }

  if (errorCarga) {
    return (
      <div className="sivu-insp">
        <Link to="/inspector/mis-ot" className="sivu-insp__back">
          <Icon name="arrow-left" size={14} /> Mis OT
        </Link>
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {errorCarga}
        </p>
      </div>
    );
  }
  if (!ot || !esquema) return <p className="sivu-state">Cargando la inspección…</p>;

  const seccion = (titulo: string, campos: CampoFormulario[]) => (
    <section className="card card--pad sivu-insp__section">
      <h2>{titulo}</h2>
      <div className="sivu-insp__grid">
        {campos
          .filter((c) => cumple(c.condicion_activacion, convertidos))
          .map((c) => (
            <InspectionField
              key={c.identificador}
              campo={c}
              valor={valores[c.identificador]}
              onChange={(v) => cambiar(c.identificador, v)}
              disabled={bloqueado}
              referencia={referenciaArbol(ot, c.identificador)}
              faltante={faltantes.get(c.identificador)}
            />
          ))}
      </div>
    </section>
  );

  return (
    <div className="sivu-insp">
      <Link to="/inspector/mis-ot" className="sivu-insp__back">
        <Icon name="arrow-left" size={14} /> Mis OT
      </Link>
      <header className="page-header">
        <div>
          <h1>Evaluación inicial</h1>
          <p className="page-header__sub">
            {ot.codigo_ot ?? "OT"} · {ot.arbol?.tree_code ?? "sin árbol"}
            {ot.arbol?.nombre_comun ? ` · ${ot.arbol.nombre_comun}` : ""} · {ot.proyecto.nombre_proyecto}
          </p>
        </div>
        <span className="sivu-insp__estado">{ot.estado.etiqueta}</span>
      </header>

      <div className="sivu-insp__notes">
        <PendingNotice what="los nombres visibles de los campos; se muestran sus nombres técnicos" refs="B16 · etiqueta_pendiente" compact />
        <PendingNotice what="la lectura del borrador guardado; lo escrito se recuerda solo en este navegador" refs="B17" compact />
      </div>

      {seccion("Datos del árbol", camposArbol)}
      {seccion("Evaluación", variables)}

      <section className="card card--pad sivu-insp__section">
        <h2>Fotografías</h2>
        <p className="sivu-insp__intro">Cuatro vistas obligatorias (PR-010 v4.0). JPG o PNG, hasta 10 MB.</p>
        {!inspectionId ? (
          <p className="sivu-state">Guarda el borrador para poder subir las fotos.</p>
        ) : (
          <div className="sivu-insp__photos">
            {VISTAS.map((v) => {
              const deVista = (fotos ?? []).filter((f) => f.vista === v);
              const ultima = deVista[deVista.length - 1];
              return (
                <div key={v} className={`sivu-insp__photo ${faltantes.has("fotografias_arbol") && !ultima ? "is-missing" : ""}`}>
                  <div className="sivu-insp__thumb">
                    {ultima ? <img src={ultima.url} alt={`Foto ${v}`} /> : <Icon name="camera" size={22} />}
                  </div>
                  <span className="sivu-insp__photo-name">{v}</span>
                  <small>{deVista.length ? `${deVista.length} subida(s)` : "Sin foto"}</small>
                  <label className="btn btn-secondary btn-sm">
                    {subiendo === v ? "Subiendo…" : ultima ? "Agregar otra" : "Subir foto"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      hidden
                      disabled={subiendo !== null || finalizada}
                      onChange={(e) => {
                        void subir(v, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
        {fotosError && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {fotosError}
          </p>
        )}
      </section>

      {calculo && <ResultadoCalculo calculo={calculo} finalizada={!!final} />}

      {final && (
        <section className={`card card--pad sivu-insp__section ${final.finalizada ? "sivu-insp__done" : ""}`} role="status">
          {final.finalizada ? (
            <>
              <h2>Inspección finalizada</h2>
              <p>
                Próxima inspección: {fechaChile(final.fecha_proxima_inspeccion)} · próximo monitoreo:{" "}
                {fechaChile(final.fecha_proximo_monitoreo)}.
              </p>
              <p className="sivu-insp__intro">
                Los datos pasan a vigentes cuando se completa la OT (CC-050); completar la OT todavía no está disponible.
              </p>
            </>
          ) : (
            <>
              <h2>No se pudo finalizar</h2>
              <p>Faltan {final.campos_faltantes.length} dato(s). Revisa los campos marcados.</p>
            </>
          )}
        </section>
      )}

      <div className="sivu-insp__bar">
        <div className="sivu-insp__bar-msg">
          {hayInvalidos && <span className="sivu-state--error">Hay números mal escritos.</span>}
          {guardadoError && <span className="sivu-state--error">{guardadoError}</span>}
          {calculoError && <span className="sivu-state--error">{calculoError}</span>}
          {finalError && <span className="sivu-state--error">{finalError}</span>}
          {!guardadoError && guardadoOk && <span className="sivu-state--ok">{guardadoOk}</span>}
          {sinGuardar && !guardadoError && <span>Cambios sin guardar.</span>}
        </div>
        {confirmando ? (
          <div className="sivu-insp__bar-actions">
            <span>¿Finalizar con las fechas sugeridas? No se podrá editar después.</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmando(false)} disabled={finalizando}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={finalizar} disabled={finalizando}>
              {finalizando ? "Finalizando…" : "Sí, finalizar"}
            </button>
          </div>
        ) : (
          <div className="sivu-insp__bar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={guardar} disabled={bloqueado || hayInvalidos || (!sinGuardar && !!inspectionId)}>
              {guardando ? "Guardando…" : "Guardar borrador"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={calcular} disabled={!inspectionId || sinGuardar || calculando || finalizada}>
              {calculando ? "Calculando…" : "Calcular"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setConfirmando(true)}
              disabled={!calculo?.puede_finalizar || sinGuardar || finalizada}
            >
              Finalizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Resultado de `/calcular`, tal como lo entrega el backend (códigos; etiquetas pendientes, B18). */
function ResultadoCalculo({ calculo, finalizada }: { calculo: CalculoRespuesta; finalizada: boolean }) {
  const r = calculo.resultado;
  const filas: [string, unknown][] = [
    ["nivel_riesgo", calculo.nivel_riesgo],
    ["clasificacion_riesgo_calculada", r.clasificacion_riesgo_calculada],
    ["clasificacion_raices_cuello", r.clasificacion_raices_cuello],
    ["clasificacion_tronco", r.clasificacion_tronco],
    ["clasificacion_copa_ramas", r.clasificacion_copa_ramas],
    ["clasificacion_infraestructura_calculada", r.clasificacion_infraestructura_calculada],
    ["clasificacion_prioridad_calculada", r.clasificacion_prioridad_calculada],
  ];
  const fi = calculo.fechas_sugeridas.fecha_proxima_inspeccion;
  const fm = calculo.fechas_sugeridas.fecha_proximo_monitoreo;
  return (
    <section className="card card--pad sivu-insp__section" aria-live="polite">
      <h2>Resultado del cálculo</h2>
      <p className={calculo.puede_finalizar ? "sivu-state sivu-state--ok" : "sivu-state"}>
        {finalizada
          ? "Inspección finalizada con este resultado."
          : calculo.puede_finalizar
          ? "La inspección está completa y se puede finalizar."
          : `Faltan ${calculo.campos_faltantes.length} dato(s) para finalizar.`}
      </p>
      {calculo.campos_faltantes.length > 0 && (
        <ul className="sivu-insp__missing">
          {calculo.campos_faltantes.map((f) => (
            <li key={`${f.hoja}-${f.campo}`}>
              <a href={`#wrap-campo-${f.campo}`}>{f.campo}</a> — {f.motivo}
            </li>
          ))}
        </ul>
      )}
      {calculo.valores_no_permitidos.length > 0 && (
        <ul className="sivu-insp__missing">
          {calculo.valores_no_permitidos.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      )}
      <dl className="sivu-insp__result">
        {filas.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v === null || v === undefined ? "—" : String(v)}</dd>
          </div>
        ))}
        <div>
          <dt>fecha_proxima_inspeccion sugerida</dt>
          <dd>{fi.inmediato_y_continuo ? "Inmediata y continua" : fechaChile(fi.fecha)}</dd>
        </div>
        <div>
          <dt>fecha_proximo_monitoreo sugerida</dt>
          <dd>{fm.inmediato_y_continuo ? "Inmediato y continuo" : fechaChile(fm.fecha)}</dd>
        </div>
      </dl>
      <PendingNotice what="las etiquetas de los resultados; se muestran sus códigos" refs="B18" compact />
    </section>
  );
}
