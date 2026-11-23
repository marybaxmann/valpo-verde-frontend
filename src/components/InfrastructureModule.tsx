import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { obtenerInfraestructura } from "../api/infraestructura";
import { listarInventarioCompleto } from "../api/inventory";
import type { ArbolInfraestructura, RespuestaInfraestructura } from "../types/infraestructura";
import type { ArbolInventario } from "../types/inventory";
import type { MapPoint } from "./ProjectMapView";
import { TerritorialModule } from "./TerritorialModule";
import { getClassificationTone } from "./ClassificationBadge";
import { Icon } from "./Icons";
import { InfraSheet } from "./InfraSheet";
import { IconoPendiente, MarcaCategoria } from "./InfraIcons";
import {
  aspectoCategoria,
  CATEGORIAS_CON_AFECTACION,
  colorClasificacion,
  COMPONENTES,
  svgDataUrl,
  svgPendiente,
  svgPunto,
  svgReloj,
  arco,
} from "../lib/infraestructura";

/** Clave de leyenda de un árbol en la vista actual ("pendiente" = sin evaluación vigente). */
type Clave = string;
const PENDIENTE = "pendiente";

/** Chips de la leyenda por componente: categorías de `categoria_infraestructura` (etiquetas de la API). */
const CHIPS_COMPONENTE: { codigo: string; corto: string }[] = [
  { codigo: "severa", corto: "Severa" },
  { codigo: "moderada", corto: "Moderada" },
  { codigo: "leve", corto: "Leve" },
  { codigo: "sin_afectacion", corto: "Sin af." },
  { codigo: "no_determinado", corto: "No det." },
];

function categoriaDe(f: ArbolInfraestructura, componente: string): string | null {
  return f.componentes.find((c) => c.componente.codigo === componente)?.categoria?.codigo ?? null;
}

/**
 * Infraestructura (rediseño aprobado por la responsable el 2026-11-17,
 * maqueta v2.1): mapa con un pin por componente, resumen con la
 * clasificación y la afectación por componente, leyenda por estado y, bajo
 * ella, la lente para ver el mapa por componente. Los datos son los de B8
 * (M04 en la evaluación vigente); el frontend no calcula ni reclasifica.
 * Los árboles activos del inventario que no están en B8 se dibujan como
 * «Evaluación pendiente» (sin evaluación completa válida y vigente).
 */
export function InfrastructureModule() {
  const { projectId = "" } = useParams();
  const [datos, setDatos] = useState<{ infra: RespuestaInfraestructura; inventario: ArbolInventario[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  // Lente: null = Todos; si no, el código del componente.
  const [lente, setLente] = useState<string | null>(null);
  const [ocultosTodos, setOcultosTodos] = useState<ReadonlySet<Clave>>(new Set());
  const [ocultosComp, setOcultosComp] = useState<ReadonlySet<Clave>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([obtenerInfraestructura(projectId), listarInventarioCompleto(projectId, {})])
      .then(([infra, inventario]) => {
        if (!cancelled) setDatos({ infra, inventario });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar la infraestructura del proyecto.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filas = useMemo(() => datos?.infra.arboles ?? [], [datos]);
  const porId = useMemo(() => new Map(filas.map((f) => [f.arbol.id, f])), [filas]);
  const pendientes = useMemo(
    () => (datos?.inventario ?? []).filter((a) => a.estado_ciclo_vida === "activo" && !porId.has(a.id)),
    [datos, porId]
  );

  const claveDe = (f: ArbolInfraestructura | undefined): Clave => {
    if (!f) return PENDIENTE;
    if (lente === null) return f.infraestructura.clasificacion?.codigo ?? "sin_clasificacion";
    return categoriaDe(f, lente) ?? "sin_dato";
  };
  const ocultos = lente === null ? ocultosTodos : ocultosComp;
  const alternar = (k: Clave) => {
    const set = lente === null ? setOcultosTodos : setOcultosComp;
    set((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const defLente = COMPONENTES.find((c) => c.codigo === lente) ?? null;
  const etiquetaCategoria = (codigo: string | null) =>
    datos?.infra.resumen.por_componente[0]?.categorias.find((c) => c.codigo === codigo)?.etiqueta ?? codigo ?? "Sin dato";

  const points: MapPoint[] = [];
  for (const f of filas) {
    const u = f.arbol.ubicacion;
    if (!u || ocultos.has(claveDe(f))) continue;
    const cls = f.infraestructura.clasificacion;
    const tono = cls ? getClassificationTone(cls.etiqueta) : "neutral";
    const centro = cls && cls.codigo !== "no_aplica" ? colorClasificacion(tono) : null;
    let svg: string;
    let key: string;
    let detail: string;
    if (lente === null) {
      const aspectos = COMPONENTES.map((c) => aspectoCategoria(categoriaDe(f, c.codigo)));
      svg = svgReloj(aspectos, centro);
      key = `r:${aspectos.join(",")}:${cls?.codigo ?? ""}`;
      detail = cls ? `Infraestructura: ${cls.etiqueta}` : "Sin clasificación";
    } else {
      const cat = categoriaDe(f, lente);
      svg = svgPunto(aspectoCategoria(cat));
      key = `p:${lente}:${cat ?? ""}`;
      detail = `${defLente?.corto ?? ""}: ${f.componentes.find((c) => c.componente.codigo === lente)?.categoria?.etiqueta ?? "sin dato"}`;
    }
    points.push({
      id: f.arbol.id,
      lng: u.lng,
      lat: u.lat,
      title: f.arbol.tree_code,
      label: f.arbol.nombre_comun ?? f.arbol.especie_cientifica ?? undefined,
      detail,
      color: centro ?? "#A7B0AB",
      icon: { url: svgDataUrl(svg), size: lente === null ? 30 : 22, key },
    });
  }
  if (!ocultos.has(PENDIENTE)) {
    for (const a of pendientes) {
      if (!a.ubicacion) continue;
      const svg = lente === null ? svgPendiente() : svgPunto(null);
      points.push({
        id: a.id,
        lng: a.ubicacion.lng,
        lat: a.ubicacion.lat,
        title: a.tree_code,
        label: a.nombre_comun ?? a.especie_cientifica ?? undefined,
        detail: "Evaluación pendiente",
        color: "#A7B0AB",
        icon: { url: svgDataUrl(svg), size: 22, key: `n:${lente ?? ""}` },
      });
    }
  }

  const fila = elegido ? porId.get(elegido) ?? null : null;
  const arbolPendiente = elegido && !fila ? datos?.inventario.find((a) => a.id === elegido) ?? null : null;

  // Conteos de la leyenda: los árboles de cada clave en la vista actual (de B8 y del inventario).
  const conteo = (k: Clave) => filas.filter((f) => claveDe(f) === k).length + (k === PENDIENTE ? pendientes.filter((a) => a.ubicacion).length : 0);
  const clasificaciones = datos?.infra.resumen.por_clasificacion ?? [];

  return (
    <TerritorialModule
      moduleLabel="Infraestructura"
      points={points}
      selectedId={elegido}
      onSelect={setElegido}
      sheet={
        fila || arbolPendiente ? (
          <InfraSheet
            key={elegido!}
            projectId={projectId}
            fila={fila}
            arbol={arbolPendiente}
            componenteInicial={lente}
            onClose={() => setElegido(null)}
          />
        ) : undefined
      }
      card={
        <>
          <div className="sivu-panel__head">
            <span className="sivu-diag__tag">Evaluación vigente</span>
          </div>
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!datos && !error && <p className="sivu-state">Cargando la infraestructura del proyecto…</p>}
          {datos && <Resumen infra={datos.infra} lente={lente} onLente={setLente} />}
        </>
      }
      leyendaInferior={
        datos ? (
          <div className="sivu-infra-bottom">
            <div className="sivu-legendbar" role="group" aria-label="Leyenda: toca un estado para mostrarlo u ocultarlo en el mapa">
              {lente === null ? (
                <>
                  {clasificaciones
                    .filter((c) => c.codigo !== "no_aplica")
                    .reverse()
                    .map((c) => (
                      <ChipLeyenda key={c.codigo} on={!ocultos.has(c.codigo)} onClick={() => alternar(c.codigo)} n={conteo(c.codigo)} texto={c.etiqueta}>
                        <span className="sivu-infra-dot" style={{ background: colorClasificacion(getClassificationTone(c.etiqueta)) }} />
                      </ChipLeyenda>
                    ))}
                  <span className="sivu-infra-lsep" aria-hidden="true" />
                  <ChipLeyenda on={!ocultos.has("no_aplica")} onClick={() => alternar("no_aplica")} n={conteo("no_aplica")} texto="No aplica">
                    <span className="sivu-infra-dot sivu-infra-dot--na" />
                  </ChipLeyenda>
                </>
              ) : (
                <>
                  {CHIPS_COMPONENTE.map((c) => (
                    <ChipLeyenda key={c.codigo} on={!ocultos.has(c.codigo)} onClick={() => alternar(c.codigo)} n={conteo(c.codigo)} texto={c.corto} titulo={etiquetaCategoria(c.codigo)}>
                      <MarcaCategoria a={aspectoCategoria(c.codigo)} />
                    </ChipLeyenda>
                  ))}
                  <span className="sivu-infra-lsep" aria-hidden="true" />
                  <ChipLeyenda on={!ocultos.has("no_aplica")} onClick={() => alternar("no_aplica")} n={conteo("no_aplica")} texto="No aplica">
                    <MarcaCategoria a="na" />
                  </ChipLeyenda>
                </>
              )}
              <span className="sivu-infra-lsep" aria-hidden="true" />
              <ChipLeyenda on={!ocultos.has(PENDIENTE)} onClick={() => alternar(PENDIENTE)} n={conteo(PENDIENTE)} texto={lente === null ? "Pendiente" : "Pend."} titulo="Evaluación pendiente">
                <IconoPendiente />
              </ChipLeyenda>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}

function ChipLeyenda({
  on,
  onClick,
  n,
  texto,
  titulo,
  children,
}: {
  on: boolean;
  onClick: () => void;
  n: number;
  texto: string;
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`sivu-legendbar__chip sivu-infra-lchip ${on ? "is-on" : ""}`} aria-pressed={on} onClick={onClick} title={titulo ?? texto}>
      {children}
      {texto}
      <small>{n}</small>
    </button>
  );
}

/**
 * Resumen (pedidos de la responsable, 2026-11-18): total evaluado, barra de
 * clasificación y la rueda de componentes, que es el único filtro por
 * componente. Los conteos por nivel están en la leyenda inferior.
 */
function Resumen({ infra, lente, onLente }: { infra: RespuestaInfraestructura; lente: string | null; onLente: (c: string | null) => void }) {
  const { cobertura, resumen } = infra;
  const sinEval = cobertura.arboles_sin_evaluacion_valida;
  const total = resumen.por_clasificacion.reduce((s, c) => s + c.arboles, 0) + sinEval;
  return (
    <>
      <div className="sivu-ov__hero">
        <span className="sivu-ov__num">{cobertura.arboles_con_evaluacion_valida}</span>
        <span className="sivu-ov__lbl">
          árboles evaluados de {cobertura.arboles_presentes}
          <br />
          {sinEval} sin evaluación vigente
        </span>
      </div>
      <span className="sivu-infra-sub">
        <span className="sivu-infra-tbd" title="Ícono por definir">?</span>
        Clasificación de infraestructura
      </span>
      {total > 0 && (
        <div className="sivu-stack" role="img" aria-label="Árboles por clasificación de infraestructura">
          {resumen.por_clasificacion.map((c) =>
            c.arboles > 0 ? (
              <span
                key={c.codigo}
                className={c.codigo === "no_aplica" ? "sivu-infra-stack-na" : undefined}
                style={{ flex: c.arboles, background: c.codigo === "no_aplica" ? undefined : colorClasificacion(getClassificationTone(c.etiqueta)) }}
              />
            ) : null
          )}
          {sinEval > 0 && <span className="sivu-stack__none" style={{ flex: sinEval }} />}
        </div>
      )}
      <div className="sivu-infra-sep" />
      <RuedaComponentes infra={infra} lente={lente} onLente={onLente} />
    </>
  );
}

/** Árboles por categoría de un componente (conteos de B8). */
function conteosComponente(infra: RespuestaInfraestructura, codigo: string) {
  const r = infra.resumen.por_componente.find((p) => p.componente.codigo === codigo);
  const n = (c: string) => r?.categorias.find((x) => x.codigo === c)?.arboles ?? 0;
  return { severa: n("severa"), moderada: n("moderada"), leve: n("leve"), sin: n("sin_afectacion"), afectados: CATEGORIAS_CON_AFECTACION.reduce((s, c) => s + n(c), 0) };
}

/**
 * Rueda de componentes (opción A elegida por la responsable, 2026-11-18):
 * la misma forma que el pin del mapa, un sector por componente en el mismo
 * orden. Cada sector toma el color de la categoría más grave que tiene algún
 * árbol en ese componente y muestra cuántos árboles tienen afectación. Tocar
 * un sector filtra el mapa por ese componente; el centro vuelve a «Todos».
 */
function RuedaComponentes({ infra, lente, onLente }: { infra: RespuestaInfraestructura; lente: string | null; onLente: (c: string | null) => void }) {
  const sel = COMPONENTES.find((c) => c.codigo === lente) ?? null;
  const cSel = sel ? conteosComponente(infra, sel.codigo) : null;
  const tecla = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
  return (
    <div className="sivu-infra-rueda">
      {/* El ancho incluye los nombres de los sectores laterales (x = ±86 más el texto): nada se dibuja fuera del gráfico. */}
      <svg viewBox="-144 -98 288 196" role="group" aria-label="Ver el mapa por componente">
        {COMPONENTES.map((c, i) => {
          const k = conteosComponente(infra, c.codigo);
          const tono = k.severa ? "sev" : k.moderada ? "mod" : k.leve ? "lev" : k.sin ? "sin" : "na";
          const on = lente === c.codigo;
          const a0 = -90 + 60 * i + 2;
          const a1 = -90 + 60 * (i + 1) - 2;
          const am = ((a0 + a1) / 2) * (Math.PI / 180);
          const lx = 86 * Math.cos(am);
          const ly = 86 * Math.sin(am);
          return (
            <g
              key={c.codigo}
              className={`sivu-infra-rueda__seg sivu-infra-rueda__seg--${tono} ${on ? "is-on" : ""} ${lente && !on ? "is-dim" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${c.nombre}: ${k.afectados} árboles con afectación`}
              onClick={() => onLente(on ? null : c.codigo)}
              onKeyDown={tecla(() => onLente(on ? null : c.codigo))}
            >
              <title>{`${c.nombre} · Severa ${k.severa} · Moderada ${k.moderada} · Leve ${k.leve}`}</title>
              <path d={arco(on ? 33 : 35, on ? 72 : 66, a0, a1)} />
              <text className="sivu-infra-rueda__n" x={50 * Math.cos(am)} y={50 * Math.sin(am) + 5} textAnchor="middle">
                {k.afectados}
              </text>
              <text className="sivu-infra-rueda__lbl" x={lx} y={ly + 4} textAnchor={Math.abs(lx) < 12 ? "middle" : lx > 0 ? "start" : "end"}>
                {c.corto}
              </text>
            </g>
          );
        })}
        <g
          className={`sivu-infra-rueda__centro ${lente === null ? "is-on" : ""}`}
          role="button"
          tabIndex={0}
          aria-pressed={lente === null}
          aria-label="Ver todos los componentes"
          onClick={() => onLente(null)}
          onKeyDown={tecla(() => onLente(null))}
        >
          <circle r="28" />
          <text y="4" textAnchor="middle">Todos</text>
        </g>
      </svg>
      <p className="sivu-infra-rueda__cap">
        {sel && cSel ? (
          <>
            <strong>{sel.nombre}</strong>: {cSel.afectados} con afectación
            <span>
              Severa {cSel.severa} · Moderada {cSel.moderada} · Leve {cSel.leve}
            </span>
          </>
        ) : (
          <>
            Árboles con afectación por componente.
            <span>Toca un sector para ver el mapa solo con ese componente.</span>
          </>
        )}
      </p>
    </div>
  );
}
