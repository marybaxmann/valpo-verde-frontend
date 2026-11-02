import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listarInventarioCompleto } from "../api/inventory";
import type { ArbolInventario } from "../types/inventory";
import { PendingNotice } from "../components/PendingNotice";
import { Icon } from "../components/Icons";
import { VistaPreviaCiudadana } from "../components/conecta/VistaPreviaCiudadana";
import { PlacasQr } from "../components/conecta/PlacasQr";
import { useAuth } from "../hooks/useAuth";

type Tab = "reportes" | "qr" | "ficha";

/**
 * Valpo Verde Conecta — prototipo para la demo (pedido de la autora,
 * 2026-10-27). Sigue la composición de la maqueta SIVU Lab (tres pestañas:
 * reportes ciudadanos, código QR y ficha pública), escrita de nuevo
 * (CC-058: no se copian `Conecta.tsx` ni `conecta.ts`). Sin datos ficticios:
 * los reportes esperan CC-062 y sus endpoints; la ficha pública muestra
 * árboles reales del inventario (B1) con los campos que ya son públicos.
 */
export default function ConectaPage() {
  const { projectId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("ficha");
  const [arboles, setArboles] = useState<ArbolInventario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string>("");
  const { profile } = useAuth();
  const municipal = profile?.role === "usuario_municipal";

  useEffect(() => {
    let cancelled = false;
    listarInventarioCompleto(projectId, {})
      .then((a) => {
        if (!cancelled) setArboles(a);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el inventario.");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const arbol = arboles?.find((a) => a.id === elegido) ?? arboles?.[0] ?? null;

  return (
    <div className="sivu-dash sivu-conecta">
      <header className="sivu-phead">
        <div>
          <div className="sivu-phead__eyebrow">
            <span className="sivu-chip">Prototipo</span>
            <span>Participación ciudadana</span>
          </div>
          <h1 className="sivu-phead__title">Valpo Verde Conecta</h1>
          <p className="sivu-phead__meta">La comunidad reporta, consulta la ficha pública del árbol y la escanea en terreno.</p>
        </div>
      </header>

      <div className="sivu-seg" role="tablist" aria-label="Secciones de Conecta">
        {(
          [
            ["reportes", "Reportes ciudadanos"],
            ["qr", "Placas QR"],
            ["ficha", "Ficha pública"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`sivu-seg__opt ${tab === id ? "is-on" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "reportes" && (
        <section className="sivu-panel sivu-conecta__panel">
          <div className="sivu-panel__head">
            <h2>Reportes ciudadanos</h2>
          </div>
          <p className="sivu-conecta__lead">
            Cada reporte llega con foto, ubicación y urgencia. El Usuario municipal lo toma en revisión, responde a la persona y lo
            deriva a inspección o a una orden de trabajo.
          </p>
          <ol className="sivu-conecta__flow" aria-label="Recorrido de un reporte">
            {["Ingresada", "En revisión", "Derivada", "Resuelta"].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <PendingNotice what="los reportes ciudadanos" refs="CC-062 · Incidencias (B9)" />
        </section>
      )}

      {tab === "qr" && (
        <>
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!arboles && !error && <p className="sivu-state">Cargando árboles…</p>}
          {arboles && arboles.length === 0 && <p className="sivu-state">El proyecto no tiene árboles registrados.</p>}
          {arboles && arboles.length > 0 && <PlacasQr projectId={projectId} arboles={arboles} municipal={municipal} />}
        </>
      )}

      {tab === "ficha" && (
        <section className="sivu-panel sivu-conecta__panel">
          <div className="sivu-panel__head">
            <h2>Ficha pública</h2>
            {arboles && arboles.length > 1 && (
              <select aria-label="Árbol" value={arbol?.id ?? ""} onChange={(e) => setElegido(e.target.value)}>
                {arboles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tree_code} · {a.nombre_comun ?? a.especie_cientifica ?? ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!arboles && !error && <p className="sivu-state">Cargando árboles…</p>}
          {arboles && arboles.length === 0 && <p className="sivu-state">El proyecto no tiene árboles registrados.</p>}
          {arbol && (
            <>
              <p className="sivu-conecta__lead">
                Así verá este árbol quien escanee su código QR, sin iniciar sesión. Solo con los datos que CC-062 permite publicar;
                lo demás aparece como «Próximamente».
              </p>
              <VistaPreviaCiudadana projectId={projectId} arbol={arbol} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
