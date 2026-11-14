import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ArbolInventario } from "../../types/inventory";
import { descargarPlacasQr, descargarQrArbol, type OpcionesQrArbol } from "../../api/projects";
import { Icon } from "../Icons";

/**
 * Pestaña «Placas QR» de Conecta (maqueta SIVU Lab, solo la disposición):
 * una fila por árbol con su placa y, a la derecha, la vista previa de la
 * placa elegida. Solo datos reales de B1: el `qr_token` (que B1 entrega
 * solo al Usuario municipal) y el ciclo de vida, que decide si el árbol
 * entra al PDF (el backend genera una placa por árbol activo, CC-062).
 * No hay escaneos, reportes por placa ni estado de la placa: esos datos no
 * existen (auditoría de Conecta, decisiones pendientes). El QR lo arma
 * siempre el backend con su dirección pública: la vista previa muestra el
 * SVG real del árbol (módulos cuadrados, margen de 4 módulos) y se puede
 * descargar en SVG o STL para modelarlo o imprimirlo en 3D.
 */

/**
 * QR ya generados en esta sesión (id del árbol → URL del SVG): al volver a
 * un árbol la vista previa aparece al tiro, sin pedirlo de nuevo.
 */
const qrCache = new Map<string, string>();

function guardar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function PlacasQr({ projectId, arboles, municipal }: { projectId: string; arboles: ArbolInventario[]; municipal: boolean }) {
  const [elegido, setElegido] = useState<string>("");
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const arbol = arboles.find((a) => a.id === elegido) ?? arboles[0] ?? null;

  async function descargarPlacas() {
    setDescargando(true);
    setErrorPdf(null);
    try {
      guardar(await descargarPlacasQr(projectId), "placas-qr.pdf");
    } catch (err: unknown) {
      setErrorPdf(err instanceof Error ? err.message : "No se pudo generar el PDF de placas.");
    } finally {
      setDescargando(false);
    }
  }

  // Vista previa: el SVG real del árbol elegido (solo Usuario municipal y
  // árbol activo; para los demás el backend no entrega el QR).
  const conQr = municipal && !!arbol?.qr_token && arbol.estado_ciclo_vida === "activo";
  // El SVG se lee del caché en cada render: así nunca se ve, ni por un
  // instante, el QR de otro árbol. `setCargados` solo fuerza el render
  // cuando llega uno nuevo.
  const [, setCargados] = useState(0);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const svgUrl = conQr && arbol ? (qrCache.get(arbol.id) ?? null) : null;
  useEffect(() => {
    setErrorQr(null);
    if (!conQr || !arbol || qrCache.has(arbol.id)) return;
    let vigente = true;
    const id = arbol.id;
    descargarQrArbol(projectId, id, { formato: "svg" })
      .then((blob) => {
        qrCache.set(id, URL.createObjectURL(blob));
        if (vigente) setCargados((n) => n + 1);
      })
      .catch((err: unknown) => vigente && setErrorQr(err instanceof Error ? err.message : "No se pudo generar el QR."));
    return () => {
      vigente = false;
    };
  }, [projectId, arbol?.id, conQr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Medidas para 3D (mm). El lado incluye el margen blanco del QR.
  const [lado, setLado] = useState(80);
  const [base, setBase] = useState(2);
  const [relieve, setRelieve] = useState(1);
  const [bajando3d, setBajando3d] = useState<string | null>(null);

  async function descargar3d(clave: string, opciones: OpcionesQrArbol) {
    if (!arbol) return;
    setBajando3d(clave);
    setErrorQr(null);
    try {
      const blob = await descargarQrArbol(projectId, arbol.id, { lado_mm: lado, base_mm: base, relieve_mm: relieve, ...opciones });
      const sufijo = opciones.formato === "stl" ? `-${opciones.modo}.stl` : ".svg";
      guardar(blob, `qr-${arbol.tree_code}${sufijo}`);
    } catch (err: unknown) {
      setErrorQr(err instanceof Error ? err.message : "No se pudo descargar el QR.");
    } finally {
      setBajando3d(null);
    }
  }

  return (
    <div className="sivu-placas">
      <section className="sivu-panel sivu-placas__list">
        <div className="sivu-placas__head">
          <h2>{arboles.length} árboles · una placa por árbol activo</h2>
          {municipal && (
            <button type="button" className="btn btn-primary" onClick={descargarPlacas} disabled={descargando}>
              <Icon name="download" size={15} /> {descargando ? "Generando PDF…" : "Descargar placas (PDF)"}
            </button>
          )}
        </div>
        {errorPdf && (
          <p className="sivu-state sivu-state--error" role="alert">
            <Icon name="alert" size={13} /> {errorPdf}
          </p>
        )}
        <div className="sivu-placas__scroll">
          <table className="sivu-table sivu-placas__table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Árbol</th>
                <th>Ubicación</th>
                <th>Ciclo de vida</th>
                <th>En el PDF</th>
              </tr>
            </thead>
            <tbody>
              {arboles.map((a) => {
                const activo = a.estado_ciclo_vida === "activo";
                return (
                  <tr key={a.id} className={a.id === arbol?.id ? "is-sel" : ""} onClick={() => setElegido(a.id)}>
                    <td className="sivu-placas__code">
                      <button type="button" aria-pressed={a.id === arbol?.id} onClick={() => setElegido(a.id)}>
                        {a.tree_code}
                      </button>
                    </td>
                    <td>
                      <strong>{a.nombre_comun ?? a.especie_cientifica ?? "Sin especie"}</strong>
                      {a.nombre_comun && a.especie_cientifica && <em>{a.especie_cientifica}</em>}
                    </td>
                    <td className="sivu-placas__place">{a.ubicacion_descriptiva ?? a.sector ?? "—"}</td>
                    <td>{a.ciclo_vida?.etiqueta ?? a.estado_ciclo_vida}</td>
                    <td>
                      <span className={`sivu-placas__pill ${activo ? "is-on" : ""}`}>{activo ? "Incluida" : "No incluida"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {arbol && (
        <aside className="sivu-panel sivu-placas__preview" aria-label="Vista previa de la placa">
          <div className="sivu-placas__phead">
            <div>
              <span className="sivu-placas__eyebrow">{arbol.tree_code}</span>
              <h2>Vista previa de la placa</h2>
            </div>
            <span className={`sivu-placas__pill ${arbol.estado_ciclo_vida === "activo" ? "is-on" : ""}`}>
              {arbol.estado_ciclo_vida === "activo" ? "En el PDF" : "Fuera del PDF"}
            </span>
          </div>

          <div className="sivu-placa">
            {svgUrl ? (
              <div className="sivu-placa__qr sivu-placa__qr--real">
                <img src={svgUrl} alt={`Código QR de ${arbol.tree_code}`} />
              </div>
            ) : conQr && !errorQr ? (
              <div className="sivu-placa__qr sivu-placa__qr--cargando" role="status" aria-label="Generando el código QR" />
            ) : (
              <div className="sivu-placa__qr" aria-hidden="true">
                <small>{municipal ? "Sin placa: el árbol no está activo" : "El código se imprime en el PDF"}</small>
              </div>
            )}
            <div className="sivu-placa__info">
              <span className="sivu-placa__brand">Valpo Verde Conecta</span>
              <strong className="sivu-placa__name">{arbol.nombre_comun ?? arbol.especie_cientifica ?? "Sin especie"}</strong>
              {arbol.nombre_comun && arbol.especie_cientifica && <em className="sivu-placa__sci">{arbol.especie_cientifica}</em>}
              <span className="sivu-placa__code">{arbol.tree_code}</span>
            </div>
          </div>

          {arbol.estado_ciclo_vida !== "activo" && (
            <p className="sivu-state">Este árbol no está activo: el PDF no le genera placa.</p>
          )}

          {errorQr && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {errorQr}
            </p>
          )}

          {conQr && (
            <div className="sivu-placas__3d">
              <span
                className="sivu-placas__eyebrow"
                title="Módulos cuadrados sobre una grilla regular, con 4 módulos de margen blanco. El SVG trae la placa y los módulos como piezas separadas; el STL es la placa lista para imprimir."
              >
                Archivos para 3D · medidas en mm
              </span>
              <div className="sivu-placas__medidas">
                <label>
                  Lado
                  <input type="number" min={20} max={300} step={1} value={lado} onChange={(e) => setLado(Number(e.target.value))} />
                </label>
                <label>
                  Base
                  <input type="number" min={0.6} max={10} step={0.2} value={base} onChange={(e) => setBase(Number(e.target.value))} />
                </label>
                <label>
                  Relieve
                  <input type="number" min={0.4} max={10} step={0.2} value={relieve} onChange={(e) => setRelieve(Number(e.target.value))} />
                </label>
              </div>
              <div className="sivu-placas__botones">
                <button type="button" className="btn btn-secondary" disabled={!!bajando3d} onClick={() => descargar3d("svg", { formato: "svg" })}>
                  <Icon name="download" size={13} /> {bajando3d === "svg" ? "…" : "SVG"}
                </button>
                <button type="button" className="btn btn-secondary" disabled={!!bajando3d} onClick={() => descargar3d("relieve", { formato: "stl", modo: "relieve" })}>
                  <Icon name="download" size={13} /> {bajando3d === "relieve" ? "…" : "STL relieve"}
                </button>
                <button type="button" className="btn btn-secondary" disabled={!!bajando3d} onClick={() => descargar3d("grabado", { formato: "stl", modo: "grabado" })}>
                  <Icon name="download" size={13} /> {bajando3d === "grabado" ? "…" : "STL grabado"}
                </button>
              </div>
            </div>
          )}

          {municipal && arbol.qr_token ? (
            <div className="sivu-placas__meta">
              <div>
                <span>Código de la placa</span>
                <code title={arbol.qr_token}>{arbol.qr_token}</code>
              </div>
              <Link className="sivu-placas__open" to={`/arbol/${arbol.qr_token}`} target="_blank" rel="noopener" title="Abrir su ficha pública">
                <Icon name="eye" size={14} /> Ficha pública
              </Link>
            </div>
          ) : (
            <p className="sivu-state">Solo el Usuario municipal ve el código de la placa y descarga el PDF (CC-062).</p>
          )}
        </aside>
      )}
    </div>
  );
}
