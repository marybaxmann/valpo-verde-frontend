import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { getProjectRiskSummary } from "../api/treeRiskAssessments";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { Icon } from "../components/Icons";
import { StatCard, StatGrid } from "../components/StatCard";
import { BarRow } from "../components/BarRow";
import { RiskDistribution, countRisks } from "../components/RiskDistribution";
import { SivuTable } from "../components/SivuTable";

interface Stat {
  n: number;
  min: number | null;
  promedio: number | null;
  max: number | null;
}

interface IndicesData {
  total_arboles: number;
  con_ubicacion: number;
  especies: { nombre_cientifico: string; nombre_comun: string | null; n: number }[];
  sin_especie: number;
  dendrometria: {
    con_medicion_actual: number;
    empates_fecha_maxima: number;
    altura_total_m: Stat;
    diametro_copa_m: Stat;
    dap_cm_un_fuste: Stat;
    polifuste_sin_dap_equivalente: number;
    clase_edad: { clase: string; n: number }[];
  };
}

/**
 * Indicadores del modelo (hoja INDICES del Excel maestro) y su estado real
 * en SIVU. INDICES "no es implementable ni normativa vigente hasta cerrar
 * CC-016" (docs/registro-cambios.md): ningún índice propuesto se calcula
 * aquí. Se muestran solo agregados descriptivos (conteos, porcentajes,
 * mínimo/promedio/máximo) y, para cada índice, el motivo por el que aún no
 * se calcula.
 */
const MODEL_INDICATORS: { nombre: string; estado: string; motivo: string }[] = [
  { nombre: "Número total de árboles inventariados", estado: "Conteo disponible", motivo: "Se muestra en el resumen como conteo descriptivo." },
  { nombre: "Riqueza de especies", estado: "Conteo disponible", motivo: "Número de especies registradas en el resumen; adopción como índice pendiente (CC-016)." },
  { nombre: "Abundancia relativa por especie", estado: "Porcentajes disponibles", motivo: "Porcentaje por especie en Composición; adopción como índice pendiente (CC-016)." },
  { nombre: "Índice de diversidad de Shannon (H′)", estado: "Pendiente de adopción", motivo: "Fórmula propuesta en la hoja INDICES, aún no adoptada por la metodología (CC-016)." },
  { nombre: "Diversidad taxonómica 10-20-30", estado: "Requiere información taxonómica", motivo: "El catálogo de especies no registra género ni familia; además pendiente de adopción (CC-016)." },
  { nombre: "Proporción de especies nativas", estado: "Requiere información del catálogo", motivo: "El catálogo de especies no registra el origen (nativa/exótica)." },
  { nombre: "Proporción de especies exóticas", estado: "Requiere información del catálogo", motivo: "El catálogo de especies no registra el origen (nativa/exótica)." },
  { nombre: "Densidad arbórea", estado: "Requiere superficie de referencia", motivo: "SIVU no registra la superficie (ha) del área de estudio; además pendiente de adopción (CC-016)." },
  { nombre: "Distribución por clase diamétrica", estado: "Requiere intervalos metodológicos", motivo: "La metodología aún no define los intervalos de DAP; los árboles polifuste no tienen DAP equivalente aprobado." },
  { nombre: "Diámetro medio de copa", estado: "Promedio descriptivo disponible", motivo: "Se muestra el promedio del diámetro de copa registrado; adopción como índice pendiente (CC-016)." },
  { nombre: "Área proyectada de copa", estado: "Pendiente de adopción", motivo: "Fórmula propuesta en la hoja INDICES, aún no adoptada por la metodología (CC-016)." },
  { nombre: "Captura / almacenamiento de CO₂", estado: "Sin metodología definida", motivo: "No figura en la hoja INDICES ni en REGLAS_INDICADORES de SIVU." },
  { nombre: "Cobertura / sombra", estado: "Sin metodología definida", motivo: "No figura en la hoja INDICES ni en REGLAS_INDICADORES de SIVU." },
];

const fmt = (v: number | null, unit: string) => (v === null ? "—" : `${v.toLocaleString("es-CL")} ${unit}`);

export default function IndicesPage() {
  const { projectId = "" } = useParams();
  const { project } = useCurrentProject();
  const [data, setData] = useState<IndicesData | null>(null);
  const [riskByTreeId, setRiskByTreeId] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    api
      .get<{ data: IndicesData }>(`/api/projects/${projectId}/indices`)
      .then((r) => !cancelled && setData(r.data))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "No se pudieron cargar los índices."))
      .finally(() => !cancelled && setLoading(false));
    getProjectRiskSummary(projectId)
      .then((r) => {
        if (cancelled) return;
        const map: Record<string, string | null> = {};
        for (const [id, dto] of Object.entries(r.data)) map[id] = dto.resultado.clasificacion_riesgo;
        setRiskByTreeId(map);
      })
      .catch(() => !cancelled && setRiskByTreeId({}));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const evaluados = Object.keys(riskByTreeId).length;
  const riskCounts = useMemo(() => countRisks(riskByTreeId, data?.total_arboles ?? 0), [riskByTreeId, data]);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Cargando índices…</p>;
  if (error || !data) {
    return (
      <div className="card card--pad">
        <p style={{ color: "var(--classification-critical)" }}>
          <Icon name="alert" size={14} /> {error ?? "No se pudieron cargar los índices."}
        </p>
      </div>
    );
  }

  const d = data.dendrometria;
  const dominante = data.especies[0];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="sort" size={20} /> Índices
          </h1>
          <p className="page-header__sub">
            Indicadores para el análisis del arbolado urbano y apoyo a la gestión territorial
            {project ? ` — ${project.name}` : ""}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "-6px 0 14px" }}>
        Indicadores del proyecto: describen los ejemplares registrados en SIVU y no representan estadísticamente el
        arbolado de la comuna.
      </p>

      <h3 className="sivu-toolbar__title" style={{ marginBottom: 10 }}>Ejemplares registrados</h3>
      <StatGrid>
        <StatCard label="Árboles registrados" value={data.total_arboles} />
        <StatCard label="Especies registradas" value={data.especies.length} foot={data.sin_especie > 0 ? `${data.sin_especie} sin especie` : undefined} />
        <StatCard label="Árboles evaluados (riesgo)" value={evaluados} foot={`de ${data.total_arboles}`} />
        <StatCard label="Georreferenciados" value={data.con_ubicacion} foot={`de ${data.total_arboles}`} />
      </StatGrid>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div className="card card--pad">
          <h3 className="sivu-toolbar__title" style={{ marginBottom: 4 }}>Composición de los ejemplares registrados</h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
            {dominante
              ? `Especie con más registros: ${dominante.nombre_comun || dominante.nombre_cientifico} (${Math.round((dominante.n / Math.max(1, data.total_arboles)) * 100)}%).`
              : "Sin árboles registrados."}
          </p>
          {data.especies.map((e) => (
            <BarRow
              key={e.nombre_cientifico}
              label={`${e.nombre_comun ? `${e.nombre_comun} · ` : ""}${e.nombre_cientifico} (${Math.round((e.n / Math.max(1, data.total_arboles)) * 100)}%)`}
              value={e.n}
              total={data.total_arboles}
            />
          ))}
        </div>

        <div className="card card--pad">
          <h3 className="sivu-toolbar__title" style={{ marginBottom: 4 }}>Riesgo de los ejemplares registrados</h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
            Última evaluación de cada árbol, calculada por el motor de riesgo.
          </p>
          <RiskDistribution counts={riskCounts} total={data.total_arboles} />
        </div>
      </div>

      <div className="card card--pad" style={{ marginBottom: 16 }}>
        <h3 className="sivu-toolbar__title" style={{ marginBottom: 4 }}>Estructura de los ejemplares registrados</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
          Estadísticos descriptivos de la medición dendrométrica vigente de {d.con_medicion_actual} árbol(es).
        </p>
        <SivuTable
          columns={[
            { label: "Variable", width: "34%" },
            { label: "N", width: "12%" },
            { label: "Mínimo", width: "18%" },
            { label: "Promedio", width: "18%" },
            { label: "Máximo", width: "18%" },
          ]}
          empty={d.con_medicion_actual === 0 ? { icon: "list", title: "Sin mediciones dendrométricas vigentes." } : null}
        >
          {[
            { label: "Altura total", s: d.altura_total_m, u: "m" },
            { label: "Diámetro de copa", s: d.diametro_copa_m, u: "m" },
            { label: "DAP (árboles de un fuste)", s: d.dap_cm_un_fuste, u: "cm" },
          ].map((r) => (
            <tr key={r.label}>
              <td className="sivu-table__strong">{r.label}</td>
              <td className="sivu-table__num">{r.s.n}</td>
              <td className="sivu-table__num">{fmt(r.s.min, r.u)}</td>
              <td className="sivu-table__num">{fmt(r.s.promedio, r.u)}</td>
              <td className="sivu-table__num">{fmt(r.s.max, r.u)}</td>
            </tr>
          ))}
        </SivuTable>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10, fontSize: 12, color: "var(--text-secondary)" }}>
          {d.polifuste_sin_dap_equivalente > 0 && (
            <span>{d.polifuste_sin_dap_equivalente} árbol(es) polifuste sin DAP equivalente (fórmula pendiente).</span>
          )}
          {d.empates_fecha_maxima > 0 && (
            <span>{d.empates_fecha_maxima} árbol(es) con mediciones empatadas en fecha máxima (requiere resolución).</span>
          )}
          {d.clase_edad.length > 0 && (
            <span>Clase de edad: {d.clase_edad.map((c) => `${c.clase} (${c.n})`).join(" · ")}</span>
          )}
        </div>
      </div>

      <div className="card card--pad">
        <h3 className="sivu-toolbar__title" style={{ marginBottom: 4 }}>Indicadores del modelo SIVU</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
          Indicadores contemplados en la hoja INDICES del modelo y su estado de cálculo. Ningún resultado se estima sin
          metodología aprobada y datos suficientes.
        </p>
        <SivuTable
          columns={[
            { label: "Indicador", width: "32%" },
            { label: "Estado", width: "24%" },
            { label: "Motivo / condición", width: "44%" },
          ]}
        >
          {MODEL_INDICATORS.map((m) => (
            <tr key={m.nombre}>
              <td className="sivu-table__strong" style={{ whiteSpace: "normal" }}>{m.nombre}</td>
              <td>
                <span className={`badge badge--${m.estado.includes("disponible") ? "green" : "slate"}`} style={{ whiteSpace: "normal" }}>
                  {m.estado}
                </span>
              </td>
              <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{m.motivo}</td>
            </tr>
          ))}
        </SivuTable>
      </div>
    </div>
  );
}
