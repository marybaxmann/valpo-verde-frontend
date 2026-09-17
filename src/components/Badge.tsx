import React from "react";

export type BadgeTone = "green" | "amber" | "red" | "blue" | "slate";

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function estadoEvaluacionTone(estado: string): BadgeTone {
  if (estado === "Evaluado") return "green";
  if (estado === "Evaluación en curso") return "amber";
  return "slate";
}

export function riesgoTone(riesgo: string | null): BadgeTone {
  switch (riesgo) {
    case "Bajo":
      return "green";
    case "Moderado":
      return "amber";
    case "Alto":
    case "Crítico":
      return "red";
    default:
      return "slate";
  }
}

export function incidenciaEstadoTone(estado: string): BadgeTone {
  if (estado === "Abierta") return "red";
  if (estado === "En revisión") return "amber";
  return "green";
}

export function mantenimientoEstadoTone(estado: string): BadgeTone {
  if (estado === "Programada") return "blue";
  if (estado === "En curso") return "amber";
  return "green";
}

export function prioridadTone(prioridad: string): BadgeTone {
  if (prioridad === "Crítica") return "red";
  if (prioridad === "Alta") return "amber";
  if (prioridad === "Media") return "blue";
  return "slate";
}

export function conflictoEstadoTone(estado: string): BadgeTone {
  if (estado === "Abierto") return "red";
  if (estado === "En gestión") return "amber";
  return "green";
}

export function severidadTone(severidad: string): BadgeTone {
  if (severidad === "Severa") return "red";
  if (severidad === "Moderada") return "amber";
  if (severidad === "Leve") return "blue";
  return "slate";
}
