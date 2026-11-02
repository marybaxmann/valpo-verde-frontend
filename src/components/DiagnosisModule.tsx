import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarInventarioCompleto } from "../api/inventory";
import { obtenerCatalogos } from "../api/catalogs";
import { obtenerResumen } from "../api/resumen";
import type { ResumenProyecto } from "../types/resumen";
import type { CatalogoItem } from "../types/catalogs";
import type { Diagnostico } from "../types/diagnostico";
import type { ArbolInventario } from "../types/inventory";
import { TerritorialModule } from "./TerritorialModule";
import { TreeSheet } from "./TreeSheet";
import { ClassificationBadge, getClassificationTone } from "./ClassificationBadge";
import { Icon } from "./Icons";

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
  // Niveles ocultos por «Filtros» (código del catálogo; "" = evaluación pendiente).
  const [ocultos, setOcultos] = useState<ReadonlySet<string>>(new Set());
  // Conteos por nivel del resumen del proyecto (B7): los cuenta el backend.
  const [resumen, setResumen] = useState<ResumenProyecto | null>(null);

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
    obtenerResumen(projectId)
      .then((r) => !cancelled && setResumen(r))
      .catch(() => !cancelled && setResumen(null));
    return () => {
      cancelled = true;
    };
  }, [projectId, vista]);

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
  const visible = (a: ArbolInventario) => !ocultos.has(valor(datos?.diag.get(a.id))?.codigo ?? "");
  const arbolesVisibles = (datos?.arboles ?? []).filter(visible);
  const points = arbolesVisibles
    .filter((a) => a.ubicacion)
    .map((a) => {
      const v = valor(datos?.diag.get(a.id));
      return {
        id: a.id,
        lng: a.ubicacion!.lng,
        lat: a.ubicacion!.lat,
        title: a.tree_code,
        label: a.nombre_comun ?? a.especie_cientifica ?? undefined,
        detail: v?.etiqueta ?? "Evaluación pendiente",
        tone: v ? getClassificationTone(v.etiqueta) : ("neutral" as const),
      };
    });
  const arbol = datos?.arboles.find((a) => a.id === elegido) ?? null;
  const niveles = [...(leyenda ?? [])].sort((a, b) => a.orden - b.orden);
  const alternarNivel = (codigo: string) =>
    setOcultos((o) => {
      const n = new Set(o);
      if (n.has(codigo)) n.delete(codigo);
      else n.add(codigo);
      return n;
    });


  return (
    <TerritorialModule
      moduleLabel={titulo}
      points={points}
      selectedId={elegido}
      onSelect={setElegido}
      registros={datos ? arbolesVisibles.length : undefined}
      sheet={
        arbol ? (
          <TreeSheet
            key={arbol.id}
            drawer
            projectId={projectId}
            arbol={arbol}
            cicloVida={arbol.ciclo_vida?.etiqueta ?? arbol.estado_ciclo_vida}
            initialTab={vista === "riesgo" ? "riesgo" : "infra"}
            onClose={() => setElegido(null)}
          />
        ) : undefined
      }
      filtrosActivos={ocultos.size}
      filtros={
        leyenda && leyenda.length > 0 ? (
          <FiltroNiveles niveles={niveles} ocultos={ocultos} onChange={alternarNivel} onTodos={() => setOcultos(new Set())} />
        ) : undefined
      }
      card={
        <>
          <div className="sivu-panel__head">
            <h2>{titulo}</h2>
            <span className="sivu-diag__tag">Evaluación vigente</span>
          </div>
          {vista === "riesgo" && resumen && niveles.length > 0 && <RiesgoResumen resumen={resumen} leyenda={niveles} />}
          {vista === "infraestructura" && resumen && (
            <>
              <div className="sivu-ov__hero">
                <span className="sivu-ov__num">{resumen.con_diagnostico}</span>
                <span className="sivu-ov__lbl">
                  árboles con evaluación
                  <br />
                  de {resumen.arboles_total} registrados
                </span>
              </div>
              <p className="sivu-terr__note">Afectación de infraestructura de la evaluación vigente. Toca un nivel abajo para mostrarlo u ocultarlo en el mapa.</p>
            </>
          )}
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!datos && !error && <p className="sivu-state">Cargando árboles y diagnósticos…</p>}
          {datos && datos.arboles.length === 0 && <p className="sivu-state">El proyecto no tiene árboles registrados.</p>}
        </>
      }
      lista={
        datos && datos.arboles.length > 0 ? (
          <ul className="sivu-diag__list" aria-label="Árboles del proyecto">
            {arbolesVisibles.map((a) => {
              const v = valor(datos.diag.get(a.id));
              return (
                <li key={a.id}>
                  <button type="button" className={a.id === elegido ? "is-sel" : ""} aria-pressed={a.id === elegido} onClick={() => setElegido(a.id)}>
                    <span>
                      <strong>{a.tree_code}</strong> <em>{a.especie_cientifica ?? ""}</em>
                    </span>
                    {v ? <ClassificationBadge level={v.etiqueta} /> : <span className="status-pill">Evaluación pendiente</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : undefined
      }
      leyendaInferior={
        vista === "infraestructura" && niveles.length > 0 ? (
          <div className="sivu-legendbar" role="group" aria-label="Niveles de afectación en el mapa">
            {[...niveles.map((n) => ({ codigo: n.codigo, etiqueta: n.etiqueta })), { codigo: "", etiqueta: "Evaluación pendiente" }].map((n) => (
              <button
                key={n.codigo || "pendiente"}
                type="button"
                className={`sivu-legendbar__chip ${ocultos.has(n.codigo) ? "" : "is-on"}`}
                aria-pressed={!ocultos.has(n.codigo)}
                onClick={() => alternarNivel(n.codigo)}
              >
                <span className={`sivu-diag__dot sivu-diag__dot--${n.codigo ? getClassificationTone(n.etiqueta) : "neutral"}`} aria-hidden="true" />
                {n.etiqueta}
              </button>
            ))}
          </div>
        ) : undefined
      }
    />
  );
}

/**
 * Cabecera de la tarjeta de Riesgo (maqueta SIVU Lab: `RiskBody`, .ov__hero,
 * .stack, .legend; CC-058). Solo el diseño: las cifras son los conteos de B7
 * por nivel, tal como llegan; el frontend no agrupa niveles ni calcula
 * porcentajes.
 */
function RiesgoResumen({ resumen, leyenda }: { resumen: ResumenProyecto; leyenda: CatalogoItem[] }) {
  const niveles = [...leyenda].sort((a, b) => a.orden - b.orden);
  const total = (codigo: string | null) => resumen.por_riesgo.find((c) => c.codigo === codigo)?.total ?? 0;
  const sinClasificacion = total(null);
  const color = (etiqueta: string) => {
    const t = getClassificationTone(etiqueta);
    return t === "neutral" ? "#A7B0AB" : `var(--classification-${t})`;
  };
  return (
    <>
      <div className="sivu-ov__hero">
        <span className="sivu-ov__num">{resumen.con_diagnostico}</span>
        <span className="sivu-ov__lbl">
          árboles evaluados
          <br />
          de {resumen.arboles_total} registrados
        </span>
      </div>
      <div className="sivu-stack" role="img" aria-label="Árboles por nivel de riesgo">
        {niveles.map((n) =>
          total(n.codigo) > 0 ? <span key={n.codigo} style={{ flex: total(n.codigo), background: color(n.etiqueta) }} /> : null
        )}
        {sinClasificacion > 0 && <span style={{ flex: sinClasificacion, background: "#FFFFFF" }} />}
        {resumen.sin_evaluacion > 0 && <span className="sivu-stack__none" style={{ flex: resumen.sin_evaluacion }} />}
      </div>
      <ul className="sivu-ov__legend" aria-label="Leyenda del mapa">
        {niveles.map((n) => (
          <li key={n.codigo}>
            <span className={`sivu-diag__dot sivu-diag__dot--${getClassificationTone(n.etiqueta)}`} aria-hidden="true" />
            <span>{n.etiqueta}</span>
            <strong>{total(n.codigo)}</strong>
          </li>
        ))}
        {sinClasificacion > 0 && (
          <li>
            <span className="sivu-diag__dot" aria-hidden="true" />
            <span>Sin clasificación</span>
            <strong>{sinClasificacion}</strong>
          </li>
        )}
        <li>
          <span className="sivu-diag__dot sivu-diag__dot--neutral" aria-hidden="true" />
          <span>Evaluación pendiente</span>
          <strong>{resumen.sin_evaluacion}</strong>
        </li>
      </ul>
    </>
  );
}

/** Panel «Filtros»: muestra u oculta cada nivel en el mapa y en la lista (solo filtra lo que llegó de la API). */
function FiltroNiveles({
  niveles,
  ocultos,
  onChange,
  onTodos,
}: {
  niveles: CatalogoItem[];
  ocultos: ReadonlySet<string>;
  onChange: (codigo: string) => void;
  onTodos: () => void;
}) {
  const opciones = [...niveles.map((n) => ({ codigo: n.codigo, etiqueta: n.etiqueta })), { codigo: "", etiqueta: "Evaluación pendiente" }];
  return (
    <div role="group" aria-label="Niveles visibles">
      <ul className="sivu-terr__chips">
        {opciones.map((o) => (
          <li key={o.codigo || "pendiente"}>
            <button type="button" className={`sivu-lchip ${ocultos.has(o.codigo) ? "" : "is-on"}`} aria-pressed={!ocultos.has(o.codigo)} onClick={() => onChange(o.codigo)}>
              <span className={`sivu-diag__dot sivu-diag__dot--${o.codigo ? getClassificationTone(o.etiqueta) : "neutral"}`} aria-hidden="true" />
              {o.etiqueta}
            </button>
          </li>
        ))}
      </ul>
      {ocultos.size > 0 && (
        <button type="button" className="sivu-panel__link" onClick={onTodos}>
          Mostrar todos
        </button>
      )}
    </div>
  );
}
