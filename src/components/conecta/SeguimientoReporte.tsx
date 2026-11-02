import { useState, type FormEvent } from "react";
import { Icon } from "../Icons";
import { consultarSeguimiento } from "../../api/publico";

/**
 * Consulta del estado de un reporte con su código de seguimiento
 * (`POST /api/sivu/conecta/seguimiento`; el código va en el cuerpo). Solo
 * devuelve el estado de la incidencia, nunca otros datos. En la vista previa
 * no consulta nada.
 */
export function SeguimientoReporte({ vistaPrevia, onCerrar }: { vistaPrevia: boolean; onCerrar: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function consultar(e: FormEvent) {
    e.preventDefault();
    if (vistaPrevia || codigo.trim() === "") return;
    setConsultando(true);
    setError(null);
    setEstado(null);
    try {
      const r = await consultarSeguimiento(codigo.trim());
      setEstado(r.estado_incidencia.etiqueta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No pudimos consultar tu reporte. Inténtalo de nuevo.");
    } finally {
      setConsultando(false);
    }
  }

  return (
    <div className="vvc-sheet-bg" role="presentation" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="vvc-sheet" aria-label="Consultar mi reporte" onSubmit={consultar}>
        <div className="vvc-sheet__head">
          <div>
            <h2>Consultar mi reporte</h2>
            <p>Escribe el código que te entregamos al enviar tu reporte.</p>
          </div>
          <button type="button" className="vvc-icon-btn" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="vvc-sheet__body">
          <div className="vvc-field">
            <label htmlFor="vvc-codigo">Código de seguimiento</label>
            <input id="vvc-codigo" autoComplete="off" spellCheck={false} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          {estado && (
            <div className="vvc-code" role="status">
              <span className="vvc-field__label">Estado de tu reporte</span>
              <strong className="vvc-code__value">{estado}</strong>
            </div>
          )}
          {error && (
            <p className="vvc-pending vvc-pending--error" role="alert">
              <Icon name="alert" size={14} /> {error}
            </p>
          )}
          {vistaPrevia && (
            <p className="vvc-pending" role="status">
              <Icon name="clock" size={14} /> Vista previa: aquí no se consultan reportes.
            </p>
          )}
        </div>

        <div className="vvc-sheet__foot">
          <button type="submit" className="vvc-btn" disabled={vistaPrevia || consultando || codigo.trim() === ""}>
            {consultando ? "Consultando…" : "Consultar"}
          </button>
        </div>
      </form>
    </div>
  );
}
