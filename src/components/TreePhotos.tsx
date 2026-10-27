import { useEffect, useState } from "react";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarFotos } from "../api/inspections";
import { obtenerCatalogos } from "../api/catalogs";
import type { Diagnostico } from "../types/diagnostico";
import type { FotoInspeccion } from "../types/inspection";
import { fechaChile } from "../lib/dates";
import { Icon } from "./Icons";
import { PendingNotice } from "./PendingNotice";
import { TreeDiagnosis } from "./TreeDiagnosis";

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

  const [vistas, setVistas] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    obtenerCatalogos()
      .then((c) => {
        if (!cancelled) setVistas(Object.fromEntries((c.vista_foto ?? []).map((i) => [i.codigo, i.etiqueta])));
      })
      .catch(() => {
        // Sin catálogo se muestra el código.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const vista = (v: string | null) => (v ? vistas[v] ?? v : "sin vista");

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
    <>
    {actual && "diag" in actual && actual.diag && <TreeDiagnosis d={actual.diag} />}
    <section className="sivu-treephotos" aria-label="Fotografías del árbol">
      <h3>Fotografías</h3>
      {!actual && <p className="sivu-state">Cargando fotografías…</p>}
      {actual && "error" in actual && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {actual.error}
        </p>
      )}
      {actual && "diag" in actual && !actual.diag && (
        <p className="sivu-state">Sin evaluación: el árbol aún no tiene una inspección finalizada ni fotografías.</p>
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
                    <img src={f.url} alt={`${vista(f.vista)} del árbol`} loading="lazy" />
                  </a>
                  <span>{vista(f.vista)}</span>
                </li>
              ))}
            </ul>
          )}
          <PendingNotice compact what="las fotos de inspecciones anteriores" refs="B2" />
        </>
      )}
    </section>
    </>
  );
}
