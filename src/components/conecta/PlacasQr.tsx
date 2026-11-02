import { useState } from "react";
import { Link } from "react-router-dom";
import type { ArbolInventario } from "../../types/inventory";
import { descargarPlacasQr } from "../../api/projects";
import { Icon } from "../Icons";

/**
 * Pestaña «Placas QR» de Conecta (maqueta SIVU Lab, solo la disposición):
 * una fila por árbol con su placa y, a la derecha, la vista previa de la
 * placa elegida. Solo datos reales de B1: el `qr_token` (que B1 entrega
 * solo al Usuario municipal) y el ciclo de vida, que decide si el árbol
 * entra al PDF (el backend genera una placa por árbol activo, CC-062).
 * No hay escaneos, reportes por placa ni estado de la placa: esos datos no
 * existen (auditoría de Conecta, decisiones pendientes). El QR impreso solo
 * existe en el PDF, que arma el backend con su dirección pública.
 */
export function PlacasQr({ projectId, arboles, municipal }: { projectId: string; arboles: ArbolInventario[]; municipal: boolean }) {
  const [elegido, setElegido] = useState<string>("");
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const arbol = arboles.find((a) => a.id === elegido) ?? arboles[0] ?? null;

  async function descargarPlacas() {
    setDescargando(true);
    setErrorPdf(null);
    try {
      const pdf = await descargarPlacasQr(projectId);
      const url = URL.createObjectURL(pdf);
      const a = document.createElement("a");
      a.href = url;
      a.download = "placas-qr.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      setErrorPdf(err instanceof Error ? err.message : "No se pudo generar el PDF de placas.");
    } finally {
      setDescargando(false);
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
            <span className="sivu-placa__brand">Valpo Verde Conecta</span>
            <div className="sivu-placa__qr" aria-hidden="true">
              <Icon name="qr" size={54} />
              <small>El código se imprime en el PDF</small>
            </div>
            <strong className="sivu-placa__name">{arbol.nombre_comun ?? arbol.especie_cientifica ?? "Sin especie"}</strong>
            {arbol.nombre_comun && arbol.especie_cientifica && <em className="sivu-placa__sci">{arbol.especie_cientifica}</em>}
            <span className="sivu-placa__code">{arbol.tree_code}</span>
          </div>

          {arbol.estado_ciclo_vida !== "activo" && (
            <p className="sivu-state">Este árbol no está activo: el PDF no le genera placa.</p>
          )}

          {municipal && arbol.qr_token ? (
            <div className="sivu-placas__meta">
              <div>
                <span>Código de la placa</span>
                <code title={arbol.qr_token}>{arbol.qr_token}</code>
              </div>
              <Link className="sivu-placas__open" to={`/arbol/${arbol.qr_token}`} target="_blank" rel="noopener">
                <Icon name="eye" size={14} /> Abrir su ficha pública
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
