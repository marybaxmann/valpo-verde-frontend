import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProject } from "../api/projects";
import type { Project } from "../types/project";

interface CurrentProjectState {
  projectId: string | null;
  project: Project | null;
  /** Mensaje real del backend si GET /api/sivu/projects/:id falló. */
  projectError: string | null;
}

const CurrentProjectContext = createContext<CurrentProjectState>({ projectId: null, project: null, projectError: null });

/**
 * Proyecto en el que trabaja el usuario (workspace), resuelto una sola vez
 * por el layout a partir de la URL. Lo usan el sidebar ("Proyecto actual")
 * y las pantallas que solo necesitan su nombre, sin repetir la petición.
 * Si GET /api/projects/:id falla, `project` queda en null: cada página
 * con datos propios sigue mostrando su propio error real.
 */
export function CurrentProjectProvider({ projectId, children }: { projectId: string | null; children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    setProject(null);
    if (!projectId) return;
    let cancelled = false;
    getProject(projectId)
      .then((data) => {
        if (!cancelled) setProject(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject(null);
        setFailed({ id: projectId, message: err instanceof Error ? err.message : "No se pudo cargar el proyecto." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <CurrentProjectContext.Provider
      value={{
        projectId,
        project: project && project.id === projectId ? project : null,
        projectError: failed && failed.id === projectId ? failed.message : null,
      }}
    >
      {children}
    </CurrentProjectContext.Provider>
  );
}

export function useCurrentProject(): CurrentProjectState {
  return useContext(CurrentProjectContext);
}
