import type { CampoFormulario } from "../types/inspection";
import { nombreLegible, valorInvalido, type ValorCrudo } from "../lib/inspectionForm";
import { etiquetaVisible, tieneValor, tipoObligatoriedad } from "../lib/inspectionPresentacion";
import { SpeciesInput } from "./SpeciesInput";

/**
 * Un campo del formulario de inspección según su `tipo_entrada` (B16). Las
 * opciones vienen del backend con `{codigo, etiqueta}`: se guarda el código
 * y se muestra la etiqueta (PR-021). El nombre visible es el técnico
 * mientras el backend no defina las etiquetas (`etiqueta_pendiente`).
 */
export function InspectionField({
  campo,
  valor,
  onChange,
  disabled,
  referencia,
  faltante,
  projectId,
  etiquetaDe,
}: {
  campo: CampoFormulario;
  valor: ValorCrudo | undefined;
  onChange: (valor: ValorCrudo) => void;
  disabled: boolean;
  /** Valor ya registrado en el árbol, solo como referencia. */
  referencia?: string | null;
  /** Motivo que devolvió `/calcular` si el campo falta. */
  faltante?: string;
  /** Proyecto de la OT, para sugerir especies del catálogo (CC-053). */
  projectId?: string;
  /** Etiqueta de otro campo del formulario, para leer la condición en palabras (B16). */
  etiquetaDe?: (identificador: string) => string | undefined;
}) {
  const id = `campo-${campo.identificador}`;
  const invalido = valorInvalido(campo, valor);
  const opciones = campo.opciones ?? [];

  let control;
  const tipoControl = campo.identificador === ESCALA_CLE && campo.tipo_entrada === "entero" ? "escala" : campo.tipo_entrada;
  switch (tipoControl) {
    case "booleano":
      control = (
        <div className="sivu-insp-field__seg" role="radiogroup" aria-labelledby={`${id}-label`}>
          {[true, false].map((b) => (
            <button
              key={String(b)}
              type="button"
              role="radio"
              aria-checked={valor === b}
              className={valor === b ? "is-on" : ""}
              onClick={() => onChange(valor === b ? null : b)}
              disabled={disabled}
            >
              {opciones.find((o) => o.codigo === b)?.etiqueta ?? (b ? "Sí" : "No")}
            </button>
          ))}
        </div>
      );
      break;
    case "seleccion": {
      // Presentación según las opciones (mismo código guardado que la lista desplegable).
      const actual = typeof valor === "string" ? valor : "";
      const largas = opciones.some((o) => o.etiqueta.length > 24);
      const forma = opciones.length > 8 ? "lista" : largas ? "tarjetas" : "pastillas";
      control =
        forma === "lista" ? (
          <select id={id} value={actual} onChange={(e) => onChange(e.target.value || null)} disabled={disabled}>
            <option value="">—</option>
            {opciones.map((o) => (
              <option key={String(o.codigo)} value={String(o.codigo)}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        ) : (
          <div
            className={forma === "tarjetas" ? "sivu-insp-field__cards" : "sivu-insp-field__seg"}
            role="radiogroup"
            aria-labelledby={`${id}-label`}
          >
            {opciones.map((o) => {
              const codigo = String(o.codigo);
              const on = actual === codigo;
              return (
                <button
                  key={codigo}
                  id={codigo === String(opciones[0].codigo) ? id : undefined}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={on ? "is-on" : ""}
                  onClick={() => onChange(on ? null : codigo)}
                  disabled={disabled}
                >
                  {forma === "tarjetas" && <span className="sivu-insp-field__dot" aria-hidden="true" />}
                  {o.etiqueta}
                </button>
              );
            })}
          </div>
        );
      break;
    }
    case "seleccion_multiple": {
      const marcados = Array.isArray(valor) ? valor : [];
      control = (
        <div className="sivu-insp-field__seg sivu-insp-field__seg--chips" role="group" aria-labelledby={`${id}-label`}>
          {opciones.map((o) => {
            const codigo = String(o.codigo);
            const on = marcados.includes(codigo);
            return (
              <button
                key={codigo}
                type="button"
                aria-pressed={on}
                className={on ? "is-on" : ""}
                onClick={() => onChange(on ? marcados.filter((m) => m !== codigo) : [...marcados, codigo])}
                disabled={disabled}
              >
                {on && <Check />}
                {o.etiqueta}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "escala": {
      // CLE: escala de 0 a 5 en círculos; se guarda el mismo número como texto.
      const actual = typeof valor === "string" ? valor.trim() : "";
      control = (
          <div className="sivu-insp-field__seg sivu-insp-field__seg--escala" role="radiogroup" aria-labelledby={`${id}-label`}>
            {["0", "1", "2", "3", "4", "5"].map((n) => (
              <button
                key={n}
                id={n === "0" ? id : undefined}
                type="button"
                role="radio"
                aria-checked={actual === n}
                className={actual === n ? "is-on" : ""}
                onClick={() => onChange(actual === n ? null : n)}
                disabled={disabled}
              >
                {n}
              </button>
            ))}
          </div>
        );
      break;
    }
    case "entero":
    case "decimal":
    case "lista_decimal":
      control = (
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={campo.tipo_entrada === "lista_decimal" ? "Valores separados por espacio o punto y coma" : undefined}
          aria-invalid={invalido}
          disabled={disabled}
        />
      );
      break;
    case "fecha":
      control = (
        <input id={id} type="date" value={typeof valor === "string" ? valor : ""} onChange={(e) => onChange(e.target.value || null)} disabled={disabled} />
      );
      break;
    default:
      control = campo.identificador === "especie_cientifica" && projectId ? (
        <SpeciesInput
          id={id}
          projectId={projectId}
          value={typeof valor === "string" ? valor : ""}
          onChange={onChange}
          disabled={disabled}
        />
      ) : campo.identificador.startsWith("observaciones") ? (
        <textarea id={id} rows={2} value={typeof valor === "string" ? valor : ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      ) : (
        <input id={id} type="text" value={typeof valor === "string" ? valor : ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      );
  }

  const tipo = tipoObligatoriedad(campo.obligatoriedad);
  // Ayuda contextual: precisión de la obligatoriedad (p. ej., «cuando existe copa») y por qué aparece el campo.
  const ayudas = [
    tipo === "obligatorio" && campo.obligatoriedad && campo.obligatoriedad.trim() !== "Obligatorio" ? `${campo.obligatoriedad.trim().replace(/\.+$/, "")}.` : null,
    campo.condicion_texto ? `Cuándo se pide: ${condicionLegible(campo.condicion_texto, etiquetaDe).replace(/\.+$/, "")}.` : null,
  ].filter(Boolean) as string[];
  const ayuda = ayudas.join(" ");

  const respondido = tieneValor(valor);
  const hijo = !!campo.condicion_activacion && campo.condicion_activacion.op !== "siempre";

  return (
    <div
      className={`sivu-insp-field ${faltante ? "is-missing" : ""} ${hijo ? "is-child" : ""} ${respondido ? "is-answered" : ""}`}
      id={`wrap-${id}`}
    >
      <div className="sivu-insp-field__head">
        <span className={`sivu-insp-field__mark ${tipo === "opcional" ? "is-opt" : ""}`} aria-hidden="true">
          {respondido && <Check />}
        </span>
        <label id={`${id}-label`} htmlFor={id} className="sivu-insp-field__name">
          {etiquetaVisible(campo.etiqueta)}
          {mostrarUnidad(campo) && <span className="sivu-insp-field__unit">{campo.unidad}</span>}
          {tipo === "obligatorio" && (
            <span className="sivu-insp-field__ast" aria-label="obligatorio" title="Obligatorio">
              *
            </span>
          )}
        </label>
        {tipo === "opcional" && <span className="sivu-insp-field__opt">opcional</span>}
        {ayuda && (
          <span className="sivu-insp-field__info" tabIndex={0} role="note" aria-label={ayuda} data-tip={ayuda}>
            i
          </span>
        )}
      </div>
      <div className="sivu-insp-field__control">{control}</div>
      {referencia && <small className="sivu-insp-field__hint">Registrado en el árbol: {referencia}</small>}
      {/* D-13, CC-053: la especie entra al catálogo solo si el Inspector la confirma en la inspección. */}
      {referencia && campo.identificador === "especie_cientifica" && !valor && !disabled && (
        <button type="button" className="btn btn-secondary btn-sm sivu-insp-field__confirm" onClick={() => onChange(referencia)}>
          Confirmar «{referencia}»
        </button>
      )}
      {invalido && <small className="sivu-insp-field__error">No es un número válido.</small>}
      {faltante && <small className="sivu-insp-field__error">{faltante}</small>}
    </div>
  );
}

const ESCALA_CLE = "exposicion_luminica_copa_cle";

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** La unidad se agrega solo si la etiqueta aprobada no la trae ya, p. ej. «Altura total (m)». */
function mostrarUnidad(campo: CampoFormulario): boolean {
  const u = campo.unidad;
  if (!u || u === "Sin unidad") return false;
  return !campo.etiqueta.includes(`(${u}`) && !campo.etiqueta.includes(`(${u.split(" ")[0]}`);
}

/** Condición del Excel con los nombres técnicos de otros campos reemplazados por su etiqueta. */
function condicionLegible(texto: string, etiquetaDe?: (id: string) => string | undefined): string {
  if (!etiquetaDe) return texto;
  return texto.replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (id) => {
    return `«${etiquetaVisible(etiquetaDe(id) ?? nombreLegible(id))}»`;
  });
}
