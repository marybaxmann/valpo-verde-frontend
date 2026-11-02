import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "../Icons";
import { rutValido } from "../../lib/rut";
import { reducirFoto } from "../../lib/fotos";
import { enviarReporteCiudadano, obtenerTiposIncidenciaPublicos } from "../../api/publico";
import type { CodigoEtiquetaPublico } from "../../types/fichaPublica";

const MAX_FOTOS = 3;
const NOMBRE_VALIDO = /^[\p{L} ]+$/u;

/**
 * Formulario «Reportar un problema» (PR-022 v1.0 y v2.0; CC-036, CC-062):
 * nombre, RUT con dígito verificador, tipo, descripción y de 1 a 3
 * fotografías; sin ningún dato de contacto. El árbol va identificado por el
 * QR. El reporte llega al municipio como incidencia de la comunidad, en el
 * módulo Incidencias (`POST /api/sivu/conecta/arboles/:qrToken/incidencias`).
 * Validar aquí solo ayuda a quien escribe: quien decide es el backend.
 * En la vista previa (`vistaPrevia`) nunca se envía nada.
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
  const [tipos, setTipos] = useState<CodigoEtiquetaPublico[] | null>(null);
  const [errorTipos, setErrorTipos] = useState(false);
  const [tipo, setTipo] = useState("");
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    obtenerTiposIncidenciaPublicos()
      .then((t) => !cancelado && setTipos(t))
      .catch(() => !cancelado && setErrorTipos(true));
    return () => {
      cancelado = true;
    };
  }, []);

  const rutOk = rut.trim() === "" || rutValido(rut);
  const nombreOk = nombre.trim() === "" || NOMBRE_VALIDO.test(nombre.trim());
  const completo =
    tipo !== "" && nombre.trim() !== "" && nombreOk && rut.trim() !== "" && rutOk && descripcion.trim() !== "" && fotos.length >= 1;
  const puedeEnviar = !vistaPrevia && !!qrToken && !!tipos && completo && !enviando;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!puedeEnviar || !qrToken) return;
    setEnviando(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("nombre_reportante", nombre.trim());
      form.append("rut_reportante", rut.trim());
      form.append("tipo_incidencia", tipo);
      form.append("descripcion", descripcion.trim());
      for (const f of fotos) form.append("fotos", await reducirFoto(f));
      const r = await enviarReporteCiudadano(qrToken, form);
      setCodigo(r.codigo_seguimiento);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No pudimos enviar tu reporte. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function copiar() {
    if (!codigo) return;
    navigator.clipboard
      ?.writeText(codigo)
      .then(() => setCopiado(true))
      .catch(() => setCopiado(false));
  }

  if (codigo) {
    return (
      <div className="vvc-sheet-bg" role="presentation">
        <section className="vvc-sheet" aria-labelledby="vvc-ok-t">
          <div className="vvc-sheet__head">
            <div>
              <h2 id="vvc-ok-t">¡Gracias! Recibimos tu reporte</h2>
              <p>Llegó al equipo municipal como incidencia de la comunidad.</p>
            </div>
          </div>
          <div className="vvc-sheet__body">
            <div className="vvc-code">
              <span className="vvc-field__label">Tu código de seguimiento</span>
              <strong className="vvc-code__value">{codigo}</strong>
              <button type="button" className="vvc-link" onClick={copiar}>
                {copiado ? "Copiado" : "Copiar código"}
              </button>
            </div>
            <p className="vvc-pending" role="status">
              <Icon name="alert" size={14} /> Guárdalo ahora: es la única vez que lo mostramos. Con él puedes consultar el estado de tu
              reporte desde la ficha de cualquier árbol.
            </p>
          </div>
          <div className="vvc-sheet__foot">
            <button type="button" className="vvc-btn" onClick={onCerrar}>
              Listo
            </button>
          </div>
        </section>
      </div>
    );
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
            <select id="vvc-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!tipos}>
              <option value="">{tipos ? "Elige una opción" : errorTipos ? "No pudimos cargar las opciones" : "Cargando opciones…"}</option>
              {tipos?.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="vvc-field">
            <label htmlFor="vvc-desc">Cuéntanos qué viste</label>
            <textarea
              id="vvc-desc"
              rows={3}
              maxLength={2000}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Por ejemplo: hay una rama quebrada sobre la vereda."
            />
          </div>

          <div className="vvc-field">
            <span className="vvc-field__label">Fotografía (de 1 a {MAX_FOTOS})</span>
            <label className="vvc-photo">
              <Icon name="camera" size={20} />
              <span>{fotos.length ? `${fotos.length} foto(s) lista(s)` : "Tomar o elegir una foto"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                hidden
                onChange={(e) => setFotos(Array.from(e.target.files ?? []).slice(0, MAX_FOTOS))}
              />
            </label>
            <small>Antes de guardarla quitamos la ubicación y los datos de tu cámara.</small>
          </div>

          <div className="vvc-row2">
            <div className="vvc-field">
              <label htmlFor="vvc-nombre">Tu nombre</label>
              <input id="vvc-nombre" autoComplete="name" maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} aria-invalid={!nombreOk} />
              {!nombreOk && <small className="vvc-err">Solo letras y espacios.</small>}
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

          {vistaPrevia && (
            <p className="vvc-pending" role="status">
              <Icon name="clock" size={14} /> Vista previa: este formulario no envía reportes.
            </p>
          )}
          {error && (
            <p className="vvc-pending vvc-pending--error" role="alert">
              <Icon name="alert" size={14} /> {error}
            </p>
          )}
        </div>

        <div className="vvc-sheet__foot">
          <button type="submit" className="vvc-btn" disabled={!puedeEnviar}>
            {enviando ? "Enviando…" : "Enviar reporte"}
          </button>
        </div>
      </form>
    </div>
  );
}
