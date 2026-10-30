import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listarMisOts } from "../api/workOrders";
import {
  calcularInspeccion,
  crearBorrador,
  finalizarInspeccion,
  guardarBorrador,
  eliminarFoto,
  listarFotos,
  listarInspeccionesDeOt,
  obtenerEsquemaFormulario,
  subirFoto,
} from "../api/inspections";
import { obtenerCatalogos } from "../api/catalogs";
import { ApiError } from "../api/client";
import type { OtListada } from "../types/workOrder";
import type { Catalogos } from "../types/catalogs";
import type {
  AjustesBody,
  CalculoRespuesta,
  CampoAjustable,
  CampoFormulario,
  EsquemaFormulario,
  FinalizacionRespuesta,
  FinalizarBody,
  FotoInspeccion,
  InspeccionDeOt,
  SeccionFormulario,
  ValorCampo,
  VistaFoto,
} from "../types/inspection";
import { InspectionField } from "../components/InspectionField";
import { PendingNotice } from "../components/PendingNotice";
import { Icon } from "../components/Icons";
import {
  armarBody,
  cumple,
  nombreLegible,
  ordenar,
  TIPOS_CON_FORMULARIO,
  valorInvalido,
  valoresConvertidos,
  type ValoresCrudos,
  type ValorCrudo,
} from "../lib/inspectionForm";
import { fechaChile } from "../lib/dates";

/** Las cuatro vistas obligatorias de la evaluación completa (D-27); su etiqueta viene del catálogo `vista_foto`. */
const VISTAS: VistaFoto[] = ["arbol_completo", "base", "tronco", "copa"];

/** Clasificaciones que el Inspector puede ajustar con justificación (D-170 a D-173; CC-044), con su catálogo. */
const AJUSTABLES: { campo: CampoAjustable; titulo: string; catalogo: string; calculada: string }[] = [
  { campo: "clasificacion_riesgo", titulo: "Riesgo del árbol", catalogo: "clasificacion_riesgo", calculada: "clasificacion_riesgo_calculada" },
  {
    campo: "clasificacion_infraestructura",
    titulo: "Conflicto con la infraestructura",
    catalogo: "clasificacion_infraestructura",
    calculada: "clasificacion_infraestructura_calculada",
  },
  {
    campo: "clasificacion_prioridad",
    titulo: "Prioridad de intervención",
    catalogo: "clasificacion_prioridad",
    calculada: "clasificacion_prioridad_calculada",
  },
];

/** El valor ajustado siempre es una categoría determinada (CC-044): nunca estos códigos. */
const NO_AJUSTABLES = ["no_determinado", "no_aplica", "sin_clasificacion"];

/** Valor guardado en el backend → lo que muestra cada control (texto para números y listas). */
function aCrudo(v: ValorCampo): ValorCrudo {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.every((x) => typeof x === "number") ? (v as number[]).join(" ") : (v as string[]);
  return v as string | boolean;
}

function valoresDeBorrador(i: InspeccionDeOt): ValoresCrudos {
  const out: ValoresCrudos = {};
  for (const [k, v] of Object.entries({ ...i.campos_arbol, ...i.variables })) out[k] = aCrudo(v);
  return out;
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

/** Agrupa los campos por la sección que entrega el backend, en el orden de `secciones`. */
function agruparPorSeccion(campos: CampoFormulario[], secciones: SeccionFormulario[]): { seccion: SeccionFormulario; campos: CampoFormulario[] }[] {
  const otros: SeccionFormulario = { codigo: "__otros", etiqueta: "Otros datos" };
  const orden = [...secciones].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const grupos = new Map<string, CampoFormulario[]>();
  for (const c of campos) {
    const codigo = c.seccion?.codigo ?? otros.codigo;
    if (!grupos.has(codigo)) grupos.set(codigo, []);
    grupos.get(codigo)!.push(c);
  }
  const conocidas = orden.filter((s) => grupos.has(s.codigo)).map((s) => ({ seccion: s, campos: grupos.get(s.codigo)! }));
  // Una sección que el backend nombra en un campo pero no en `secciones` se agrega al final con su propia etiqueta.
  const sueltas = [...grupos.keys()]
    .filter((k) => k !== otros.codigo && !orden.some((s) => s.codigo === k))
    .map((k) => ({ seccion: grupos.get(k)![0].seccion ?? otros, campos: grupos.get(k)! }));
  const resto = grupos.has(otros.codigo) ? [{ seccion: otros, campos: grupos.get(otros.codigo)! }] : [];
  return [...conocidas, ...sueltas, ...resto];
}

interface AjusteEditable {
  valor: string;
  justificacion: string;
}

export default function InspectionFormPage() {
  const { workOrderId = "" } = useParams();
  const [ot, setOt] = useState<OtListada | null>(null);
  const [esquema, setEsquema] = useState<EsquemaFormulario | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos>({});
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [valores, setValores] = useState<ValoresCrudos>({});
  const [finalizadasPrevias, setFinalizadasPrevias] = useState(0);
  const [sinGuardar, setSinGuardar] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [guardadoError, setGuardadoError] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState<string | null>(null);

  const [fotos, setFotos] = useState<FotoInspeccion[] | null>(null);
  const [fotosError, setFotosError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<VistaFoto | null>(null);
  const [porEliminar, setPorEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const [calculo, setCalculo] = useState<CalculoRespuesta | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [calculoError, setCalculoError] = useState<string | null>(null);

  // Ajustes del Inspector y fechas (solo después de calcular). Los ajustes se ven con «Recalcular».
  const [ajustes, setAjustes] = useState<Partial<Record<CampoAjustable, AjusteEditable>>>({});
  const [ajustesCalculados, setAjustesCalculados] = useState<string>("");
  const [fechaInspeccion, setFechaInspeccion] = useState("");
  const [fechaMonitoreo, setFechaMonitoreo] = useState("");
  const [justificacionFecha, setJustificacionFecha] = useState("");

  const [confirmando, setConfirmando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [final, setFinal] = useState<FinalizacionRespuesta | null>(null);
  const [finalError, setFinalError] = useState<string | null>(null);

  // OT (desde B4: no hay lectura de una sola OT), el esquema de su proyecto (B16) y los catálogos (etiquetas).
  useEffect(() => {
    let cancelado = false;
    obtenerCatalogos()
      .then((c) => !cancelado && setCatalogos(c))
      .catch(() => {
        /* sin catálogos se muestran los códigos */
      });
    listarMisOts({ limit: 200 })
      .then((res) => {
        const encontrada = res.data.find((o) => o.id === workOrderId) ?? null;
        if (!encontrada) throw new Error("Esta OT no está entre tus órdenes abiertas.");
        if (!TIPOS_CON_FORMULARIO.includes(encontrada.accion.codigo)) {
          throw new Error(`El formulario para ${encontrada.accion.etiqueta} está en desarrollo.`);
        }
        if (cancelado) return null;
        setOt(encontrada);
        // B17: el borrador en curso (Preguardado) se retoma desde el backend, en cualquier equipo.
        return Promise.all([obtenerEsquemaFormulario(encontrada.proyecto.id), listarInspeccionesDeOt(encontrada.id)]);
      })
      .then((r) => {
        if (cancelado || !r) return;
        const [e, inspecciones] = r;
        const borrador = [...inspecciones].reverse().find((i) => i.estado_registro === "preguardado") ?? null;
        if (borrador) {
          setInspectionId(borrador.inspection_id);
          setValores(valoresDeBorrador(borrador));
        }
        setFinalizadasPrevias(inspecciones.filter((i) => i.estado_registro === "finalizado").length);
        setEsquema(e);
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
  const grupos = useMemo(() => agruparPorSeccion(todos, esquema?.secciones ?? []), [todos, esquema]);
  const etiquetaDe = useMemo(() => new Map(todos.map((c) => [c.identificador, c.etiqueta])), [todos]);
  const convertidos = useMemo(() => valoresConvertidos(todos, valores), [todos, valores]);
  const faltantes = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of calculo?.campos_faltantes ?? []) m.set(f.campo, f.motivo);
    return m;
  }, [calculo]);
  const hayInvalidos = todos.some((c) => valorInvalido(c, valores[c.identificador]));
  const finalizada = final?.finalizada === true;
  const bloqueado = guardando || finalizando || finalizada;

  /** Etiqueta de un código de catálogo; el código si el catálogo no lo trae. */
  const etiqueta = (catalogo: string, codigo: unknown): string => {
    if (codigo === null || codigo === undefined || codigo === "") return "—";
    return catalogos[catalogo]?.find((i) => i.codigo === codigo)?.etiqueta ?? String(codigo);
  };

  const ajustesBody = useMemo<AjustesBody | undefined>(() => {
    const body: AjustesBody = {};
    for (const a of AJUSTABLES) {
      const e = ajustes[a.campo];
      if (e?.valor) body[a.campo] = { valor_ajustado: e.valor, justificacion_ajuste_clasificacion: e.justificacion.trim() };
    }
    return Object.keys(body).length ? body : undefined;
  }, [ajustes]);
  const ajustesFirma = JSON.stringify(ajustesBody ?? {});
  const ajustesSinJustificar = AJUSTABLES.some((a) => ajustes[a.campo]?.valor && !ajustes[a.campo]?.justificacion.trim());
  const ajustesPendientesDeCalcular = ajustesFirma !== ajustesCalculados;

  const sugeridaInspeccion = calculo?.fechas_sugeridas.fecha_proxima_inspeccion.fecha ?? "";
  const sugeridaMonitoreo = calculo?.fechas_sugeridas.fecha_proximo_monitoreo.fecha ?? "";
  const fechaInspeccionCambiada = !!fechaInspeccion && fechaInspeccion !== sugeridaInspeccion;
  const fechaMonitoreoCambiada = !!fechaMonitoreo && fechaMonitoreo !== sugeridaMonitoreo;
  const fechasSinJustificar = (fechaInspeccionCambiada || fechaMonitoreoCambiada) && !justificacionFecha.trim();

  function invalidarCalculo() {
    setCalculo(null); // la huella ya no corresponde
    setConfirmando(false);
  }

  function cambiar(id: string, v: ValorCrudo) {
    setValores((prev) => ({ ...prev, [id]: v }));
    setSinGuardar(true);
    setGuardadoOk(null);
    invalidarCalculo();
  }

  async function guardar() {
    if (!esquema || !ot || hayInvalidos) return;
    setGuardando(true);
    setGuardadoError(null);
    setGuardadoOk(null);
    try {
      const body = armarBody(esquema.variables, esquema.campos_arbol, valores, ot.accion.codigo, ot.subtipo?.codigo ?? null);
      const res = inspectionId ? await guardarBorrador(inspectionId, body) : await crearBorrador(workOrderId, body);
      setInspectionId(res.inspection_id);
      setSinGuardar(false);
      invalidarCalculo();
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
      invalidarCalculo();
    } catch (err) {
      setFotosError(mensaje(err, "No se pudo subir la foto."));
    } finally {
      setSubiendo(null);
    }
  }

  async function quitarFoto(photoId: string) {
    if (!inspectionId) return;
    setEliminando(true);
    setFotosError(null);
    try {
      await eliminarFoto(inspectionId, photoId);
      setFotos(await listarFotos(inspectionId));
      setPorEliminar(null);
      invalidarCalculo();
    } catch (err) {
      setFotosError(mensaje(err, "No se pudo eliminar la foto."));
    } finally {
      setEliminando(false);
    }
  }

  async function calcular() {
    if (!inspectionId || ajustesSinJustificar) return;
    setCalculando(true);
    setCalculoError(null);
    try {
      const res = await calcularInspeccion(inspectionId, ajustesBody);
      setCalculo(res);
      setAjustesCalculados(ajustesFirma);
      setFechaInspeccion(res.fechas_sugeridas.fecha_proxima_inspeccion.fecha ?? "");
      setFechaMonitoreo(res.fechas_sugeridas.fecha_proximo_monitoreo.fecha ?? "");
      setJustificacionFecha("");
    } catch (err) {
      setCalculoError(mensaje(err, "No se pudo calcular."));
    } finally {
      setCalculando(false);
    }
  }

  function cambiarAjuste(campo: CampoAjustable, parcial: Partial<AjusteEditable>) {
    setAjustes((prev) => {
      const actual = prev[campo] ?? { valor: "", justificacion: "" };
      return { ...prev, [campo]: { ...actual, ...parcial } };
    });
    setConfirmando(false);
  }

  async function finalizar() {
    if (!inspectionId || !calculo) return;
    setFinalizando(true);
    setFinalError(null);
    try {
      const body: FinalizarBody = { huella: calculo.huella };
      if (ajustesBody) body.ajustes = ajustesBody;
      if (fechaInspeccionCambiada) body.fecha_proxima_inspeccion = fechaInspeccion;
      if (fechaMonitoreoCambiada) body.fecha_proximo_monitoreo = fechaMonitoreo;
      if (fechaInspeccionCambiada || fechaMonitoreoCambiada) body.justificacion_ajuste_fecha = justificacionFecha.trim();
      const res = await finalizarInspeccion(inspectionId, body);
      setFinal(res);
      setConfirmando(false);
    } catch (err) {
      // Si la respuesta se perdió pero el backend ya la finalizó (un segundo
      // envío choca con «no está en Preguardado»), se muestra lo que quedó en B17.
      const yaFinalizada = await listarInspeccionesDeOt(workOrderId)
        .then((l) => l.some((i) => i.inspection_id === inspectionId && i.estado_registro === "finalizado"))
        .catch(() => false);
      if (yaFinalizada) {
        setFinal({
          finalizada: true,
          fecha_proxima_inspeccion_sugerida: sugeridaInspeccion,
          fecha_proximo_monitoreo_sugerida: sugeridaMonitoreo,
          fecha_proxima_inspeccion: fechaInspeccion,
          fecha_proximo_monitoreo: fechaMonitoreo,
        });
        setConfirmando(false);
        return;
      }
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

  const hayEtiquetasPendientes = todos.some((c) => c.etiqueta_pendiente);
  const puedeFinalizar =
    !!calculo?.puede_finalizar && !sinGuardar && !finalizada && !ajustesPendientesDeCalcular && !ajustesSinJustificar && !fechasSinJustificar;

  return (
    <div className="sivu-insp">
      <Link to="/inspector/mis-ot" className="sivu-insp__back">
        <Icon name="arrow-left" size={14} /> Mis OT
      </Link>
      <header className="page-header">
        <div>
          <h1>
            {ot.accion.etiqueta}
            {ot.subtipo ? ` · ${ot.subtipo.etiqueta}` : ""}
          </h1>
          <p className="page-header__sub">
            {ot.codigo_ot ?? "OT"} · {ot.arbol?.tree_code ?? "sin árbol"}
            {ot.arbol?.nombre_comun ? ` · ${ot.arbol.nombre_comun}` : ""} · {ot.proyecto.nombre_proyecto}
          </p>
        </div>
        <span className="sivu-insp__estado">{ot.estado.etiqueta}</span>
      </header>

      {(hayEtiquetasPendientes || finalizadasPrevias > 0 || inspectionId) && (
        <div className="sivu-insp__notes">
          {inspectionId && (
            <p className="sivu-state" role="status">
              Retomas el borrador guardado de esta orden. Lo que no hayas guardado en otro equipo no aparece aquí.
            </p>
          )}
          {!inspectionId && finalizadasPrevias > 0 && (
            <p className="sivu-state" role="status">
              Esta orden ya tiene {finalizadasPrevias} inspección(es) finalizada(s). Vas a registrar una nueva.
            </p>
          )}
          {hayEtiquetasPendientes && <PendingNotice what="el nombre visible de algunos campos" refs="B16 · etiqueta_pendiente" compact />}
        </div>
      )}

      {grupos.map(({ seccion, campos }) => {
        const visibles = campos.filter((c) => cumple(c.condicion_activacion, convertidos));
        if (visibles.length === 0) return null;
        return (
          <section key={seccion.codigo} className="card card--pad sivu-insp__section">
            <h2>{seccion.etiqueta}</h2>
            <div className="sivu-insp__grid">
              {visibles.map((c) => (
                <InspectionField
                  key={c.identificador}
                  campo={c}
                  valor={valores[c.identificador]}
                  onChange={(v) => cambiar(c.identificador, v)}
                  disabled={bloqueado}
                  referencia={referenciaArbol(ot, c.identificador)}
                  faltante={faltantes.get(c.identificador)}
                  projectId={ot.proyecto.id}
                  etiquetaDe={(id) => etiquetaDe.get(id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="card card--pad sivu-insp__section">
        <h2>Fotografías</h2>
        <p className="sivu-insp__intro">
          Cuatro vistas obligatorias. JPG o PNG, hasta 10 MB. Mientras la inspección esté en borrador, una foto subida por error se puede eliminar.
        </p>
        {!inspectionId ? (
          <p className="sivu-state">Guarda el borrador para poder subir las fotos.</p>
        ) : (
          <div className="sivu-insp__photos">
            {VISTAS.map((v) => {
              const deVista = (fotos ?? []).filter((f) => f.vista === v);
              const ultima = deVista[deVista.length - 1];
              const nombre = etiqueta("vista_foto", v);
              return (
                <div key={v} className={`sivu-insp__photo ${faltantes.has("fotografias_arbol") && !ultima ? "is-missing" : ""}`}>
                  <div className="sivu-insp__thumb">
                    {ultima ? <img src={ultima.url} alt={`Foto: ${nombre}`} /> : <Icon name="camera" size={22} />}
                  </div>
                  <span className="sivu-insp__photo-name">{nombre}</span>
                  <small>{deVista.length ? `${deVista.length} subida(s)` : "Sin foto"}</small>
                  {!finalizada && deVista.length > 0 && (
                    <ul className="sivu-insp__photo-list" aria-label={`Fotos subidas: ${nombre}`}>
                      {deVista.map((f, n) => (
                        <li key={f.id}>
                          <img src={f.url} alt={`${nombre}, foto ${n + 1}`} />
                          {porEliminar === f.id ? (
                            <span className="sivu-insp__photo-confirm">
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => void quitarFoto(f.id)} disabled={eliminando}>
                                {eliminando ? "Eliminando…" : "Sí, eliminar"}
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPorEliminar(null)} disabled={eliminando}>
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setPorEliminar(f.id)}
                              disabled={subiendo !== null || eliminando}
                            >
                              Eliminar
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
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

      {calculo && <ResultadoCalculo calculo={calculo} finalizada={!!final} etiqueta={etiqueta} etiquetaCampo={(c) => etiquetaDe.get(c) ?? (c === "fotografias_arbol" ? "Fotografías del árbol" : nombreLegible(c))} />}

      {calculo && calculo.puede_finalizar && !finalizada && (
        <section className="card card--pad sivu-insp__section">
          <h2>Ajustes del Inspector</h2>
          <p className="sivu-insp__intro">
            Opcional. Si tu criterio técnico difiere del resultado calculado, elige otra categoría y justifícala. El valor calculado se
            conserva junto al ajuste.
          </p>
          <div className="sivu-insp__grid">
            {AJUSTABLES.map((a) => {
              const calculada = calculo.resultado[a.calculada];
              const opciones = (catalogos[a.catalogo] ?? []).filter((i) => !NO_AJUSTABLES.includes(i.codigo) && i.codigo !== calculada);
              const e = ajustes[a.campo] ?? { valor: "", justificacion: "" };
              const id = `ajuste-${a.campo}`;
              return (
                <div key={a.campo} className="sivu-insp-field">
                  <div className="sivu-insp-field__head">
                    <label htmlFor={id} className="sivu-insp-field__name">
                      {a.titulo}
                    </label>
                  </div>
                  <small className="sivu-insp-field__hint">Calculado: {etiqueta(a.catalogo, calculada)}</small>
                  <select id={id} value={e.valor} onChange={(ev) => cambiarAjuste(a.campo, { valor: ev.target.value })} disabled={finalizando}>
                    <option value="">Mantener el calculado</option>
                    {opciones.map((o) => (
                      <option key={o.codigo} value={o.codigo}>
                        {o.etiqueta}
                      </option>
                    ))}
                  </select>
                  {e.valor && (
                    <textarea
                      id={`${id}-justificacion`}
                      rows={2}
                      placeholder="Justificación técnica del ajuste (obligatoria)"
                      aria-label={`Justificación del ajuste de ${a.titulo}`}
                      value={e.justificacion}
                      onChange={(ev) => cambiarAjuste(a.campo, { justificacion: ev.target.value })}
                      disabled={finalizando}
                    />
                  )}
                  {e.valor && !e.justificacion.trim() && <small className="sivu-insp-field__error">Escribe la justificación del ajuste.</small>}
                </div>
              );
            })}
          </div>
          {ajustesPendientesDeCalcular && (
            <p className="sivu-state" role="status">
              Recalcula para ver el efecto de los ajustes en la prioridad y las fechas antes de finalizar.
            </p>
          )}

          <h2 className="sivu-insp__subhead">Próximas fechas</h2>
          <p className="sivu-insp__intro">Vienen sugeridas según el nivel de riesgo. Si cambias alguna, justifícalo.</p>
          <div className="sivu-insp__grid">
            <div className="sivu-insp-field">
              <label htmlFor="fecha-proxima-inspeccion" className="sivu-insp-field__name">
                Próxima inspección
              </label>
              <input
                id="fecha-proxima-inspeccion"
                type="date"
                value={fechaInspeccion}
                onChange={(e) => setFechaInspeccion(e.target.value)}
                disabled={finalizando || calculo.fechas_sugeridas.fecha_proxima_inspeccion.inmediato_y_continuo}
              />
              <small className="sivu-insp-field__hint">Sugerida: {fechaSugeridaTexto(calculo.fechas_sugeridas.fecha_proxima_inspeccion)}</small>
            </div>
            <div className="sivu-insp-field">
              <label htmlFor="fecha-proximo-monitoreo" className="sivu-insp-field__name">
                Próximo monitoreo
              </label>
              <input
                id="fecha-proximo-monitoreo"
                type="date"
                value={fechaMonitoreo}
                onChange={(e) => setFechaMonitoreo(e.target.value)}
                disabled={finalizando || calculo.fechas_sugeridas.fecha_proximo_monitoreo.inmediato_y_continuo}
              />
              <small className="sivu-insp-field__hint">Sugerida: {fechaSugeridaTexto(calculo.fechas_sugeridas.fecha_proximo_monitoreo)}</small>
            </div>
            {(fechaInspeccionCambiada || fechaMonitoreoCambiada) && (
              <div className="sivu-insp-field">
                <label htmlFor="justificacion-fecha" className="sivu-insp-field__name">
                  Justificación del cambio de fecha
                </label>
                <textarea
                  id="justificacion-fecha"
                  rows={2}
                  value={justificacionFecha}
                  onChange={(e) => setJustificacionFecha(e.target.value)}
                  disabled={finalizando}
                />
                {fechasSinJustificar && <small className="sivu-insp-field__error">Escribe por qué cambias la fecha sugerida.</small>}
              </div>
            )}
          </div>
        </section>
      )}

      {final && (
        <section className={`card card--pad sivu-insp__section ${final.finalizada ? "sivu-insp__done" : ""}`} role="status">
          {final.finalizada ? (
            <>
              <h2>Inspección finalizada</h2>
              <p>
                Próxima inspección: {fechaChile(final.fecha_proxima_inspeccion)} · próximo monitoreo:{" "}
                {fechaChile(final.fecha_proximo_monitoreo)}.
              </p>
              <p className="sivu-insp__intro">Los datos pasan a vigentes cuando el Usuario municipal completa la OT.</p>
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
            <span>¿Finalizar la inspección? No se podrá editar después.</span>
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
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={calcular}
              disabled={!inspectionId || sinGuardar || calculando || finalizada || ajustesSinJustificar}
            >
              {calculando ? "Calculando…" : calculo && ajustesPendientesDeCalcular ? "Recalcular" : "Calcular"}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirmando(true)} disabled={!puedeFinalizar}>
              Finalizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function fechaSugeridaTexto(f: CalculoRespuesta["fechas_sugeridas"]["fecha_proxima_inspeccion"]): string {
  if (f.inmediato_y_continuo) return "inmediato y continuo";
  const rango = f.rango_fin && f.rango_fin !== f.rango_inicio ? ` (entre ${fechaChile(f.rango_inicio)} y ${fechaChile(f.rango_fin)})` : "";
  return `${fechaChile(f.fecha)}${rango}`;
}

/** Resultado de `/calcular`, con las etiquetas de los catálogos de la API. */
function ResultadoCalculo({
  calculo,
  finalizada,
  etiqueta,
  etiquetaCampo,
}: {
  calculo: CalculoRespuesta;
  finalizada: boolean;
  etiqueta: (catalogo: string, codigo: unknown) => string;
  etiquetaCampo: (campo: string) => string;
}) {
  const r = calculo.resultado;
  const filas: [string, string][] = [
    ["Nivel de riesgo", etiqueta("clasificacion_riesgo", calculo.nivel_riesgo)],
    ["Riesgo calculado", etiqueta("clasificacion_riesgo", r.clasificacion_riesgo_calculada)],
    ["Raíces y cuello", etiqueta("clasificacion_riesgo", r.clasificacion_raices_cuello)],
    ["Tronco", etiqueta("clasificacion_riesgo", r.clasificacion_tronco)],
    ["Copa y ramas", etiqueta("clasificacion_riesgo", r.clasificacion_copa_ramas)],
    ["Conflicto con la infraestructura", etiqueta("clasificacion_infraestructura", r.clasificacion_infraestructura_calculada)],
    ["Prioridad de intervención", etiqueta("clasificacion_prioridad", r.clasificacion_prioridad_calculada)],
  ];
  const ajustadas: [string, string][] = [
    ["Riesgo ajustado", etiqueta("clasificacion_riesgo", r.clasificacion_riesgo_ajustada)],
    ["Infraestructura ajustada", etiqueta("clasificacion_infraestructura", r.clasificacion_infraestructura_ajustada)],
    ["Prioridad ajustada", etiqueta("clasificacion_prioridad", r.clasificacion_prioridad_ajustada)],
  ].filter(([, v]) => v !== "—") as [string, string][];
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
              <a href={`#wrap-campo-${f.campo}`}>{etiquetaCampo(f.campo)}</a> — {f.motivo}
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
        {[...filas, ...ajustadas].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt>Próxima inspección sugerida</dt>
          <dd>{fechaSugeridaTexto(calculo.fechas_sugeridas.fecha_proxima_inspeccion)}</dd>
        </div>
        <div>
          <dt>Próximo monitoreo sugerido</dt>
          <dd>{fechaSugeridaTexto(calculo.fechas_sugeridas.fecha_proximo_monitoreo)}</dd>
        </div>
      </dl>
    </section>
  );
}
