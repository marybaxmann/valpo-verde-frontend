import { useEffect, useState } from "react";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarFotos } from "../api/inspections";
import type { Diagnostico } from "../types/diagnostico";
import type { FotoInspeccion } from "../types/inspection";
import { fechaChile } from "../lib/dates";
import { Icon } from "./Icons";
import { PendingNotice } from "./PendingNotice";

/**
 * Fotografías del árbol en su ficha: las de la última inspección finalizada
 * (D-27, cuatro vistas), leídas con `diagnosticos?tree_id=` → `inspection_id`
 * → `GET /api/sivu/inspections/:id/photos`. Las fotos de inspecciones
 * anteriores esperan la ficha completa del árbol (B2). Las URL son firmadas
 * y de corta duración: se abren tal cual, no se guardan.
 */
export function TreePhotos({ projectId, treeId }: { projectId: string; treeId: string }) {
  const [estado, setEstado] = useState<
    { treeId: string; diag: Diagnostico | null; fotos: FotoInspeccion[] } | { treeId: string; error: string } | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    listarDiagnosticos(projectId, treeId)
      .then(async (diags) => {
        const diag = diags.find((d) => d.tree_id === treeId) ?? null;
        const fotos = diag ? await listarFotos(diag.inspection_id) : [];
        if (!cancelled) setEstado({ treeId, diag, fotos });
      })
      .catch((err: unknown) => {
        if (!cancelled) setEstado({ treeId, error: err instanceof Error ? err.message : "No se pudieron cargar las fotografías." });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, treeId]);

  const actual = estado?.treeId === treeId ? estado : null;

  return (
    <section className="sivu-treephotos" aria-label="Fotografías del árbol">
      <h3>Fotografías</h3>
      {!actual && <p className="sivu-state">Cargando fotografías…</p>}
      {actual && "error" in actual && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {actual.error}
        </p>
      )}
      {actual && "diag" in actual && !actual.diag && (
        <p className="sivu-state">Sin inspección finalizada: todavía no hay fotografías.</p>
      )}
      {actual && "diag" in actual && actual.diag && (
        <>
          <p className="sivu-treephotos__meta">
            {actual.diag.tipo_inspeccion?.etiqueta ?? "Inspección"} {actual.diag.codigo_inspeccion ?? ""}
            {actual.diag.fecha_inspeccion ? ` · ${fechaChile(actual.diag.fecha_inspeccion)}` : ""}
          </p>
          {actual.fotos.length === 0 ? (
            <p className="sivu-state">La inspección no tiene fotografías.</p>
          ) : (
            <ul className="sivu-treephotos__grid">
              {actual.fotos.map((f) => (
                <li key={f.id}>
                  <a href={f.url} target="_blank" rel="noreferrer" title="Abrir en tamaño completo">
                    <img src={f.url} alt={`Vista ${f.vista ?? "sin vista"} del árbol`} loading="lazy" />
                  </a>
                  <span>{f.vista ?? "sin vista"}</span>
                </li>
              ))}
            </ul>
          )}
          <PendingNotice compact what="los nombres visibles de las vistas ni las fotos de inspecciones anteriores" refs="B16 · B2" />
        </>
      )}
    </section>
  );
}
