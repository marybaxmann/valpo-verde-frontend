import { useEffect, useMemo, useRef, useState } from "react";
import type { AlcanceInspeccion } from "../types/inspection";
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
import { buscarEspeciesCatalogo } from "../api/species";
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
  ValorCampo,
  VistaFoto,
} from "../types/inspection";
import { InspectionField } from "../components/InspectionField";
import { tieneValor, tipoObligatoriedad } from "../lib/inspectionPresentacion";
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
import { fechaChile, hoyChile } from "../lib/dates";
import FechaInspeccion, { fechaInspeccionValida } from "../components/FechaInspeccion";
import { ordenarParaPresentacion } from "../lib/ordenFormulario";

/** Las cuatro vistas recomendadas de la evaluación completa (D-27); su etiqueta viene del catálogo `vista_foto`. */
const VISTAS: VistaFoto[] = ["arbol_completo", "base", "tronco", "copa"];
/** 037: etiqueta de foto complementaria. */
const VISTA_DETALLE: VistaFoto = "detalle";
const SIN_ETIQUETA = "sin_etiqueta";
type GrupoFoto = VistaFoto | typeof SIN_ETIQUETA;

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

function aplicaEnProtocolo(campo: CampoFormulario, palm01: boolean, tipoHoja: string | null): boolean {
  if (campo.desde_version === "3.4") return palm01 && tipoHoja === "palmera";
  return !(palm01 && tipoHoja === "palmera" && campo.no_aplica_palmera);
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
  const [tipoEspecie, setTipoEspecie] = useState<{ clave: string; tipo: string | null; error?: boolean } | null>(null);

  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [fechaTerreno, setFechaTerreno] = useState(hoyChile);
  const [alcance, setAlcance] = useState<AlcanceInspeccion>("ambos");
  const [fechaRegistro, setFechaRegistro] = useState<string | null>(null);
  const [valores, setValores] = useState<ValoresCrudos>({});
  const [finalizadasPrevias, setFinalizadasPrevias] = useState(0);
  const [sinGuardar, setSinGuardar] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [guardadoError, setGuardadoError] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState<string | null>(null);

  const [fotos, setFotos] = useState<FotoInspeccion[] | null>(null);
  const [fotosError, setFotosError] = useState<string | null>(null);
  // Cada vista sube y elimina por su cuenta: una foto en curso no bloquea las otras vistas.
  const [subiendo, setSubiendo] = useState<ReadonlySet<GrupoFoto>>(new Set());
  const [porEliminar, setPorEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [erroresFoto, setErroresFoto] = useState<Partial<Record<GrupoFoto, string>>>({});
  const listadoFotos = useRef(0);
  const ediciones = useRef(0);
  const cambiosDesdeCalculo = useRef(0);

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
        setFechaTerreno(borrador?.fecha_inspeccion ?? hoyChile());
        setAlcance(borrador?.alcance_inspeccion ?? "ambos");
        setFechaRegistro(borrador?.fecha_registro ?? null);
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

  const admiteAlcance = !!esquema?.campos_infraestructura &&
    (ot?.accion.codigo === "evaluacion_inicial" || ot?.accion.codigo === "reevaluacion");
  const alcanceActivo = admiteAlcance ? alcance : "ambos";
  const palm01 = esquema?.rule_version === "3.4";
  const projectId = ot?.proyecto.id;
  const especieEscrita = valores.especie_cientifica;
  const especie = (typeof especieEscrita === "string" ? especieEscrita.trim() : "") ||
    ot?.arbol?.especie_cientifica?.trim() || "";
  const claveEspecie = alcanceActivo !== "infraestructura" && projectId && especie.length >= 2 ? `${projectId}/${especie.toLowerCase()}` : "";
  useEffect(() => {
    if (!palm01 || !projectId || !claveEspecie) return;
    let cancelado = false;
    const timer = window.setTimeout(() => {
      buscarEspeciesCatalogo(projectId, especie)
        .then((candidatas) => {
          const exacta = candidatas.find((c) => c.especie_cientifica.trim().toLowerCase() === especie.toLowerCase());
          if (!cancelado) setTipoEspecie({ clave: claveEspecie, tipo: exacta?.tipo_hoja ?? null });
        })
        .catch(() => {
          if (!cancelado) setTipoEspecie({ clave: claveEspecie, tipo: null, error: true });
        });
    }, 250);
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [palm01, projectId, claveEspecie, especie]);

  const tipoHoja = palm01 && tipoEspecie?.clave === claveEspecie ? tipoEspecie.tipo : null;
  const especieSinResolver = palm01 && Boolean(claveEspecie) &&
    (tipoEspecie?.clave !== claveEspecie || tipoEspecie?.error === true);
  const contexto = useMemo(() => ({ tipo_hoja: tipoHoja }), [tipoHoja]);
  const camposArbol = useMemo(
    () => alcanceActivo === "infraestructura" ? [] :
      ordenar((esquema?.campos_arbol ?? []).filter((c) => aplicaEnProtocolo(c, palm01, tipoHoja))),
    [esquema, alcanceActivo, palm01, tipoHoja],
  );
  const variables = useMemo(() => {
    if (!esquema) return [];
    const infraestructura = new Set(esquema.campos_infraestructura);
    return ordenar(esquema.variables.filter(c => aplicaEnProtocolo(c, palm01, tipoHoja) &&
      (alcanceActivo === "ambos" || infraestructura.has(c.identificador) === (alcanceActivo === "infraestructura"))));
  }, [esquema, alcanceActivo, palm01, tipoHoja]);
  const todos = useMemo(() => [...camposArbol, ...variables], [camposArbol, variables]);
  const grupos = useMemo(() => ordenarParaPresentacion(todos, esquema?.secciones ?? []), [todos, esquema]);
  const etiquetaDe = useMemo(() => new Map(todos.map((c) => [c.identificador, c.etiqueta])), [todos]);
  const convertidos = useMemo(() => ({ ...contexto, ...valoresConvertidos(todos, valores) }), [contexto, todos, valores]);
  const faltantes = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of calculo?.campos_faltantes ?? []) m.set(f.campo, f.motivo);
    return m;
  }, [calculo]);
  // Etapa visible del formulario (una a la vez); null = la primera disponible.
  const [etapa, setEtapa] = useState<string | null>(null);
  const hayInvalidos = todos.some((c) => valorInvalido(c, valores[c.identificador]));
  const finalizada = final?.finalizada === true;
  // Guardar no bloquea los campos: lo escrito durante el guardado queda como «sin guardar».
  const bloqueado = finalizando || finalizada;
  const hoy = hoyChile();
  const fechaMaxima = fechaRegistro && fechaRegistro < hoy ? fechaRegistro : hoy;
  const fechaInvalida = !fechaInspeccionValida(fechaTerreno, fechaMaxima);

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
  const fechaInspeccionCambiada = alcanceActivo !== "infraestructura" && !!fechaInspeccion && fechaInspeccion !== sugeridaInspeccion;
  const fechaMonitoreoCambiada = alcanceActivo !== "infraestructura" && !!fechaMonitoreo && fechaMonitoreo !== sugeridaMonitoreo;
  const fechasSinJustificar = (fechaInspeccionCambiada || fechaMonitoreoCambiada) && !justificacionFecha.trim();

  /** Cambia de etapa sin tocar los valores (viven en esta página) y vuelve al inicio de la etapa. */
  function irAEtapa(id: string, enfocar?: string) {
    setEtapa(id);
    requestAnimationFrame(() => {
      const campo = enfocar ? document.getElementById(enfocar) : null;
      if (campo) {
        campo.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      // Vuelve al inicio de la etapa solo si quedó arriba de la pantalla.
      const inicio = document.getElementById("etapa-actual");
      if (inicio && inicio.getBoundingClientRect().top < 0) inicio.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function invalidarCalculo() {
    cambiosDesdeCalculo.current += 1;
    setCalculo(null); // la huella ya no corresponde
    setConfirmando(false);
  }

  function cambiar(id: string, v: ValorCrudo) {
    setValores((prev) => ({ ...prev, [id]: v }));
    ediciones.current += 1;
    setSinGuardar(true);
    setGuardadoOk(null);
    invalidarCalculo();
  }

  async function guardar() {
    if (especieSinResolver) {
      setGuardadoError(tipoEspecie?.error
        ? "No se pudo consultar el catálogo de especies. Vuelve a abrir el formulario para reintentar."
        : "Espera a que se verifique la especie en el catálogo.");
      return;
    }
    if (!esquema || !ot || hayInvalidos || fechaInvalida || bloqueado) return;
    setGuardando(true);
    setGuardadoError(null);
    setGuardadoOk(null);
    const edicionesAlGuardar = ediciones.current;
    try {
      const body = armarBody(
        variables, camposArbol, valores, ot.accion.codigo, ot.subtipo?.codigo ?? null, fechaTerreno, contexto,
      );
      if (admiteAlcance) body.alcance_inspeccion = alcanceActivo;
      const res = inspectionId ? await guardarBorrador(inspectionId, body) : await crearBorrador(workOrderId, body);
      if (!inspectionId) setFechaRegistro(hoy);
      setInspectionId(res.inspection_id);
      const editadoMientras = ediciones.current !== edicionesAlGuardar;
      setSinGuardar(editadoMientras);
      invalidarCalculo();
      setGuardadoOk(editadoMientras ? "Borrador guardado. Hay cambios posteriores sin guardar." : "Borrador guardado.");
    } catch (err) {
      setGuardadoError(mensaje(err, "No se pudo guardar el borrador."));
    } finally {
      setGuardando(false);
    }
  }

  /** Con varias vistas en curso, solo se aplica el listado pedido más recientemente. */
  async function recargarFotos(id: string) {
    const n = ++listadoFotos.current;
    const lista = await listarFotos(id);
    if (n === listadoFotos.current) setFotos(lista);
  }

  function errorFoto(vista: GrupoFoto, texto: string | null) {
    setErroresFoto((e) => ({ ...e, [vista]: texto ?? undefined }));
  }

  async function subir(vista: GrupoFoto, archivo: File | undefined) {
    if (!archivo || !inspectionId) return;
    setSubiendo((s) => new Set(s).add(vista));
    errorFoto(vista, null);
    try {
      await subirFoto(inspectionId, vista === SIN_ETIQUETA ? undefined : vista, archivo);
      invalidarCalculo();
      await recargarFotos(inspectionId);
    } catch (err) {
      errorFoto(vista, mensaje(err, "No se pudo subir la foto."));
    } finally {
      setSubiendo((s) => {
        const n = new Set(s);
        n.delete(vista);
        return n;
      });
    }
  }

  async function quitarFoto(vista: GrupoFoto, photoId: string) {
    if (!inspectionId) return;
    setEliminando(photoId);
    errorFoto(vista, null);
    try {
      await eliminarFoto(inspectionId, photoId);
      setPorEliminar(null);
      invalidarCalculo();
      await recargarFotos(inspectionId);
    } catch (err) {
      errorFoto(vista, mensaje(err, "No se pudo eliminar la foto."));
    } finally {
      setEliminando(null);
    }
  }

  async function calcular() {
    if (!inspectionId || ajustesSinJustificar) return;
    setCalculando(true);
    setCalculoError(null);
    const cambiosAlCalcular = cambiosDesdeCalculo.current;
    try {
      const res = await calcularInspeccion(inspectionId, ajustesBody);
      // Si mientras tanto cambió un campo o una foto, ese resultado ya no corresponde.
      if (cambiosDesdeCalculo.current !== cambiosAlCalcular) return;
      setCalculo(res);
      irAEtapa("sec-resultado");
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
        <Link to="/inspector/projects" className="sivu-insp__back">
          <Icon name="arrow-left" size={14} /> Mis proyectos
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

  // Etapas (maqueta «Evaluación guiada SIVU»): cada sección de presentación es
  // una etapa; si con las respuestas actuales ningún campo suyo aplica, queda
  // como «No aplica» (no se navega). Luego Fotografías, Revisión y, tras
  // calcular, Resultado y Ajustes.
  const seccionesTodas = grupos.map(({ seccion, bloques }) => ({
    seccion,
    bloques: bloques
      .map((b) => ({ ...b, campos: b.campos.filter((c) => cumple(c.condicion_activacion, convertidos)) }))
      .filter((b) => b.campos.length > 0),
  }));
  const seccionesVisibles = seccionesTodas.filter((g) => g.bloques.length > 0);
  // Avance: solo campos aplicables (visibles), obligatorios o condicionales, ya respondidos.
  // Es una guía; qué falta oficialmente lo dice el backend al calcular.
  const avanceDe = (campos: CampoFormulario[]) => {
    const cuentan = campos.filter((c) => tipoObligatoriedad(c.obligatoriedad) !== "opcional" && c.obligatoriedad);
    return { total: cuentan.length, hechas: cuentan.filter((c) => tieneValor(valores[c.identificador])).length };
  };
  const etapasDatos: Etapa[] = seccionesTodas.map(({ seccion, bloques }) => ({
    id: `sec-${seccion.codigo}`,
    etiqueta: seccion.etiqueta,
    tipo: "datos",
    sub: SUBTITULO_ETAPA[seccion.codigo] ?? null,
    na: bloques.length === 0,
    campos: bloques.flatMap((b) => b.campos.map((c) => c.identificador)),
    avance: avanceDe(bloques.flatMap((b) => b.campos)),
    faltan: 0,
  }));
  const extra = (id: string, etiqueta: string, tipo: Etapa["tipo"], sub: string, campos: string[] = []): Etapa => ({
    id, etiqueta, tipo, sub, na: false, campos, avance: null, faltan: 0,
  });
  const etapas: Etapa[] = [
    ...etapasDatos,
    extra("sec-fotografias", "Fotografías", "fotos", "Fotografías de esta inspección. Puedes volver a cualquier etapa sin perder lo respondido.", ["fotografias_arbol"]),
    extra("sec-revision", "Revisión", "revision", "Revisa qué falta antes de calcular y finalizar. Toca una etapa para volver a ella."),
    ...(calculo ? [extra("sec-resultado", "Resultado", "resultado", "Resultado que entrega SIVU con las reglas vigentes.")] : []),
    ...(calculo && calculo.puede_finalizar && !finalizada
      ? [extra("sec-ajustes", "Ajustes", "ajustes", "Opcional: ajusta la categoría con tu criterio técnico y revisa las próximas fechas.")]
      : []),
  ].map((e) => ({ ...e, faltan: e.campos.filter((c) => faltantes.has(c)).length }));
  const flujo = etapas.filter((e) => !e.na);
  const conAvance = flujo.filter((e) => e.avance && e.avance.total > 0);
  const totalPreguntas = conAvance.reduce((s, e) => s + (e.avance?.total ?? 0), 0);
  const totalHechas = conAvance.reduce((s, e) => s + (e.avance?.hechas ?? 0), 0);
  const etapasListas = conAvance.filter((e) => e.avance && e.avance.hechas === e.avance.total).length;
  const pct = totalPreguntas ? Math.round((totalHechas / totalPreguntas) * 100) : 0;
  const activa = flujo.find((e) => e.id === etapa)?.id ?? flujo[0].id;
  const iActiva = flujo.findIndex((e) => e.id === activa);
  const etapaActiva = flujo[iActiva];
  const anterior = flujo[iActiva - 1];
  const siguiente = flujo[iActiva + 1];
  const pendientes = totalPreguntas - totalHechas;
  /** Desde la lista de faltantes: abre la etapa del campo y lo centra. */
  const irACampo = (campo: string) => {
    const destino = etapas.find((e) => e.campos.includes(campo));
    if (destino) irAEtapa(destino.id, campo === "fotografias_arbol" ? undefined : `wrap-campo-${campo}`);
  };

  return (
    <div className="sivu-insp sivu-insp--guiada">
      <Link to={`/inspector/projects/${ot.proyecto.id}/ot-inspeccion`} className="sivu-insp__back">
        <Icon name="arrow-left" size={14} /> Inspección
      </Link>
      <header className="page-header sivu-insp__cabecera">
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

{admiteAlcance && (
      <section className="card card--pad sivu-insp__section">
          <label>
            Alcance de la inspección
            <select value={alcance} disabled={bloqueado} onChange={event => {
              setAlcance(event.target.value as AlcanceInspeccion);
              ediciones.current += 1;
              setSinGuardar(true);
              setGuardadoOk(null);
              invalidarCalculo();
            }}>
              <option value="ambos">Árbol e infraestructura</option>
              <option value="arbol">Árbol</option>
              <option value="infraestructura">Infraestructura</option>
            </select>
          </label>
      </section>
      )}

      <div className="sivu-insp__layout">
      <RecorridoEtapas
        etapas={etapas}
        flujo={flujo}
        activa={activa}
        onElegir={(id) => irAEtapa(id)}
        pct={pct}
        partes={`${etapasListas} de ${conAvance.length} etapas listas`}
        detalle={pendientes > 0 ? `Faltan ${pendientes} respuestas` : "Todo respondido: ya puedes calcular"}
        fotos={fotos?.length ?? 0}
      />

      <div className="sivu-insp__main">
      <EncabezadoEtapa etapa={etapaActiva} n={iActiva + 1} total={flujo.length} />

      {seccionesVisibles.map(({ seccion, bloques: visibles }) => {
        if (`sec-${seccion.codigo}` !== activa) return null;
        return (
          <section key={seccion.codigo} id={`sec-${seccion.codigo}`} className="sivu-insp__section sivu-insp__etapa">
            {/* Fecha de terreno (PR #39): va en la primera etapa, antes de las preguntas. */}
            {activa === flujo[0].id && (
              <div className="card sivu-insp__block sivu-insp__fecha">
                <FechaInspeccion
                  valor={fechaTerreno}
                  maximo={fechaMaxima}
                  bloqueada={bloqueado}
                  cambiar={(fecha) => {
                    setFechaTerreno(fecha);
                    ediciones.current += 1;
                    setSinGuardar(true);
                    setGuardadoOk(null);
                    invalidarCalculo();
                  }}
                />
              </div>
            )}
            {visibles.map((b, i) => (
            <div key={b.subtitulo ?? i} className="card sivu-insp__block">
            {b.subtitulo && <h3 className="sivu-insp__subhead">{b.subtitulo}</h3>}
            <div className="sivu-insp__grid">
              {b.campos.map((c) => (
                <InspectionField
                  key={c.identificador}
                  campo={c}
                  valor={valores[c.identificador]}
                  onChange={(v) => cambiar(c.identificador, v)}
                  disabled={bloqueado}
                  referencia={referenciaArbol(ot, c.identificador)}
                  faltante={faltantes.get(c.identificador)}
                  projectId={ot.proyecto.id}
                />
              ))}
            </div>
            </div>
            ))}
          </section>
        );
      })}

      {activa === "sec-fotografias" && (
      <section id="sec-fotografias" className="card card--pad sivu-insp__section">
        <h2>Fotografías</h2>
        <p className="sivu-insp__intro">
          Para finalizar una Evaluación inicial, Reevaluación o Levantamiento se requieren al menos dos fotos válidas y distintas de esta inspección. Las vistas de árbol completo, base, tronco y copa son recomendadas. JPG o PNG, hasta 10 MB. Mientras la inspección esté en borrador, una foto subida por error se puede eliminar.
        </p>
        {!inspectionId ? (
          <p className="sivu-state">Guarda el borrador para poder subir las fotos.</p>
        ) : (
          <div className="sivu-insp__photos">
            {([...VISTAS, VISTA_DETALLE, SIN_ETIQUETA] as const).map((v) => {
              const deVista = (fotos ?? []).filter((f) => f.vista === (v === SIN_ETIQUETA ? null : v));
              const ultima = deVista[deVista.length - 1];
              const opcional = v === VISTA_DETALLE;
              const nombre = v === SIN_ETIQUETA ? "Sin etiqueta" : opcional ? `${etiqueta("vista_foto", v)} (opcional)` : etiqueta("vista_foto", v);
              return (
                <div key={v} className="sivu-insp__photo">
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
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => void quitarFoto(v, f.id)} disabled={eliminando === f.id}>
                                {eliminando === f.id ? "Eliminando…" : "Sí, eliminar"}
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPorEliminar(null)} disabled={eliminando === f.id}>
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setPorEliminar(f.id)}
                              disabled={subiendo.has(v) || eliminando !== null}
                            >
                              Eliminar
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="btn btn-secondary btn-sm">
                    {subiendo.has(v) ? "Subiendo…" : ultima ? "Agregar otra" : "Subir foto"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      hidden
                      disabled={subiendo.has(v) || finalizada}
                      onChange={(e) => {
                        void subir(v, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {erroresFoto[v] && (
                    <p className="sivu-state sivu-state--error" role="alert">
                      <Icon name="alert" size={13} /> {erroresFoto[v]}
                    </p>
                  )}
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
      )}

      {calculo && activa === "sec-resultado" && (
        <ResultadoCalculo
          calculo={calculo}
          finalizada={!!final}
          etiqueta={etiqueta}
          etiquetaCampo={(c) => etiquetaDe.get(c) ?? (c === "fotografias_arbol" ? "Fotografías del árbol" : nombreLegible(c))}
          onIrACampo={irACampo}
        />
      )}

      {calculo && calculo.puede_finalizar && !finalizada && activa === "sec-ajustes" && (
        <section id="sec-ajustes" className="card card--pad sivu-insp__section">
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
                disabled={alcanceActivo === "infraestructura" || finalizando || calculo.fechas_sugeridas.fecha_proxima_inspeccion.inmediato_y_continuo}
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
                disabled={alcanceActivo === "infraestructura" || finalizando || calculo.fechas_sugeridas.fecha_proximo_monitoreo.inmediato_y_continuo}
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

      {activa === "sec-revision" && (
        <section id="sec-revision" className="sivu-insp__section sivu-insp__revision">
          <div className="card sivu-insp__block">
            {flujo
              .filter((e) => e.tipo === "datos" || e.tipo === "fotos")
              .map((e) => {
                const lista = e.tipo === "fotos" ? (fotos?.length ?? 0) > 0 && e.faltan === 0 : !!e.avance && e.avance.hechas === e.avance.total && e.faltan === 0;
                const faltanRespuestas = e.avance ? e.avance.total - e.avance.hechas : 0;
                const texto =
                  e.tipo === "fotos"
                    ? `${fotos?.length ?? 0} foto(s) subida(s)`
                    : e.faltan > 0
                    ? `Faltan ${e.faltan} según el cálculo`
                    : lista
                    ? "Lista"
                    : `Faltan ${faltanRespuestas}`;
                return (
                  <div key={e.id} className="sivu-insp__revision-fila">
                    <span className={`sivu-insp__nodo ${lista ? "is-lista" : ""}`} aria-hidden="true">
                      {lista ? <Icon name="check" size={13} /> : flujo.indexOf(e) + 1}
                    </span>
                    <span className="sivu-insp__revision-nombre">{e.etiqueta}</span>
                    <span className={`sivu-insp__chip ${lista ? "is-ok" : "is-falta"}`}>{texto}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => irAEtapa(e.id)}>
                      Ir
                    </button>
                  </div>
                );
              })}
          </div>
          <div className="sivu-insp__revision-nota">
            <strong>{calculo ? "Ya calculaste esta inspección" : "Cuando termines, calcula"}</strong>
            <span>
              {calculo
                ? "El resultado está en la etapa Resultado. Si cambias una respuesta, vuelve a calcular."
                : "«Calcular» aplica las reglas vigentes de SIVU y muestra el resultado o lo que falte. Primero guarda el borrador."}
            </span>
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
          {!hayInvalidos && !fechaInvalida && !guardadoError && !calculoError && !finalError && !guardadoOk && !sinGuardar && (
            <span className="sivu-insp__bar-falta">
              <span className={`sivu-insp__punto ${pendientes > 0 ? "is-falta" : "is-ok"}`} aria-hidden="true" />
              {pendientes > 0 ? `Faltan ${pendientes} respuestas` : "Todo respondido"}
            </span>
          )}
          {hayInvalidos && <span className="sivu-state--error">Hay números mal escritos.</span>}
          {fechaInvalida && <span className="sivu-state--error">Revisa la fecha de inspección (etapa {flujo[0].etiqueta}).</span>}
          {guardadoError && <span className="sivu-state--error">{guardadoError}</span>}
          {calculoError && <span className="sivu-state--error">{calculoError}</span>}
          {finalError && <span className="sivu-state--error">{finalError}</span>}
          {!guardadoError && guardadoOk && <span className="sivu-state--ok">{guardadoOk}</span>}
          {sinGuardar && !guardadoError && <span>Cambios sin guardar.</span>}
        </div>
        <div className="sivu-insp__bar-fila">
        {anterior ? (
          <button
            type="button"
            className="btn btn-ghost sivu-insp__paso-ant"
            onClick={() => irAEtapa(anterior.id)}
            aria-label={`Etapa anterior: ${anterior.etiqueta}`}
            title={`Etapa anterior: ${anterior.etiqueta}`}
          >
            <Icon name="arrow-left" size={16} />
          </button>
        ) : (
          <span className="sivu-insp__paso-ant is-vacio" aria-hidden="true" />
        )}
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={guardar} disabled={bloqueado || guardando || hayInvalidos || fechaInvalida || (!sinGuardar && !!inspectionId)}>
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
        {siguiente && (
          <button type="button" className="btn btn-primary sivu-insp__paso-sig" onClick={() => irAEtapa(siguiente.id)}>
            Siguiente · {siguiente.etiqueta} <Icon name="arrow-right" size={14} />
          </button>
        )}
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}

/** Una línea por etapa de presentación (maqueta aprobada); sin texto, la etapa no lleva bajada. */
const SUBTITULO_ETAPA: Record<string, string> = {
  identificacion: "Dónde está el árbol y qué especie es.",
  medidas: "Tamaño del árbol y de su copa. Si algo no existe, márcalo en «no presenta».",
  zona_objetivo: "Qué hay bajo el árbol y con qué frecuencia se ocupa.",
  raices_cuello: "Revisa la base del árbol. Las preguntas de detalle aparecen solo cuando corresponden.",
  tronco: "Cavidades, heridas, grietas y uniones del tronco.",
  copa_ramas: "Ramas, follaje y estructura de la copa.",
  tutorado: "Aparece solo cuando corresponde según las medidas del árbol.",
  infraestructura: "Lo que rodea al árbol: vereda, calzada, suelo, elementos verticales y redes.",
};

type Etapa = {
  id: string;
  etiqueta: string;
  tipo: "datos" | "fotos" | "revision" | "resultado" | "ajustes";
  /** Bajada de la etapa (maqueta aprobada). */
  sub: string | null;
  /** Ningún campo de la etapa aplica con las respuestas actuales. */
  na: boolean;
  campos: string[];
  /** Faltantes que devolvió /calcular en esta etapa. */
  faltan: number;
  /** Preguntas aplicables obligatorias o condicionales y cuántas tienen respuesta. */
  avance: { total: number; hechas: number } | null;
};

const etapaLista = (e: Etapa) => !!e.avance && e.avance.total > 0 && e.avance.hechas === e.avance.total && e.faltan === 0;

/** Encabezado de la etapa activa: «Parte N de M», título, bajada y avance de la etapa. */
function EncabezadoEtapa({ etapa, n, total }: { etapa: Etapa; n: number; total: number }) {
  const a = etapa.avance;
  const pct = a && a.total ? Math.round((a.hechas / a.total) * 100) : 100;
  return (
    <header className="sivu-insp__etapa-head" id="etapa-actual">
      <span className="sivu-insp__etapa-n">
        Parte {n} de {total}
      </span>
      <h2>{etapa.etiqueta}</h2>
      {etapa.sub && <p className="sivu-insp__etapa-sub">{etapa.sub}</p>}
      {a && a.total > 0 && (
        <div className="sivu-insp__etapa-avance">
          <div className="sivu-insp__barra" role="progressbar" aria-valuemin={0} aria-valuemax={a.total} aria-valuenow={a.hechas} aria-label="Respuestas de esta etapa">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span>
            {a.hechas} de {a.total} respuestas{a.hechas === a.total ? " · ¡etapa lista!" : ` · faltan ${a.total - a.hechas}`}
          </span>
        </div>
      )}
    </header>
  );
}

/**
 * Recorrido de etapas (maqueta aprobada): en escritorio, panel lateral con el
 * anillo de avance general y la lista vertical de etapas (lista, actual, por
 * hacer, no aplica). En pantallas angostas se resume en una barra segmentada
 * con «Ver etapas». Solo cambia lo que se ve; los valores siguen en la página.
 */
function RecorridoEtapas({
  etapas,
  flujo,
  activa,
  onElegir,
  pct,
  partes,
  detalle,
  fotos,
}: {
  etapas: Etapa[];
  flujo: Etapa[];
  activa: string;
  onElegir: (id: string) => void;
  pct: number;
  partes: string;
  detalle: string;
  fotos: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const circ = 2 * Math.PI * 26;
  const actual = flujo.find((e) => e.id === activa);
  const nActual = flujo.findIndex((e) => e.id === activa) + 1;
  const meta = (e: Etapa): string => {
    if (e.na) return "No aplica con las respuestas actuales";
    if (e.tipo === "fotos") return fotos ? `${fotos} foto(s) subida(s)` : "Sin fotografías aún";
    if (e.tipo === "revision") return detalle;
    if (e.tipo === "resultado") return "Del último cálculo";
    if (e.tipo === "ajustes") return "Opcional";
    if (e.faltan > 0) return `Faltan ${e.faltan} según el cálculo`;
    if (!e.avance || e.avance.total === 0) return "Solo preguntas opcionales";
    return e.avance.hechas === e.avance.total ? `Lista · ${e.avance.total} respuestas` : `${e.avance.hechas} de ${e.avance.total} respondidas`;
  };
  const lista = (
    <ol className="sivu-insp__etapas">
      {etapas.map((e) => {
        const n = flujo.indexOf(e) + 1;
        const esActual = e.id === activa;
        const hecha = e.tipo === "fotos" ? fotos > 0 && e.faltan === 0 : etapaLista(e);
        const estado = e.na ? "is-na" : esActual ? "is-actual" : hecha ? "is-lista" : "";
        return (
          <li key={e.id}>
            <button
              type="button"
              className={`sivu-insp__etapa-item ${estado}`}
              aria-current={esActual ? "step" : undefined}
              disabled={e.na}
              onClick={() => {
                onElegir(e.id);
                setAbierto(false);
              }}
            >
              <span className="sivu-insp__nodo" aria-hidden="true">
                {e.na ? "–" : hecha && !esActual ? <Icon name="check" size={13} /> : n}
              </span>
              <span className="sivu-insp__etapa-txt">
                <span className="sivu-insp__etapa-nombre">{e.etiqueta}</span>
                <span className="sivu-insp__etapa-meta">{meta(e)}</span>
              </span>
              {e.faltan > 0 && (
                <span className="sivu-insp__indice-falta" aria-label={`faltan ${e.faltan} según el cálculo`}>
                  {e.faltan}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
  return (
    <aside className="sivu-insp__recorrido" aria-label="Etapas de la evaluación">
      <div className="sivu-insp__progreso">
        <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`Avance ${pct} por ciento`}>
          <circle cx="32" cy="32" r="26" className="sivu-insp__anillo-fondo" />
          <circle
            cx="32"
            cy="32"
            r="26"
            className="sivu-insp__anillo"
            strokeDasharray={`${(pct / 100) * circ} ${circ}`}
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="37" textAnchor="middle" className="sivu-insp__anillo-txt">
            {pct}%
          </text>
        </svg>
        <div className="sivu-insp__progreso-txt">
          <strong>{partes}</strong>
          <span>{detalle}</span>
        </div>
      </div>

      {/* Escritorio: lista vertical siempre visible. */}
      <div className="sivu-insp__recorrido-lista">{lista}</div>

      {/* Pantalla angosta: barra segmentada y lista desplegable. */}
      <div className="sivu-insp__recorrido-movil">
        <div className="sivu-insp__segmentos" aria-hidden="true">
          {flujo.map((e) => (
            <span
              key={e.id}
              className={e.id === activa ? "is-actual" : (e.tipo === "fotos" ? fotos > 0 : etapaLista(e)) ? "is-lista" : ""}
            />
          ))}
        </div>
        <button type="button" className="sivu-insp__ver-etapas" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
          <span>
            Parte {nActual} de {flujo.length} · {actual?.etiqueta}
          </span>
          <span className="sivu-insp__ver-etapas-pct">
            {pct}% · {abierto ? "Ocultar" : "Ver etapas"}
          </span>
        </button>
        {abierto && lista}
      </div>
    </aside>
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
  onIrACampo,
}: {
  calculo: CalculoRespuesta;
  finalizada: boolean;
  etiqueta: (catalogo: string, codigo: unknown) => string;
  etiquetaCampo: (campo: string) => string;
  /** Abre la etapa del campo faltante. */
  onIrACampo: (campo: string) => void;
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
    <section id="sec-resultado" className="card card--pad sivu-insp__section" aria-live="polite">
      <h2>Resultado del cálculo</h2>
      <p className={calculo.puede_finalizar ? "sivu-state sivu-state--ok" : "sivu-state"}>
        {finalizada
          ? "Inspección finalizada con este resultado."
          : calculo.puede_finalizar
          ? "La inspección está completa y se puede finalizar."
          : `Faltan ${calculo.campos_faltantes.length} dato(s) para finalizar.`}
      </p>
      {calculo.fotos_validas_d27 != null && (
        <p>Fotografías válidas y distintas: {calculo.fotos_validas_d27} (mínimo 2).</p>
      )}
      {!!calculo.vistas_recomendadas_faltantes?.length && (
        <p>
          Vistas recomendadas sin etiqueta registrada:{" "}
          {calculo.vistas_recomendadas_faltantes.map((vista) => etiqueta("vista_foto", vista)).join(", ")}.
        </p>
      )}
      {calculo.campos_faltantes.length > 0 && (
        <ul className="sivu-insp__missing">
          {calculo.campos_faltantes.map((f) => (
            <li key={`${f.hoja}-${f.campo}`}>
              <a
                href={`#wrap-campo-${f.campo}`}
                onClick={(e) => {
                  e.preventDefault();
                  onIrACampo(f.campo);
                }}
              >
                {etiquetaCampo(f.campo)}
              </a>{" "}
              — {f.motivo}
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
