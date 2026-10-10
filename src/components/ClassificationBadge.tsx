export type ClassificationLevel = "Extremo" | "Crítico" | "Alto" | "Medio" | "Moderado" | "Bajo" | string;

export function getClassificationTone(level: ClassificationLevel): "critical" | "high" | "medium" | "low" | "neutral" {
  const norm = (level || "").toLowerCase().trim();
  // "Extremo" (escala de riesgo del árbol, R04) y "Crítico" (escala de
  // conflicto de infraestructura, M04) son dominios distintos que
  // comparten el mismo tono visual de máxima severidad.
  if (norm === "extremo" || norm === "crítico" || norm === "critico") return "critical";
  if (norm === "alto") return "high";
  if (norm === "medio" || norm === "moderado") return "medium";
  if (norm === "bajo") return "low";
  return "neutral";
}

/**
 * Badge accesible para clasificaciones ordinales de SIVU (INV-1C).
 * Garantiza cumplimiento de accesibilidad: nunca comunica la categoría solo por color,
 * sino combinando texto explícito + indicador de punto + token semántico.
 */
export function ClassificationBadge({
  level,
  label,
  className = "",
}: {
  level: ClassificationLevel;
  label?: string;
  className?: string;
}) {
  const tone = getClassificationTone(level);
  const textToShow = label ?? level;

  if (tone === "neutral") {
    return (
      <span className={`status-pill ${className}`}>
        {textToShow}
      </span>
    );
  }

  return (
    <span
      className={`classification-badge classification-badge--${tone} ${className}`}
      role="status"
      aria-label={`Clasificación: ${textToShow}`}
    >
      <span className="classification-badge__dot" aria-hidden="true" />
      <span>{textToShow}</span>
    </span>
  );
}

/**
 * Badge específico para clase de edad según el dominio oficial de SIVU:
 * Joven | Semimaduro | Tempranamente maduro | Maduro | Sobremaduro
 */
export function AgeClassBadge({
  claseEdad,
}: {
  claseEdad?: string | null;
}) {
  if (!claseEdad) {
    return <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>Sin registro</span>;
  }

  return (
    <span className="status-pill">
      🌱 {claseEdad}
    </span>
  );
}
