import { useEffect, useState } from "react";
import type { ArbolInventario } from "../../types/inventory";
import { obtenerFichaArbol } from "../../api/fichaArbol";
import { Icon } from "../Icons";
import { VistaPreviaCiudadana } from "./VistaPreviaCiudadana";

type Valor = unknown;

/** Datos del ejemplar que la propuesta D6 permitiría mostrar con un interruptor por árbol. */
const OPCIONALES: { campo: string; etiqueta: string; dn: string; unidad?: string }[] = [
  { campo: "clase_edad", etiqueta: "Clase de edad", dn: "D-25" },
  { campo: "altura_total_m", etiqueta: "Altura total", dn: "D-19", unidad: "m" },
  { campo: "dap_cm", etiqueta: "Diámetro del tronco (DAP)", dn: "D-18", unidad: "cm" },
  { campo: "diametro_copa_m", etiqueta: "Diámetro de copa", dn: "D-22", unidad: "m" },
];

const NUNCA = [
  { titulo: "Riesgo y evaluaciones", nota: "Información técnica" },
  { titulo: "Órdenes de trabajo e incidencias", nota: "Uso interno" },
  { titulo: "Usuarios y reportantes", nota: "Datos personales" },
  { titulo: "Coordenadas UTM", nota: "Basta la ubicación descriptiva" },
];

function mostrar(v: Valor, unidad?: string): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object" && v && "etiqueta" in v) return String((v as { etiqueta: unknown }).etiqueta);
  if (typeof v === "number") return `${v.toLocaleString("es-CL")}${unidad ? ` ${unidad}` : ""}`;
  return String(v);
}

/**
 * Conecta → «Ficha pública»: administración de la ficha de cada árbol con la
 * vista previa del teléfono al lado (maqueta SIVU Lab como guía, solo
 * diseño). Hoy la ficha publica solo lo que autoriza CC-062; la edición por
 * árbol (interruptores, historia y foto) queda visible pero deshabilitada
 * hasta que se apruebe la propuesta D6 y el backend tenga dónde guardarla:
 * no se simula ningún guardado. Los valores que se muestran son los reales
 * del inventario (B1 y B2).
 */
export function FichaPublicaEditor({ projectId, arboles }: { projectId: string; arboles: ArbolInventario[] }) {
  const [indice, setIndice] = useState(0);
  const arbol = arboles[Math.min(indice, arboles.length - 1)];
  const [registro, setRegistro] = useState<{ id: string; valores: Record<string, Valor> } | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerFichaArbol(projectId, arbol.id)
      .then((f) => !cancelado && setRegistro({ id: arbol.id, valores: f.arbol }))
      .catch(() => !cancelado && setRegistro({ id: arbol.id, valores: {} }));
    return () => {
      cancelado = true;
    };
  }, [projectId, arbol.id]);

  const valores = registro?.id === arbol.id ? registro.valores : null;
  const nombre = arbol.nombre_comun ?? arbol.especie_cientifica ?? arbol.tree_code;

  return (
    <div className="sivu-fpe">
      <section className="sivu-panel sivu-fpe__main">
        <div className="sivu-fpe__picker">
          <button type="button" className="sivu-fpe__nav" aria-label="Árbol anterior" disabled={indice === 0} onClick={() => setIndice((i) => i - 1)}>
            <Icon name="chevron-left" size={16} />
          </button>
          <div className="sivu-fpe__who">
            <span className="sivu-fpe__code">{arbol.tree_code}</span>
            <select aria-label="Árbol" value={arbol.id} onChange={(e) => setIndice(arboles.findIndex((a) => a.id === e.target.value))}>
              {arboles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tree_code} · {a.nombre_comun ?? a.especie_cientifica ?? ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="sivu-fpe__nav"
            aria-label="Árbol siguiente"
            disabled={indice >= arboles.length - 1}
            onClick={() => setIndice((i) => i + 1)}
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        <div className="sivu-fpe__notice" role="note">
          <Icon name="clock" size={15} />
          <p>
            <strong>Edición pendiente de aprobación.</strong> Hoy la ficha de {nombre} publica solo lo que autoriza CC-062. Los interruptores,
            la historia y la foto se habilitan cuando se apruebe la propuesta D6 y el backend pueda guardarlos.
          </p>
        </div>

        <h3 className="sivu-fpe__group">Siempre visible · desde el inventario</h3>
        <ul className="sivu-fpe__rows">
          {[
            { etiqueta: "Nombre común", dn: "D-14", valor: arbol.nombre_comun },
            { etiqueta: "Especie", dn: "D-13", valor: arbol.especie_cientifica, italica: true },
            { etiqueta: "Ubicación descriptiva", dn: "D-8", valor: arbol.ubicacion_descriptiva },
          ].map((f) => (
            <li key={f.dn} className="sivu-fpe__row">
              <span className="sivu-fpe__check" aria-hidden="true">
                <Icon name="check" size={13} />
              </span>
              <div>
                <strong>{f.etiqueta}</strong>
                <span className={f.italica ? "is-italic" : ""}>{f.valor ?? "Sin registro"}</span>
              </div>
              <code>{f.dn}</code>
            </li>
          ))}
          <li className="sivu-fpe__row">
            <span className="sivu-fpe__check" aria-hidden="true">
              <Icon name="check" size={13} />
            </span>
            <div>
              <strong>Sobre esta especie</strong>
              <span>Género, familia, origen, follaje y tipo de hoja del catálogo</span>
            </div>
            <code>D-257–262</code>
          </li>
        </ul>

        <h3 className="sivu-fpe__group">
          Datos del ejemplar que podrás mostrar <span className="sivu-fpe__tag">Propuesta D6</span>
        </h3>
        <ul className="sivu-fpe__rows">
          {OPCIONALES.map((o) => {
            const v = valores ? mostrar(valores[o.campo], o.unidad) : null;
            return (
              <li key={o.campo} className="sivu-fpe__row">
                <span className="sivu-fpe__switch" role="switch" aria-checked="false" aria-disabled="true" aria-label={`Mostrar ${o.etiqueta}`} />
                <div>
                  <strong>{o.etiqueta}</strong>
                  <span>{valores === null ? "Cargando…" : v ? `Registrado: ${v}` : "Sin registro en el inventario"}</span>
                </div>
                <code>{o.dn}</code>
              </li>
            );
          })}
        </ul>

        <h3 className="sivu-fpe__group">
          Contenido propio de este árbol <span className="sivu-fpe__tag">Propuesta D6</span>
        </h3>
        <div className="sivu-fpe__content">
          <label className="sivu-fpe__field">
            <span>Mi historia</span>
            <textarea rows={3} disabled placeholder="Antecedentes verificables del ejemplar, con su fuente." />
          </label>
          <div className="sivu-fpe__photo" aria-disabled="true">
            <Icon name="camera" size={20} />
            <strong>Fotografía no disponible</strong>
            <span>Una foto propia de la ficha, sin ubicación ni datos de cámara. No se usan las fotos de inspección.</span>
          </div>
        </div>

        <h3 className="sivu-fpe__group">Nunca se publica</h3>
        <ul className="sivu-fpe__never">
          {NUNCA.map((n) => (
            <li key={n.titulo}>
              <Icon name="lock" size={13} />
              <div>
                <strong>{n.titulo}</strong>
                <span>{n.nota}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="sivu-panel sivu-fpe__preview">
        <div className="sivu-fpe__phead">
          <h2>Vista previa</h2>
          <span>Así se ve al escanear su placa</span>
        </div>
        <VistaPreviaCiudadana projectId={projectId} arbol={arbol} />
      </aside>
    </div>
  );
}
