import type { CampoFormulario } from "../types/inspection";
import { nombreLegible, valorInvalido, type ValorCrudo } from "../lib/inspectionForm";
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
  switch (campo.tipo_entrada) {
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
    case "seleccion":
      control = (
        <select id={id} value={typeof valor === "string" ? valor : ""} onChange={(e) => onChange(e.target.value || null)} disabled={disabled}>
          <option value="">—</option>
          {opciones.map((o) => (
            <option key={String(o.codigo)} value={String(o.codigo)}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      );
      break;
    case "seleccion_multiple": {
      const marcados = Array.isArray(valor) ? valor : [];
      control = (
        <div className="sivu-insp-field__multi" role="group" aria-labelledby={`${id}-label`}>
          {opciones.map((o) => {
            const codigo = String(o.codigo);
            return (
              <label key={codigo}>
                <input
                  type="checkbox"
                  checked={marcados.includes(codigo)}
                  onChange={(e) =>
                    onChange(e.target.checked ? [...marcados, codigo] : marcados.filter((m) => m !== codigo))
                  }
                  disabled={disabled}
                />
                {o.etiqueta}
              </label>
            );
          })}
        </div>
      );
      break;
    }
    case "decimal":
    case "entero":
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

  return (
    <div className={`sivu-insp-field ${faltante ? "is-missing" : ""}`} id={`wrap-${id}`}>
      <div className="sivu-insp-field__head">
        <label id={`${id}-label`} htmlFor={id} className="sivu-insp-field__name">
          {campo.etiqueta}
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
      {control}
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

/**
 * Presentación de la obligatoriedad del Excel (B16), sin cambiar la regla: el
 * backend decide qué falta al calcular. «Obligatorio…» → asterisco;
 * «Opcional» → «opcional»; «Condicional» (y combinaciones) → el campo solo se
 * ve cuando su condición se cumple, y la ayudita explica por qué aparece.
 */
function tipoObligatoriedad(texto: string | null): "obligatorio" | "opcional" | "condicional" | null {
  const t = (texto ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t.startsWith("obligatorio")) return "obligatorio";
  if (t === "opcional") return "opcional";
  return "condicional";
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
    return `«${etiquetaDe(id) ?? nombreLegible(id)}»`;
  });
}
