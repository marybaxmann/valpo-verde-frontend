import { lazy, Suspense, useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "./Icons";
import { buscarEspecies, crearArbolAlta } from "../api/treeAlta";
import type { ArbolAlta, Especie } from "../types/treeAlta";
import { getArcgisApiKey } from "../lib/arcgis";
import type { UtmPoint } from "./LocationPickerMap";

const LocationPickerMap = lazy(() => import("./LocationPickerMap"));

/** Acepta coma o punto decimal; null si no es un número. */
function parseCoord(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Alta municipal mínima del árbol (Fase 7, Inventario; PR-003 v8.0,
 * POST /api/sivu/projects/:id/trees). Solo nombre y ubicación: sin datos
 * técnicos, que registra el Inspector mediante OT. Las coordenadas que se
 * guardan son las UTM del formulario; el mapa solo ayuda a rellenarlas
 * (ADR-010 v3.0). Las reglas (rango UTM, árbol dentro del sector, especie
 * o nombre común) las decide el backend: aquí solo se evita enviar un
 * formulario vacío y se muestra el error real.
 */
export function NewTreeModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: (arbol: ArbolAlta) => void;
}) {
  const apiKey = getArcgisApiKey();
  const [sector, setSector] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [este, setEste] = useState("");
  const [norte, setNorte] = useState("");
  const [especie, setEspecie] = useState("");
  const [nombreComun, setNombreComun] = useState("");
  const [sugerencias, setSugerencias] = useState<Especie[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esteNum = parseCoord(este);
  const norteNum = parseCoord(norte);
  const marker: UtmPoint | null = esteNum !== null && norteNum !== null ? { este: esteNum, norte: norteNum } : null;

  // Búsqueda en CATALOGO_ESPECIES (CC-053: si no está, igual se puede escribir).
  useEffect(() => {
    const q = especie.trim();
    if (q.length < 3) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setBuscando(true);
      buscarEspecies(projectId, q)
        .then((rows) => {
          if (!cancelled) setSugerencias(rows);
        })
        .catch(() => {
          if (!cancelled) setSugerencias(null);
        })
        .finally(() => {
          if (!cancelled) setBuscando(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [especie, projectId]);

  const coincidencias = especie.trim().length >= 3 ? sugerencias : null;
  const exacta = coincidencias?.some((s) => s.especie_cientifica.toLowerCase() === especie.trim().toLowerCase());

  async function handleSave() {
    setError(null);
    if (!sector.trim() || !ubicacion.trim()) {
      setError("Completa el sector y la ubicación descriptiva.");
      return;
    }
    if (esteNum === null || norteNum === null) {
      setError("Ingresa las coordenadas UTM Este y Norte (o marca el punto en el mapa).");
      return;
    }
    if (!especie.trim() && !nombreComun.trim()) {
      setError("Ingresa la especie (nombre científico) o el nombre común.");
      return;
    }
    setSaving(true);
    try {
      const arbol = await crearArbolAlta(projectId, {
        sector: sector.trim(),
        ubicacion_descriptiva: ubicacion.trim(),
        utm_este: esteNum,
        utm_norte: norteNum,
        ...(especie.trim() ? { especie_cientifica: especie.trim() } : {}),
        ...(nombreComun.trim() ? { nombre_comun: nombreComun.trim() } : {}),
      });
      onCreated(arbol);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el árbol.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nuevo árbol"
      onClose={saving ? () => undefined : onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Registrando…" : "Registrar árbol"}
          </button>
        </>
      }
    >
      <div className="sivu-newtree">
        <p className="sivu-newtree__intro">
          Alta con nombre y ubicación. Los datos técnicos (fustes, DAP, altura, copa) los registra el Inspector en
          una orden de trabajo.
        </p>

        <div className="sivu-newtree__grid">
          <section>
            <h4 className="sivu-newtree__title">Ubicación</h4>
            <div className="field">
              <label htmlFor="nt-sector">Sector o barrio</label>
              <input
                id="nt-sector"
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={saving}
                placeholder="Nombre del barrio o sector dentro del proyecto"
              />
            </div>
            <div className="field">
              <label htmlFor="nt-ubicacion">Ubicación descriptiva</label>
              <input
                id="nt-ubicacion"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                disabled={saving}
                placeholder="Dirección, plaza u otra referencia de terreno"
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="nt-este">
                  UTM Este <span className="hint">(m, huso 19S)</span>
                </label>
                <input id="nt-este" type="text" inputMode="decimal" value={este} onChange={(e) => setEste(e.target.value)} disabled={saving} />
              </div>
              <div className="field">
                <label htmlFor="nt-norte">
                  UTM Norte <span className="hint">(m, huso 19S)</span>
                </label>
                <input id="nt-norte" type="text" inputMode="decimal" value={norte} onChange={(e) => setNorte(e.target.value)} disabled={saving} />
              </div>
            </div>

            <h4 className="sivu-newtree__title">Identificación</h4>
            <div className="field sivu-newtree__species">
              <label htmlFor="nt-especie">
                Especie <span className="hint">(nombre científico)</span>
              </label>
              <input
                id="nt-especie"
                type="text"
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
                disabled={saving}
                placeholder="Escribe al menos 3 letras para buscar en el catálogo"
                autoComplete="off"
              />
              {buscando && <span className="hint">Buscando en el catálogo…</span>}
              {!buscando && coincidencias && coincidencias.length > 0 && !exacta && (
                <ul className="sivu-newtree__suggest" aria-label="Especies del catálogo">
                  {coincidencias.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => setEspecie(s.especie_cientifica)}>
                        <em>{s.especie_cientifica}</em>
                        {s.familia && <small>{s.familia}</small>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!buscando && coincidencias && coincidencias.length === 0 && (
                <span className="hint">No está en el catálogo: se registra tal como la escribes.</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="nt-comun">Nombre común</label>
              <input id="nt-comun" type="text" value={nombreComun} onChange={(e) => setNombreComun(e.target.value)} disabled={saving} />
              <span className="hint">Basta con la especie o con el nombre común.</span>
            </div>
          </section>

          <section>
            <h4 className="sivu-newtree__title">Marca el punto en el mapa</h4>
            {apiKey ? (
              <Suspense fallback={<p className="sivu-picker__state">Cargando mapa…</p>}>
                <LocationPickerMap
                  apiKey={apiKey}
                  value={marker}
                  onPick={(p) => {
                    setEste(String(p.este));
                    setNorte(String(p.norte));
                  }}
                />
              </Suspense>
            ) : (
              <p className="sivu-picker__state sivu-picker__state--error">
                El mapa no está configurado. Ingresa las coordenadas UTM a mano.
              </p>
            )}
            <p className="hint sivu-newtree__maphint">
              Al marcar el punto se rellenan UTM Este y Norte; puedes corregirlas. Se guardan las del formulario.
            </p>
          </section>
        </div>

        {error && (
          <p className="sivu-newtree__error" role="alert">
            <Icon name="alert" size={13} /> {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
