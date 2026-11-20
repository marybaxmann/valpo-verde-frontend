import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { basePathForRole } from "../lib/roles";
import { listarDiagnosticos } from "../api/diagnosticos";
import { obtenerFichaArbol } from "../api/fichaArbol";
import { obtenerCatalogos } from "../api/catalogs";
import type { ArbolInventario } from "../types/inventory";
import type { Diagnostico } from "../types/diagnostico";
import type { OtListada } from "../types/workOrder";
import type { FichaArbol, VersionHistorial } from "../types/fichaArbol";
import { colorEstadoInc } from "../lib/incidencias";
import { ClassificationBadge, getClassificationTone } from "./ClassificationBadge";
import { Icon } from "./Icons";
import { TreeDiagnosis, TreeGlyph } from "./TreeDiagnosis";
import { TreePhotos } from "./TreePhotos";
import { fechaChile } from "../lib/dates";

export type TabFicha = "resumen" | "medicion" | "riesgo" | "infra" | "gestion";
type Tab = TabFicha;

const TABS: { value: Tab; label: string }[] = [
  { value: "resumen", label: "Resumen" },
  { value: "medicion", label: "Medición" },
  { value: "riesgo", label: "Riesgo" },
  { value: "infra", label: "Infra." },
  { value: "gestion", label: "Gestión" },
];

/** Componentes de infraestructura del resultado (`indicadores`, R04/M04), en el orden de la maqueta. */
const COMPONENTES_INFRA: [string, string][] = [
  ["vereda", "Acera / vereda"],
  ["alcorque", "Alcorque / superficie de plantación"],
  ["calzada", "Calzada"],
  ["redAerea", "Red aérea"],
  ["redSubterranea", "Red subterránea"],
  ["infraestructuraVertical", "Infraestructura vertical"],
];

type IndicadorInfra = { categoria?: string | null; motivo?: string | null } | undefined;

type Datos = { treeId: string; diag: Diagnostico | null; ficha: FichaArbol } | { treeId: string; error: string };

/** Número de un valor de la ficha (la API puede entregar numeric como texto). */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}
const conUnidad = (v: unknown, unidad: string) => {
  const n = num(v);
  return n === null ? null : `${n.toLocaleString("es-CL")} ${unidad}`;
};
const etiqueta = (v: unknown) => (v && typeof v === "object" && "etiqueta" in v ? ((v as { etiqueta: string | null }).etiqueta ?? null) : null);

/** Versiones (alta o inspección vigente) que registraron DAP, altura o copa, de la más reciente a la más antigua. */
function historialMedidas(h: VersionHistorial[]) {
  return [...h]
    .reverse()
    .map((v) => ({
      clave: `${v.origen}-${v.inspection_id ?? v.vigente_desde ?? ""}`,
      fecha: v.fecha_inspeccion ?? v.vigente_desde,
      origen: v.origen === "alta" ? "Alta" : v.codigo_inspeccion ?? "Inspección",
      dap: conUnidad(v.valores.dap_cm, "cm"),
      altura: conUnidad(v.valores.altura_total_m, "m"),
      // La versión guarda lo observado (N-S y E-O); el diámetro promedio solo existe como valor vigente.
      copa:
        conUnidad(v.valores.diametro_copa_m, "m") ??
        (num(v.valores.diametro_copa_ns_m) !== null && num(v.valores.diametro_copa_eo_m) !== null
          ? `${num(v.valores.diametro_copa_ns_m)!.toLocaleString("es-CL")} × ${num(v.valores.diametro_copa_eo_m)!.toLocaleString("es-CL")} m`
          : null),
    }))
    .filter((v) => v.dap || v.altura || v.copa);
}

/**
 * Ficha del árbol con pestañas (maqueta SIVU Lab: `TreeSheet`; CC-057,
 * reescrita con datos según CC-058). Cada pestaña muestra lo que entrega la
 * API: el árbol (B1), su evaluación vigente (B18), sus fotos y, de la ficha
 * completa (B2), las medidas vigentes con su historial, las OT y las
 * incidencias del árbol. Sin valor se muestra «Sin registro»: no se simula.
 */
export function TreeSheet({
  projectId,
  arbol,
  cicloVida,
  onClose,
  initialTab = "resumen",
  drawer = false,
}: {
  projectId: string;
  arbol: ArbolInventario;
  /** Etiqueta del ciclo de vida (la resuelve el inventario con el catálogo). */
  cicloVida: string;
  onClose: () => void;
  /** Pestaña con la que abre (Riesgo Arbóreo abre en «Riesgo»; Infraestructura, en «Infra.»). */
  initialTab?: Tab;
  /** Cajón a la derecha de la pantalla, con su propio desplazamiento (maqueta: `.sheet`). */
  drawer?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { profile } = useAuth();
  const historial = `${basePathForRole(profile?.role)}/projects/${projectId}/arboles/${arbol.id}`;
  const [categorias, setCategorias] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    obtenerCatalogos()
      .then((c) => {
        if (!cancelled) setCategorias(Object.fromEntries((c.categoria_infraestructura ?? []).map((i) => [i.codigo, i.etiqueta])));
      })
      .catch(() => {
        // Sin catálogo se muestra el código.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listarDiagnosticos(projectId, arbol.id), obtenerFichaArbol(projectId, arbol.id)])
      .then(([diags, ficha]) => {
        if (cancelled) return;
        setDatos({ treeId: arbol.id, diag: diags.find((d) => d.tree_id === arbol.id) ?? null, ficha });
      })
      .catch((err: unknown) => {
        if (!cancelled) setDatos({ treeId: arbol.id, error: err instanceof Error ? err.message : "No se pudo cargar la ficha." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, arbol.id]);

  const actual = datos?.treeId === arbol.id ? datos : null;
  const diag = actual && "diag" in actual ? actual.diag : null;
  const ficha = actual && "ficha" in actual ? actual.ficha : null;
  const ots: OtListada[] | null = ficha ? ficha.ordenes_trabajo : null;
  const incidencias = ficha?.incidencias ?? [];
  const base = `${basePathForRole(profile?.role)}/projects/${projectId}`;
  const vigente = diag?.vigente ?? null;
  const nivel = vigente?.resultado.clasificacion_riesgo ?? null;
  const tono = nivel ? getClassificationTone(nivel.etiqueta) : "neutral";
  const colorNivel = tono === "neutral" ? "#A7B0AB" : `var(--classification-${tono})`;
  const infra = vigente?.resultado.infraestructura ?? null;

  return (
    <aside className={`sivu-sheet ${drawer ? "sivu-sheet--drawer" : ""}`} aria-label={`Ficha del árbol ${arbol.tree_code}`}>
      <div className="sivu-sheet__head">
        <div>
          <span className="sivu-sheet__code">{arbol.tree_code}</span>
          <h2>{arbol.nombre_comun ?? arbol.especie_cientifica ?? "Sin especie"}</h2>
          {arbol.nombre_comun && arbol.especie_cientifica && <p>{arbol.especie_cientifica}</p>}
        </div>
        <button type="button" className="sivu-topbar__icon-btn" onClick={onClose} aria-label="Cerrar ficha">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="sivu-sheet__status">
        {nivel ? <ClassificationBadge level={nivel.etiqueta} /> : <span className="status-pill">Evaluación pendiente</span>}
        {arbol.sector && <span className="sivu-sheet__place">{arbol.sector}</span>}
      </div>

      <div className="sivu-seg sivu-sheet__tabs" role="tablist" aria-label="Secciones de la ficha">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`sivu-seg__opt ${tab === t.value ? "is-on" : ""}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sivu-sheet__body">
        {actual && "error" in actual && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {actual.error}
          </p>
        )}
        {!actual && <p className="sivu-state">Cargando ficha…</p>}

        {actual && "diag" in actual && tab === "resumen" && (
          <>
            {vigente && nivel ? (
              <div className="sivu-sheet__card sivu-sheet__result" style={{ ["--hl" as string]: colorNivel }}>
                <TreeGlyph r={vigente.resultado} />
                <div>
                  <span className="sivu-sheet__eyebrow">Resultado de riesgo · vigente desde {fechaChile(vigente.desde)}</span>
                  <strong className="sivu-sheet__lvl">{nivel.etiqueta}</strong>
                  {vigente.resultado.prioridad && (
                    <span className="sivu-sheet__why">Prioridad de intervención: {vigente.resultado.prioridad.etiqueta}</span>
                  )}
                </div>
                <button type="button" className="sivu-sheet__link" onClick={() => setTab("riesgo")}>
                  Detalle <Icon name="arrow-right" size={13} />
                </button>
              </div>
            ) : (
              <div className="sivu-sheet__card sivu-sheet__empty">
                {diag ? "Inspección finalizada: pasa a vigente al completar su orden de trabajo." : "Evaluación pendiente: el árbol todavía no tiene una orden de trabajo completada."}
              </div>
            )}
            {ots && ots.length > 0 && (
              <div className="sivu-sheet__card">
                <span className="sivu-sheet__eyebrow">Gestión del árbol</span>
                {ots.slice(0, 2).map((o) => (
                  <TrabajoOt key={o.id} ot={o} />
                ))}
                {ots.length > 2 && (
                  <button type="button" className="sivu-sheet__link" onClick={() => setTab("gestion")}>
                    Ver las {ots.length} órdenes <Icon name="arrow-right" size={13} />
                  </button>
                )}
              </div>
            )}
            <TreePhotos projectId={projectId} treeId={arbol.id} conDiagnostico={false} />
          </>
        )}

        {ficha && tab === "medicion" && <Medicion ficha={ficha} />}

        {actual && "diag" in actual && tab === "riesgo" &&
          (diag ? (
            <TreeDiagnosis d={diag} />
          ) : (
            <div className="sivu-sheet__card sivu-sheet__empty">Sin evaluación de riesgo registrada.</div>
          ))}

        {actual && "diag" in actual && tab === "infra" &&
          (vigente ? (
            <div className="sivu-sheet__card">
              <span className="sivu-sheet__eyebrow">Afectación de infraestructura · vigente desde {fechaChile(vigente.desde)}</span>
              <Fila label="Clasificación" valor={infra?.clasificacion?.etiqueta ?? "—"} />
              <Fila label="Puntaje" valor={infra?.puntaje != null ? String(infra.puntaje) : "—"} />
              <Fila
                label="Porcentaje"
                valor={infra?.porcentaje != null ? `${infra.porcentaje.toLocaleString("es-CL", { maximumFractionDigits: 1 })} %` : "—"}
              />
              <ul className="sivu-sheet__comps" aria-label="Componentes de infraestructura">
                {COMPONENTES_INFRA.map(([clave, nombre]) => {
                  const ind = (vigente.resultado as unknown as { indicadores?: Record<string, IndicadorInfra> }).indicadores?.[clave];
                  const cat = ind?.categoria ?? null;
                  const afecta = cat === "leve" || cat === "moderada" || cat === "severa";
                  const icono = afecta ? "alert" : cat === "sin_afectacion" ? "check" : "minus";
                  return (
                    <li key={clave} className={afecta ? "is-alert" : ""}>
                      <span className="sivu-sheet__comp-icon" aria-hidden="true">
                        <Icon name={icono} size={13} />
                      </span>
                      <span>
                        <strong>{nombre}</strong>
                        <small>{cat ? categorias[cat] ?? cat : "Sin registro"}{ind?.motivo ? ` · ${ind.motivo}` : ""}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="sivu-sheet__card sivu-sheet__empty">Sin evaluación de infraestructura vigente.</div>
          ))}

        {actual && "diag" in actual && tab === "gestion" && (
          <div className="sivu-sheet__card">
            <span className="sivu-sheet__eyebrow">Órdenes de trabajo</span>
            {ots && ots.length > 0 ? ots.map((o) => <TrabajoOt key={o.id} ot={o} />) : <span className="sivu-sheet__why">El árbol no tiene órdenes de trabajo.</span>}
            <span className="sivu-sheet__eyebrow sivu-sheet__eyebrow--sep">Incidencias</span>
            {incidencias.length > 0 ? (
              incidencias.map((i) => (
                <Link key={i.id} to={`${base}/incidencias/${i.id}`} className="sivu-sheet__work sivu-sheet__work--link">
                  <span className="sivu-sheet__work-icon">
                    <Icon name="alert" size={15} />
                  </span>
                  <span className="sivu-sheet__work-text">
                    <strong>{i.tipo_incidencia?.etiqueta ?? "Incidencia"}</strong>
                    <span>
                      {i.codigo_incidencia ?? "—"}
                      {i.fecha_reporte ? ` · ${fechaChile(i.fecha_reporte)}` : ""}
                    </span>
                  </span>
                  <span className="sivu-sheet__work-state" style={{ ["--c" as string]: colorEstadoInc(i.estado_incidencia.codigo) }}>
                    {i.estado_incidencia.etiqueta}
                  </span>
                </Link>
              ))
            ) : (
              <span className="sivu-sheet__why">El árbol no tiene incidencias.</span>
            )}
          </div>
        )}

        {tab === "resumen" && (
        <div className="sivu-sheet__card sivu-sheet__loc">
          <Fila label="Estado ciclo de vida" valor={cicloVida} />
          <Fila label="Sector" valor={arbol.sector ?? "—"} />
          <Fila label="Ubicación" valor={arbol.ubicacion_descriptiva ?? "—"} />
          <Fila label="UTM 19S" valor={arbol.utm_este !== null && arbol.utm_norte !== null ? `${arbol.utm_este} / ${arbol.utm_norte}` : "—"} mono />
          <Fila label="Registro" valor={fechaChile(arbol.fecha_registro)} />
        </div>
        )}
      </div>
      <Link to={historial} className="sivu-sheet__full">
        <Icon name="arrow-right" size={14} /> Ver ficha completa e historial
      </Link>
    </aside>
  );
}

/** Pestaña «Medición»: medidas vigentes del árbol (B2) y cómo cambiaron en cada versión vigente. */
function Medicion({ ficha }: { ficha: FichaArbol }) {
  const a = ficha.arbol;
  const ns = conUnidad(a.diametro_copa_ns_m, "m");
  const eo = conUnidad(a.diametro_copa_eo_m, "m");
  const copa = conUnidad(a.diametro_copa_m, "m");
  const fustes = num(a.numero_fustes);
  const hist = historialMedidas(ficha.historial);
  const desde = ficha.evaluacion_vigente?.desde ?? null;
  return (
    <>
      <div className="sivu-sheet__card">
        <span className="sivu-sheet__eyebrow">Medidas vigentes{desde ? ` · desde ${fechaChile(desde)}` : ""}</span>
        <Fila label={a.multifustal ? "DAP equivalente" : "DAP"} valor={conUnidad(a.dap_cm, "cm") ?? "Sin registro"} />
        {a.multifustal === true && <Fila label="Fustes" valor={fustes !== null ? String(fustes) : "Sin registro"} />}
        <Fila label="Altura total" valor={conUnidad(a.altura_total_m, "m") ?? "Sin registro"} />
        <Fila label="Diámetro de copa" valor={copa ? `${copa}${ns && eo ? ` (N-S ${ns} · E-O ${eo})` : ""}` : "Sin registro"} />
        <Fila label="Clase de edad" valor={etiqueta(a.clase_edad) ?? "Sin registro"} />
        <Fila label="Edad estimada" valor={etiqueta(a.rango_edad_estimada_anios) ?? "Sin registro"} />
      </div>
      <div className="sivu-sheet__card">
        <span className="sivu-sheet__eyebrow">Historial de medidas</span>
        {hist.length > 0 ? (
          <div className="sivu-sheet__hist" role="table" aria-label="Historial de medidas">
            <div className="sivu-sheet__hist-row sivu-sheet__hist-head" role="row">
              <span role="columnheader">Fecha</span>
              <span role="columnheader">DAP</span>
              <span role="columnheader">Altura</span>
              <span role="columnheader">Copa</span>
            </div>
            {hist.map((v) => (
              <div key={v.clave} className="sivu-sheet__hist-row" role="row">
                <span role="cell">
                  {v.fecha ? fechaChile(v.fecha) : "—"}
                  <small>{v.origen}</small>
                </span>
                <span role="cell">{v.dap ?? "—"}</span>
                <span role="cell">{v.altura ?? "—"}</span>
                <span role="cell">{v.copa ?? "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="sivu-sheet__why">Aún no hay medidas registradas en una inspección vigente.</span>
        )}
      </div>
    </>
  );
}

function Fila({ label, valor, mono = false }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div className="sivu-sheet__row">
      <span>{label}</span>
      <strong className={mono ? "is-mono" : ""}>{valor}</strong>
    </div>
  );
}

function TrabajoOt({ ot }: { ot: OtListada }) {
  const c = `var(--ot-${ot.estado.codigo.replace(/_/g, "-")}, var(--ot-pendiente))`;
  return (
    <div className="sivu-sheet__work">
      <span className="sivu-sheet__work-icon">
        <Icon name={ot.tipo_ot.codigo === "inspeccion" ? "clipboard" : "wrench"} size={15} />
      </span>
      <span className="sivu-sheet__work-text">
        <strong>{ot.subtipo ? `${ot.accion.etiqueta} · ${ot.subtipo.etiqueta}` : ot.accion.etiqueta}</strong>
        <span>{ot.codigo_ot ?? "—"}</span>
      </span>
      <span className="sivu-sheet__work-state" style={{ ["--c" as string]: c }}>
        {ot.estado.etiqueta}
      </span>
    </div>
  );
}
