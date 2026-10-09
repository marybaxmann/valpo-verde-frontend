import type { ReactNode } from "react";
import { useCurrentProject } from "../hooks/useCurrentProject";
import { Icon, type IconName } from "./Icons";
import { StatCard, StatGrid } from "./StatCard";
import { SivuTable, type SivuColumn } from "./SivuTable";

export interface ManagementModuleConfig {
  title: string;
  subtitle: string;
  icon: IconName;
  flow: { title: string; desc: string }[];
  summaryLabels: string[];
  listTitle: string;
  actionLabel: string;
  searchPlaceholder: string;
  filters: { placeholder: string; options: string[] }[];
  columns: SivuColumn[];
  emptyTitle: string;
  emptyText: string;
}

/**
 * Pantalla de gestión sin mapa (Mantención, Incidencias): flujo del
 * proceso, resumen, barra de herramientas, filtros y Tabla SIVU. Los datos
 * (indicadores, filas, búsqueda y filtros) los entrega cada página desde
 * su endpoint real; un indicador sin valor calculable se muestra como "—".
 */
export function ManagementModule({
  config,
  statValues,
  loading = false,
  error,
  feedback,
  onAction,
  search,
  filterValues,
  onFilterChange,
  hasRows,
  noMatches,
  children,
}: {
  config: ManagementModuleConfig;
  statValues?: (number | null)[];
  loading?: boolean;
  error?: string | null;
  feedback?: string | null;
  onAction?: () => void;
  search?: { value: string; onChange: (v: string) => void };
  filterValues?: string[];
  onFilterChange?: (index: number, value: string) => void;
  /** Hay registros en el proyecto (aunque los filtros oculten todos). */
  hasRows?: boolean;
  /** Hay registros pero ninguno coincide con la búsqueda/filtros. */
  noMatches?: boolean;
  children?: ReactNode;
}) {
  const { project } = useCurrentProject();
  const enabled = Boolean(onAction);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={config.icon} size={20} /> {config.title}
          </h1>
          <p className="page-header__sub">
            {config.subtitle}
            {project ? ` — ${project.name}` : ""}
          </p>
        </div>
      </div>

      {/* Flujo del proceso de gestión */}
      <div className="sivu-flow" aria-label={`Flujo de ${config.title}`}>
        {config.flow.map((step, i) => (
          <div key={step.title} className="sivu-flow__step">
            <span className="sivu-flow__num">{i + 1}</span>
            <span className="sivu-flow__title">{step.title}</span>
            <span className="sivu-flow__desc">{step.desc}</span>
          </div>
        ))}
      </div>

      <StatGrid>
        {config.summaryLabels.map((label, i) => {
          const v = statValues?.[i];
          return (
            <StatCard
              key={label}
              label={label}
              value={v === undefined || v === null ? "—" : v}
              foot={v === undefined || v === null ? "Sin registros" : undefined}
            />
          );
        })}
      </StatGrid>

      <div className="card card--pad">
        <div className="sivu-toolbar">
          <h3 className="sivu-toolbar__title">{config.listTitle}</h3>
          <div className="sivu-toolbar__action">
            {feedback && <span style={{ fontSize: 12, color: "var(--sivu-primary)", fontWeight: 600 }}>✓ {feedback}</span>}
            {!enabled && <span className="sivu-next-stage">Disponible en próxima etapa</span>}
            <button
              className="btn btn-primary btn-sm"
              disabled={!enabled}
              title={enabled ? undefined : "Disponible en próxima etapa"}
              onClick={onAction}
            >
              <Icon name="plus" size={13} />
              {config.actionLabel}
            </button>
          </div>
        </div>

        <div className="sivu-filters">
          <input
            type="text"
            placeholder={config.searchPlaceholder}
            disabled={!search || !hasRows}
            value={search?.value ?? ""}
            onChange={(e) => search?.onChange(e.target.value)}
          />
          {config.filters.map((f, i) => (
            <select
              key={f.placeholder}
              disabled={!onFilterChange || !hasRows}
              value={filterValues?.[i] ?? ""}
              onChange={(e) => onFilterChange?.(i, e.target.value)}
            >
              <option value="">{f.placeholder}</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
        </div>

        {error && (
          <p style={{ color: "var(--classification-critical)", fontSize: 12.5, marginBottom: 10 }}>
            <Icon name="alert" size={12} /> {error}
          </p>
        )}

        <SivuTable
          columns={config.columns}
          empty={
            loading
              ? { icon: config.icon, title: `Cargando ${config.title.toLowerCase()}…` }
              : !hasRows
              ? { icon: config.icon, title: config.emptyTitle, text: config.emptyText }
              : noMatches
              ? { icon: "search", title: "No hay registros que coincidan con la búsqueda o los filtros." }
              : null
          }
        >
          {children}
        </SivuTable>
      </div>
    </div>
  );
}
