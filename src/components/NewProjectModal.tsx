import { lazy, Suspense, useState } from "react";
import { createProject, previewSector } from "../api/projects";
import { ApiError } from "../api/client";
import { getArcgisApiKey } from "../lib/arcgis";
import type { CreateProjectResult, GeometriaSectorArchivo, VistaPreviaSector } from "../types/project";
import { Modal } from "./Modal";
import { Icon } from "./Icons";

const SectorPreviewMap = lazy(() => import("./SectorPreviewMap"));

/** El backend acepta cuerpos JSON de hasta 8 MB; en base64 el archivo crece un tercio. */
const TAMANO_MAXIMO = 5 * 1024 * 1024;

const ESTADO_LABEL = { valida: "Válida", invalida: "No válida", excluida: "No es superficie" } as const;

/** Contenido del archivo en base64, sin el prefijo `data:…;base64,`. */
function leerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Crear un proyecto con su sector (D-254, D-255, D-264; CC-047). Solo el
 * Administrador. El sector se delimita con un KML/KMZ: el backend lo lee
 * en la vista previa (sin guardar nada), el Administrador elige las
 * superficies válidas que integran el sector y recién ahí se crea el
 * proyecto. Qué es válido, inválido o excluido lo decide el backend.
 */
export function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: CreateProjectResult) => void }) {
  const apiKey = getArcgisApiKey();
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [nombreSector, setNombreSector] = useState("");

  const [archivo, setArchivo] = useState<{ nombre: string; datos: Omit<GeometriaSectorArchivo, "indicesSeleccionados"> } | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [vista, setVista] = useState<VistaPreviaSector | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  async function elegirArchivo(file: File | undefined) {
    setArchivo(null);
    setVista(null);
    setSeleccion(new Set());
    setErrorArchivo(null);
    setErrorCrear(null);
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "kml" && ext !== "kmz") {
      setErrorArchivo("El sector se carga desde un archivo KML o KMZ.");
      return;
    }
    if (file.size > TAMANO_MAXIMO) {
      setErrorArchivo("El archivo pesa más de 5 MB. Simplifica el levantamiento o exporta solo el sector.");
      return;
    }
    setLeyendo(true);
    try {
      const datos = { formato: ext, archivoBase64: await leerBase64(file) } as const;
      const v = await previewSector(datos);
      setArchivo({ nombre: file.name, datos });
      setVista(v);
      // Ninguna superficie se elige por defecto (CC-047): las elige el Administrador.
    } catch (err) {
      setErrorArchivo(mensaje(err, "No se pudo leer el archivo."));
    } finally {
      setLeyendo(false);
    }
  }

  function alternar(indice: number) {
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(indice)) n.delete(indice);
      else n.add(indice);
      return n;
    });
    setErrorCrear(null);
  }

  const faltaNombre = !nombreProyecto.trim() || !nombreSector.trim();
  const puedeCrear = !faltaNombre && !!archivo && seleccion.size > 0 && !creando;

  async function crear() {
    if (!puedeCrear || !archivo) return;
    setCreando(true);
    setErrorCrear(null);
    try {
      const r = await createProject({
        nombre_proyecto: nombreProyecto.trim(),
        sector: {
          nombre_sector: nombreSector.trim(),
          geometria_sector: { ...archivo.datos, indicesSeleccionados: [...seleccion].sort((a, b) => a - b) },
        },
      });
      onCreated(r);
    } catch (err) {
      setErrorCrear(mensaje(err, "No se pudo crear el proyecto."));
      setCreando(false);
    }
  }

  return (
    <Modal
      title="Crear proyecto"
      onClose={creando ? () => {} : onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={creando}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={crear} disabled={!puedeCrear}>
            {creando ? "Creando…" : "Crear proyecto"}
          </button>
        </>
      }
    >
      <div className="sivu-newproject">
        <div className="field">
          <label htmlFor="np-nombre">Nombre del proyecto</label>
          <input id="np-nombre" type="text" value={nombreProyecto} onChange={(e) => setNombreProyecto(e.target.value)} disabled={creando} />
        </div>
        <div className="field">
          <label htmlFor="np-sector">Nombre del sector</label>
          <input id="np-sector" type="text" value={nombreSector} onChange={(e) => setNombreSector(e.target.value)} disabled={creando} />
        </div>
        <div className="field">
          <label htmlFor="np-archivo">Delimitación del sector (KML o KMZ)</label>
          <input
            id="np-archivo"
            type="file"
            accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
            onChange={(e) => elegirArchivo(e.target.files?.[0])}
            disabled={creando || leyendo}
          />
          <span className="hint">Se revisa el archivo antes de guardar; nada se crea hasta que confirmes.</span>
        </div>

        {leyendo && <p className="sivu-state">Leyendo el archivo…</p>}
        {errorArchivo && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {errorArchivo}
          </p>
        )}

        {vista && archivo && (
          <section className="sivu-newproject__preview" aria-label="Vista previa del sector">
            <p className="sivu-newproject__summary">
              <strong>{archivo.nombre}</strong>: {vista.validas} válida(s), {vista.invalidas} no válida(s), {vista.excluidas} punto(s) o línea(s) que no integran el sector.
            </p>
            {apiKey && vista.superficies.some((s) => s.geometria) && (
              <Suspense fallback={<p className="sivu-state">Cargando mapa…</p>}>
                <SectorPreviewMap apiKey={apiKey} superficies={vista.superficies} seleccion={seleccion} />
              </Suspense>
            )}
            {vista.validas === 0 ? (
              <p className="sivu-state sivu-state--error" role="alert">
                <Icon name="alert" size={13} /> El archivo no tiene ninguna superficie válida para el sector.
              </p>
            ) : (
              <p className="sivu-newproject__hint">Marca las superficies que integran el sector.</p>
            )}
            <ul className="sivu-newproject__list">
              {vista.superficies.map((s) => {
                const elegible = s.estado === "valida";
                return (
                  <li key={s.indice} className={`is-${s.estado}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={seleccion.has(s.indice)}
                        onChange={() => alternar(s.indice)}
                        disabled={!elegible || creando}
                      />
                      <span className="sivu-newproject__name">{s.nombre ?? `Elemento ${s.indice + 1}`}</span>
                      <span className="sivu-newproject__estado">{ESTADO_LABEL[s.estado]}</span>
                    </label>
                    {s.motivo && <small>{s.motivo}</small>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {errorCrear && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {errorCrear}
          </p>
        )}
        {!creando && archivo && vista && vista.validas > 0 && seleccion.size === 0 && (
          <p className="sivu-newproject__hint">Falta elegir al menos una superficie.</p>
        )}
        {!creando && faltaNombre && archivo && <p className="sivu-newproject__hint">Faltan el nombre del proyecto y el del sector.</p>}
      </div>
    </Modal>
  );
}

function mensaje(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError && err.status === 403) return "Solo el Administrador crea proyectos.";
  return err instanceof Error && err.message ? err.message : porDefecto;
}
