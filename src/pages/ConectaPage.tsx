import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listarInventarioCompleto } from "../api/inventory";
import type { ArbolInventario } from "../types/inventory";
import { Icon } from "../components/Icons";
import { FichaPublicaEditor } from "../components/conecta/FichaPublicaEditor";
import { PlacasQr } from "../components/conecta/PlacasQr";
import { useAuth } from "../hooks/useAuth";

type Tab = "qr" | "ficha";

/**
 * Valpo Verde Conecta — prototipo para la demo (pedido de la autora,
 * 2026-10-27). Sigue la composición de la maqueta SIVU Lab con dos
 * pestañas: placas QR y ficha pública, escrita de nuevo (CC-058: no se
 * copian `Conecta.tsx` ni `conecta.ts`). Los reportes ciudadanos no se
 * muestran aquí: llegan como incidencias de la comunidad y se gestionan en
 * el módulo Incidencias (indicación de la responsable, 2026-11-02).
 */
export default function ConectaPage() {
  const { projectId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("ficha");
  const [arboles, setArboles] = useState<ArbolInventario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="sivu-dash sivu-conecta">
      <header className="sivu-phead">
        <div>
          <div className="sivu-phead__eyebrow">
            <span className="sivu-chip">Prototipo</span>
            <span>Participación ciudadana</span>
          </div>
          <h1 className="sivu-phead__title">Valpo Verde Conecta</h1>
          <p className="sivu-phead__meta">Placas QR de cada árbol y su ficha pública. Los reportes de la comunidad llegan al módulo Incidencias.</p>
        </div>
      </header>

      <div className="sivu-seg" role="tablist" aria-label="Secciones de Conecta">
        {(
          [
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
        <>
          {error && (
            <p className="sivu-state sivu-state--error" role="alert">
              <Icon name="alert" size={13} /> {error}
            </p>
          )}
          {!arboles && !error && <p className="sivu-state">Cargando árboles…</p>}
          {arboles && arboles.length === 0 && <p className="sivu-state">El proyecto no tiene árboles registrados.</p>}
          {arboles && arboles.length > 0 && <FichaPublicaEditor projectId={projectId} arboles={arboles} />}
        </>
      )}
    </div>
  );
}
