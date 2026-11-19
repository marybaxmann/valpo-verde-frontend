import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { listarDiagnosticos } from "../api/diagnosticos";
import { listarFotosArbol, type FotoArbol, type OrigenFoto } from "../api/fichaArbol";
import { listarFotos } from "../api/inspections";
import { obtenerCatalogos } from "../api/catalogs";
import type { Diagnostico } from "../types/diagnostico";
import { fechaChile } from "../lib/dates";
import { Icon } from "./Icons";
import { TreeDiagnosis } from "./TreeDiagnosis";

/** Lo mínimo que el visor necesita de una foto. */
export interface FotoVisible {
  id: string;
  vista: string | null;
  url: string;
}

const TITULO_ORIGEN: Record<OrigenFoto, string> = {
  registro: "Registro del árbol",
  inspeccion: "Inspección",
  mantenimiento: "Mantención",
  incidencia: "Reporte ciudadano",
};

/** Grupo de la galería: el registro, cada inspección, mantención o reportes. */
interface Grupo {
  clave: string;
  titulo: string;
  fotos: FotoArbol[];
}

function agrupar(fotos: FotoArbol[], diag: Diagnostico | null): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const f of fotos) {
    const clave = f.origen === "inspeccion" ? `inspeccion:${f.inspection_id}` : f.origen;
    let titulo = TITULO_ORIGEN[f.origen];
    if (f.origen === "inspeccion" && diag && f.inspection_id === diag.inspection_id) {
      titulo = `${diag.tipo_inspeccion?.etiqueta ?? "Inspección"} ${diag.codigo_inspeccion ?? ""}${diag.fecha_inspeccion ? ` · ${fechaChile(diag.fecha_inspeccion)}` : ""}`;
    }
    const g = grupos.get(clave) ?? { clave, titulo, fotos: [] };
    g.fotos.push(f);
    grupos.set(clave, g);
  }
  // La evaluación vigente primero; después el registro y el resto.
  return [...grupos.values()].sort((a, b) => peso(a.clave, diag) - peso(b.clave, diag));
}

function peso(clave: string, diag: Diagnostico | null): number {
  if (diag && clave === `inspeccion:${diag.inspection_id}`) return 0;
  if (clave === "registro") return 1;
  if (clave.startsWith("inspeccion:")) return 2;
  return 3;
}

/** Backend anterior a la 037 (sin `GET …/trees/:treeId/photos`): solo las fotos de la última inspección finalizada. */
export async function fotosCompatibles(projectId: string, treeId: string, diag: Diagnostico | null): Promise<FotoArbol[]> {
  try {
    return await listarFotosArbol(projectId, treeId);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404) || !diag) throw err;
    const fotos = await listarFotos(diag.inspection_id);
    return fotos.map((f) => ({ ...f, origen: "inspeccion" as const, inspection_id: diag.inspection_id, sha256: null }));
  }
}

/**
 * Fotografías del árbol en su ficha (037): todas las del ejemplar —las de
 * registro, las de cada inspección (D-27 y de detalle), las de mantención y
 * las de reportes ciudadanos—, agrupadas por origen, con la evaluación
 * vigente primero. Las URL son firmadas y de corta duración: se abren tal
 * cual, no se guardan. Al pinchar una foto se abre en un visor sobre el
 * módulo, sin salir de la ficha.
 */
export function TreePhotos({
  projectId,
  treeId,
  conDiagnostico = true,
}: {
  projectId: string;
  treeId: string;
  /** Sin el diagnóstico encima, cuando la ficha ya lo muestra en otra pestaña. */
  conDiagnostico?: boolean;
}) {
  const [estado, setEstado] = useState<
    { treeId: string; diag: Diagnostico | null; fotos: FotoArbol[] } | { treeId: string; error: string } | null
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
        const fotos = await fotosCompatibles(projectId, treeId, diag);
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
  const [abierta, setAbierta] = useState<{ grupo: string; indice: number } | null>(null);
  const grupos = actual && "fotos" in actual ? agrupar(actual.fotos, actual.diag) : [];
  const grupoAbierto = abierta ? grupos.find((g) => g.clave === abierta.grupo) : undefined;

  return (
    <>
    {conDiagnostico && actual && "diag" in actual && actual.diag && <TreeDiagnosis d={actual.diag} />}
    <section className="sivu-treephotos" aria-label="Fotografías del árbol">
      <h3>Fotografías</h3>
      {!actual && <p className="sivu-state">Cargando fotografías…</p>}
      {actual && "error" in actual && (
        <p className="sivu-state sivu-state--error" role="alert">
          <Icon name="alert" size={13} /> {actual.error}
        </p>
      )}
      {actual && "fotos" in actual && actual.fotos.length === 0 && (
        <p className="sivu-state">
          {actual.diag ? "El árbol no tiene fotografías." : "Sin evaluación: el árbol aún no tiene una inspección finalizada ni fotografías."}
        </p>
      )}
      {grupos.map((g) => (
        <div key={g.clave} className="sivu-treephotos__group">
          <p className="sivu-treephotos__meta">
            {g.titulo} · {g.fotos.length} foto{g.fotos.length === 1 ? "" : "s"}
          </p>
          <ul className="sivu-treephotos__grid">
            {g.fotos.map((f, i) => (
              <li key={f.id}>
                <button type="button" className="sivu-treephotos__open" onClick={() => setAbierta({ grupo: g.clave, indice: i })} title="Ver más grande">
                  <img src={f.url} alt={`${vista(f.vista)} del árbol`} loading="lazy" />
                </button>
                <span>{vista(f.vista)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {abierta && grupoAbierto?.fotos[abierta.indice] && (
        <VisorFoto
          fotos={grupoAbierto.fotos}
          indice={abierta.indice}
          etiqueta={vista}
          onCambiar={(i) => setAbierta({ grupo: abierta.grupo, indice: i })}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </section>
    </>
  );
}

/**
 * Foto ampliada en un `<dialog>` modal sobre el módulo: Esc o «Cerrar»
 * vuelven a la ficha; las flechas pasan a la vista anterior o siguiente.
 */
export function VisorFoto({
  fotos,
  indice,
  etiqueta,
  onCambiar,
  onCerrar,
}: {
  fotos: FotoVisible[];
  indice: number;
  etiqueta: (v: string | null) => string;
  onCambiar: (i: number) => void;
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const foto = fotos[indice];
  const hay = fotos.length > 1;
  const ir = (paso: number) => onCambiar((indice + paso + fotos.length) % fotos.length);
  // Inicio del toque o del clic: para distinguir un deslizamiento de un toque
  // y para cerrar solo si el gesto empezó y terminó fuera del visor.
  const inicio = useRef<{ x: number; y: number; fuera: boolean } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const fueraDelVisor = (x: number, y: number) => {
    const r = ref.current?.getBoundingClientRect();
    return !!r && (x < r.left || x > r.right || y < r.top || y > r.bottom);
  };

  return (
    <dialog
      ref={ref}
      className="sivu-photoviewer"
      aria-label={`${etiqueta(foto.vista)} del árbol`}
      onClose={onCerrar}
      onPointerDown={(e) => {
        inicio.current = { x: e.clientX, y: e.clientY, fuera: fueraDelVisor(e.clientX, e.clientY) };
      }}
      onPointerUp={(e) => {
        const i = inicio.current;
        inicio.current = null;
        if (!i) return;
        const dx = e.clientX - i.x;
        const dy = e.clientY - i.y;
        // Deslizar a los lados cambia de foto; nunca cierra.
        if (hay && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          ir(dx < 0 ? 1 : -1);
          return;
        }
        // Solo un toque que empieza y termina sobre el fondo, fuera del visor, lo cierra.
        if (i.fuera && fueraDelVisor(e.clientX, e.clientY) && Math.abs(dx) < 10 && Math.abs(dy) < 10) onCerrar();
      }}
      onPointerCancel={() => {
        inicio.current = null;
      }}
      onKeyDown={(e) => {
        if (!hay) return;
        if (e.key === "ArrowLeft") ir(-1);
        if (e.key === "ArrowRight") ir(1);
      }}
    >
      <div className="sivu-photoviewer__head">
        <strong>{etiqueta(foto.vista)}</strong>
        {hay && (
          <span>
            {indice + 1} de {fotos.length}
          </span>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCerrar} autoFocus>
          Cerrar
        </button>
      </div>
      <div className="sivu-photoviewer__stage">
        <img key={foto.id} src={foto.url} alt={`${etiqueta(foto.vista)} del árbol`} draggable={false} />
      </div>
      {hay && (
        <div className="sivu-photoviewer__nav">
          <button type="button" className="btn btn-ghost" onClick={() => ir(-1)} aria-label="Foto anterior">
            <Icon name="arrow-left" size={15} /> <span>Anterior</span>
          </button>
          <span className="sivu-photoviewer__dots" aria-hidden="true">
            {fotos.map((f, i) => (
              <i key={f.id} className={i === indice ? "is-on" : ""} />
            ))}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => ir(1)} aria-label="Foto siguiente">
            <span>Siguiente</span> <Icon name="arrow-right" size={15} />
          </button>
        </div>
      )}
    </dialog>
  );
}
