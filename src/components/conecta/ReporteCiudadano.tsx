import { useState, type FormEvent } from "react";
import { Icon } from "../Icons";
import { rutValido } from "../../lib/rut";

/**
 * Formulario «Reportar un problema» (PR-022 v1.0 y v2.0; CC-036, CC-062):
 * nombre, RUT con dígito verificador, tipo, descripción y al menos una
 * fotografía; sin ningún dato de contacto. El árbol va identificado por el
 * QR. El reporte llega al municipio como incidencia de la comunidad, en el
 * módulo Incidencias. Validar el RUT aquí solo ayuda a quien escribe: quien decide es el
 * backend.
 *
 * Dependencias que hoy faltan (no se simulan): el endpoint público del
 * formulario (#62) y el catálogo de tipos de incidencia (D-180) en la API;
 * sin ellos el envío queda deshabilitado y la pantalla lo explica.
 */
export function ReporteCiudadano({
  nombreArbol,
  qrToken,
  vistaPrevia,
  onCerrar,
}: {
  nombreArbol: string;
  qrToken: string | null;
  vistaPrevia: boolean;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const rutOk = rut.trim() === "" || rutValido(rut);

  // El tipo de incidencia (D-180) es un catálogo del backend que la API pública
  // todavía no entrega: sin él, el reporte no se puede completar.
  const tiposDisponibles = false;
  const puedeEnviar = !vistaPrevia && !!qrToken && tiposDisponibles;

  function enviar(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <div className="vvc-sheet-bg" role="presentation" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="vvc-sheet" aria-label="Reportar un problema" onSubmit={enviar}>
        <div className="vvc-sheet__head">
          <div>
            <h2>Reportar un problema</h2>
            <p>
              <Icon name="pin" size={13} /> {nombreArbol} · identificado por su QR. Tu reporte llega al equipo municipal como incidencia.
            </p>
          </div>
          <button type="button" className="vvc-icon-btn" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="vvc-sheet__body">
          <div className="vvc-field">
            <label htmlFor="vvc-tipo">¿Qué pasa con el árbol?</label>
            <select id="vvc-tipo" disabled>
              <option>Las opciones se habilitarán pronto</option>
            </select>
          </div>

          <div className="vvc-field">
            <label htmlFor="vvc-desc">Cuéntanos qué viste</label>
            <textarea id="vvc-desc" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Por ejemplo: hay una rama quebrada sobre la vereda." />
          </div>

          <div className="vvc-field">
            <span className="vvc-field__label">Fotografía (al menos una)</span>
            <label className="vvc-photo">
              <Icon name="camera" size={20} />
              <span>{fotos.length ? `${fotos.length} foto(s) lista(s)` : "Tomar o elegir una foto"}</span>
              <input type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => setFotos(Array.from(e.target.files ?? []))} />
            </label>
            <small>Antes de guardarla quitamos la ubicación y los datos de tu cámara.</small>
          </div>

          <div className="vvc-row2">
            <div className="vvc-field">
              <label htmlFor="vvc-nombre">Tu nombre</label>
              <input id="vvc-nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="vvc-field">
              <label htmlFor="vvc-rut">Tu RUT</label>
              <input id="vvc-rut" inputMode="text" placeholder="12.345.678-9" value={rut} onChange={(e) => setRut(e.target.value)} aria-invalid={!rutOk} />
              {!rutOk && <small className="vvc-err">El dígito verificador no corresponde.</small>}
            </div>
          </div>

          <p className="vvc-privacy">
            <Icon name="lock" size={14} /> Tu nombre y tu RUT solo los ve el equipo municipal y se borran cuando terminamos de revisar el reporte. No te pediremos ningún otro dato.
          </p>

          {!puedeEnviar && (
            <p className="vvc-pending" role="status">
              <Icon name="clock" size={14} />{" "}
              {vistaPrevia
                ? "Vista previa: este formulario no envía reportes."
                : "Muy pronto podrás enviar tu reporte desde aquí. Estamos terminando de conectarlo con el municipio."}
            </p>
          )}
        </div>

        <div className="vvc-sheet__foot">
          <button type="submit" className="vvc-btn" disabled={!puedeEnviar}>
            Enviar reporte
          </button>
        </div>
      </form>
    </div>
  );
}
