import { useEffect, useState } from "react";
import { listSpeciesCatalog, createProjectTree } from "../api/trees";
import type { CreateTreePayload, SpeciesItem, TreeDetailDTO } from "../types/tree";
import { CLASE_EDAD_OPTIONS, type ClaseEdad } from "../types/tree";
import { Icon } from "./Icons";
import { SpeciesCombobox } from "./SpeciesCombobox";

export function CreateTreeModal({
  projectId,
  pickedLocation,
  hidden = false,
  onStartPickingLocation,
  onClose,
  onSuccess,
}: {
  projectId: string;
  pickedLocation: { lon: number; lat: number } | null;
  /** true mientras el usuario captura la ubicación en el mapa: el modal
   * permanece montado (conserva el formulario) pero no se renderiza. */
  hidden?: boolean;
  onStartPickingLocation: () => void;
  onClose: () => void;
  onSuccess: (tree: TreeDetailDTO) => void;
}) {
  const [speciesList, setSpeciesList] = useState<SpeciesItem[]>([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [speciesError, setSpeciesError] = useState<string | null>(null);

  // Form State - Árbol (Permanente)
  const [speciesId, setSpeciesId] = useState<string>("");
  // Sin ubicación marcada, los campos parten vacíos: el encuadre visual del
  // mapa no es una coordenada del árbol y no debe guardarse como tal.
  const [lat, setLat] = useState<string>(pickedLocation ? pickedLocation.lat.toFixed(6) : "");
  const [lon, setLon] = useState<string>(pickedLocation ? pickedLocation.lon.toFixed(6) : "");
  const [direccion, setDireccion] = useState<string>("");
  const [comuna, setComuna] = useState<string>("Valparaíso");
  const [lugarReferencia, setLugarReferencia] = useState<string>("");

  // Form State - Medición Dendrométrica Inicial
  const todayStr = new Date().toISOString().slice(0, 10);
  const [fechaMedicion, setFechaMedicion] = useState<string>(todayStr);
  const [tipoFuste, setTipoFuste] = useState<"monofuste" | "polifuste">("monofuste");
  const [configuracionFustes, setConfiguracionFustes] = useState<string>("monofuste");
  const [dapCm, setDapCm] = useState<string>("");
  const [numeroFustes, setNumeroFustes] = useState<string>("2");
  // Un campo de DAP por fuste (dato primario, PR-006 v7.0 / modelo-arbol-medicion.md):
  // se conservan los diámetros individuales, nunca un DAP equivalente calculado en el
  // cliente — esa regla metodológica sigue abierta (ver nota en la sección de fustes).
  const [dapFustesValues, setDapFustesValues] = useState<string[]>(["", ""]);
  const [alturaTotalM, setAlturaTotalM] = useState<string>("");
  const [diametroCopaM, setDiametroCopaM] = useState<string>("");
  const [alturaPrimeraRamaM, setAlturaPrimeraRamaM] = useState<string>("");
  const [claseEdad, setClaseEdad] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Actualizar coordenadas si cambiaron desde el mapa
  useEffect(() => {
    if (pickedLocation) {
      setLat(pickedLocation.lat.toFixed(6));
      setLon(pickedLocation.lon.toFixed(6));
    }
  }, [pickedLocation]);

  // Cargar catálogo de especies
  useEffect(() => {
    listSpeciesCatalog()
      .then((data) => {
        setSpeciesList(data);
        if (data.length > 0 && !speciesId) {
          setSpeciesId(data[0].id);
        }
        setLoadingSpecies(false);
      })
      .catch((err: unknown) => {
        setSpeciesError(
          err instanceof Error ? err.message : "No se pudo cargar el catálogo de especies."
        );
        setLoadingSpecies(false);
      });
  }, []);

  function handleTipoFusteChange(tipo: "monofuste" | "polifuste") {
    setTipoFuste(tipo);
    if (tipo === "monofuste") {
      setConfiguracionFustes("monofuste");
    } else {
      setConfiguracionFustes("polifuste");
    }
  }

  /** Cambia la cantidad de campos de DAP por fuste, conservando los valores ya ingresados. */
  function handleNumeroFustesChange(value: string) {
    setNumeroFustes(value);
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 1) return;
    setDapFustesValues((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push("");
      return next;
    });
  }

  function handleFusteDapChange(index: number, value: string) {
    setDapFustesValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setErrorMessage("Debes ingresar coordenadas válidas (latitud y longitud).");
      return;
    }

    if (!speciesId) {
      setErrorMessage("Debes seleccionar una especie.");
      return;
    }

    const alturaNum = parseFloat(alturaTotalM);
    const copaNum = parseFloat(diametroCopaM);
    const ramaNum = parseFloat(alturaPrimeraRamaM);

    if (isNaN(alturaNum) || alturaNum < 0) {
      setErrorMessage("La altura total debe ser un número mayor o igual a 0.");
      return;
    }
    if (isNaN(copaNum) || copaNum < 0) {
      setErrorMessage("El diámetro de copa debe ser un número mayor o igual a 0.");
      return;
    }
    if (isNaN(ramaNum) || ramaNum < 0) {
      setErrorMessage("La altura de la primera rama debe ser un número mayor o igual a 0.");
      return;
    }

    let parsedDapCm: number | null = null;
    let parsedNumeroFustes: number | null = null;
    let parsedDapFustes: number[] | null = null;

    if (tipoFuste === "monofuste") {
      const val = parseFloat(dapCm);
      if (isNaN(val) || val <= 0) {
        setErrorMessage("Para monofuste, el DAP (cm) debe ser un número mayor a 0.");
        return;
      }
      parsedDapCm = val;
    } else {
      const numFustes = parseInt(numeroFustes, 10);
      if (isNaN(numFustes) || numFustes < 2) {
        setErrorMessage("Para polifuste, la cantidad de fustes debe ser un número entero mayor o igual a 2.");
        return;
      }
      parsedNumeroFustes = numFustes;

      if (dapFustesValues.length !== numFustes) {
        setErrorMessage(`Debes ingresar el DAP de los ${numFustes} fustes.`);
        return;
      }

      const fustesArray = dapFustesValues.map((s) => parseFloat(s));
      const invalidIndex = fustesArray.findIndex((n) => isNaN(n) || n <= 0);
      if (invalidIndex !== -1) {
        setErrorMessage(
          `El DAP del fuste ${invalidIndex + 1} debe ser un número mayor a 0.`
        );
        return;
      }
      parsedDapFustes = fustesArray;
    }

    const payload: CreateTreePayload = {
      species_id: speciesId,
      public_space_id: null,
      direccion: direccion.trim() || null,
      comuna: comuna.trim() || "Valparaíso",
      lugar_referencia: lugarReferencia.trim() || null,
      ubicacion: {
        lon: lonNum,
        lat: latNum,
      },
      medicion_inicial: {
        fecha_medicion: fechaMedicion,
        configuracion_fustes: configuracionFustes.trim() || (tipoFuste === "monofuste" ? "monofuste" : "polifuste"),
        numero_fustes: parsedNumeroFustes,
        dap_fustes_cm: parsedDapFustes,
        dap_cm: parsedDapCm,
        altura_total_m: alturaNum,
        diametro_copa_m: copaNum,
        altura_primera_rama_m: ramaNum,
        clase_edad: claseEdad ? (claseEdad as ClaseEdad) : null,
      },
    };

    setSubmitting(true);
    try {
      const res = await createProjectTree(projectId, payload);
      onSuccess(res.data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error al registrar el árbol y su medición inicial."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (hidden) return null;

  return (
    <div className="sivu-modal-overlay" role="dialog" aria-modal="true">
      <div className="sivu-modal-content sivu-modal-content--large">
        <header className="sivu-modal-header">
          <div>
            <h2>Nuevo Árbol Urbano</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              Alta técnica integrada: Identificación espacial + Medición dendrométrica inicial (INV-1C)
            </p>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px", minHeight: "auto", border: "none" }}
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="sivu-modal-body">
            {errorMessage && (
              <div className="card card--pad" style={{ marginBottom: 14, borderColor: "var(--classification-critical)" }}>
                <p style={{ color: "var(--classification-critical)", fontSize: 13 }}>
                  <Icon name="alert" size={14} /> {errorMessage}
                </p>
              </div>
            )}

            {/* SECCIÓN 1: IDENTIFICACIÓN Y UBICACIÓN */}
            <div className="sivu-form-section">
              <div className="sivu-form-section__header">
                <Icon name="leaf" size={15} /> 1. Identificación y Ubicación del Árbol
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Especie *
                  </label>
                  <SpeciesCombobox
                    species={speciesList}
                    loading={loadingSpecies}
                    error={speciesError}
                    value={speciesId}
                    onChange={setSpeciesId}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Comuna
                  </label>
                  <input
                    type="text"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                  />
                </div>
              </div>

              {/* Coordenadas con soporte de captura en mapa */}
              <div
                style={{
                  background: "var(--surface-background)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                    Coordenadas Territoriales (WGS84) *
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: "3px 8px" }}
                    onClick={onStartPickingLocation}
                  >
                    📍 Marcar en mapa SIG
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>
                      Latitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="sivu-sig-controls-input"
                      style={{ width: "100%" }}
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>
                      Longitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="sivu-sig-controls-input"
                      style={{ width: "100%" }}
                      value={lon}
                      onChange={(e) => setLon(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Dirección (Opcional)
                  </label>
                  <input
                    type="text"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    placeholder="Ej. Calle Prat 123"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Lugar de Referencia (Opcional)
                  </label>
                  <input
                    type="text"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    placeholder="Ej. Frente a Plaza Sotomayor"
                    value={lugarReferencia}
                    onChange={(e) => setLugarReferencia(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: MEDICIÓN DENDROMÉTRICA INICIAL (DISTINGUIDA VISUALMENTE) */}
            <div className="sivu-form-section sivu-form-section--highlight">
              <div className="sivu-form-section__header" style={{ color: "var(--sivu-primary-dark)" }}>
                <Icon name="chart" size={15} /> 2. Medición Dendrométrica Inicial (Obligatoria para alta técnica)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Fecha de Medición *
                  </label>
                  <input
                    type="date"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    max={todayStr}
                    value={fechaMedicion}
                    onChange={(e) => setFechaMedicion(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Estructura de Fustes
                  </label>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className={`btn ${tipoFuste === "monofuste" ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: 11.5, padding: "4px 10px" }}
                      onClick={() => handleTipoFusteChange("monofuste")}
                    >
                      Monofuste
                    </button>
                    <button
                      type="button"
                      className={`btn ${tipoFuste === "polifuste" ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: 11.5, padding: "4px 10px" }}
                      onClick={() => handleTipoFusteChange("polifuste")}
                    >
                      Polifuste (≥ 2 fustes)
                    </button>
                  </div>
                </div>
              </div>

              {/* Registro de Diámetros (Regla H-1) */}
              <div style={{ marginBottom: 12 }}>
                {tipoFuste === "monofuste" ? (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      DAP — Diámetro a la altura del pecho (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="sivu-sig-controls-input"
                      style={{ width: "100%" }}
                      placeholder="Ej. 25.4"
                      value={dapCm}
                      onChange={(e) => setDapCm(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ width: 140, marginBottom: 10 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        Nº Fustes (≥ 2) *
                      </label>
                      <input
                        type="number"
                        min="2"
                        className="sivu-sig-controls-input"
                        style={{ width: "100%" }}
                        value={numeroFustes}
                        onChange={(e) => handleNumeroFustesChange(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {dapFustesValues.map((val, i) => (
                        <div key={i}>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Fuste {i + 1} — DAP (cm) *
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            className="sivu-sig-controls-input"
                            style={{ width: "100%" }}
                            placeholder="Ej. 18.5"
                            value={val}
                            onChange={(e) => handleFusteDapChange(i, e.target.value)}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 10, marginBottom: 0 }}>
                      Se guarda el diámetro de cada fuste como dato primario. El DAP equivalente
                      para ejemplares de más de un fuste todavía no tiene una regla metodológica
                      aprobada (pendiente, ver <code>modelo-arbol-medicion.md</code>) — por eso no
                      se muestra ni se calcula aquí.
                    </p>
                  </div>
                )}
              </div>

              {/* Alturas y Copa */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Altura Total (m) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    placeholder="Ej. 8.5"
                    value={alturaTotalM}
                    onChange={(e) => setAlturaTotalM(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Diámetro Copa (m) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    placeholder="Ej. 4.2"
                    value={diametroCopaM}
                    onChange={(e) => setDiametroCopaM(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Alt. 1ª Rama (m) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="sivu-sig-controls-input"
                    style={{ width: "100%" }}
                    placeholder="Ej. 1.8"
                    value={alturaPrimeraRamaM}
                    onChange={(e) => setAlturaPrimeraRamaM(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Clase de Edad Opcional */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Clase de Edad (Estimación de terreno)
                </label>
                <select
                  className="sivu-sig-controls-select"
                  style={{ width: "100%" }}
                  value={claseEdad}
                  onChange={(e) => setClaseEdad(e.target.value)}
                >
                  <option value="">— Sin estimar —</option>
                  {CLASE_EDAD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <footer className="sivu-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar árbol y medición"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
