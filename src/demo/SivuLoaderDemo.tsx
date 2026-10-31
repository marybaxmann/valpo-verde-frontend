import { useState } from "react";
import { SIVU_LOADER_DEFAULT_MESSAGE, SivuLoader } from "../components/SivuLoader";
import { useTheme } from "../hooks/useTheme";
import "./sivuLoaderDemo.css";

/**
 * Demostración aislada de SivuLoader (no es una ruta de la aplicación ni
 * se incluye en el build). Con `npm run dev`, abrir
 * http://localhost:5173/demo/sivu-loader.html
 *
 * Los contenedores de ejemplo solo muestran el loader en contexto: no
 * cargan ni simulan datos.
 */
export default function SivuLoaderDemo() {
  const { theme, toggleTheme } = useTheme();
  const [message, setMessage] = useState(SIVU_LOADER_DEFAULT_MESSAGE);
  const [overlay, setOverlay] = useState(false);

  if (overlay) {
    return (
      <div className="loader-demo__overlay" onClick={() => setOverlay(false)} title="Clic para cerrar">
        <SivuLoader variant="fullscreen" message={message} />
      </div>
    );
  }

  return (
    <main className="loader-demo">
      <header className="loader-demo__header">
        <div>
          <h1>SivuLoader</h1>
          <p>Demostración aislada para evaluación. Aún no está integrado en la plataforma.</p>
        </div>
        <div className="loader-demo__controls">
          <div className="field">
            <label htmlFor="loader-message">Texto de carga</label>
            <input id="loader-message" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={toggleTheme}>
            Modo {theme === "dark" ? "claro" : "oscuro"}
          </button>
          <button className="btn btn-primary" onClick={() => setOverlay(true)}>
            Ver a pantalla completa
          </button>
        </div>
      </header>

      <section>
        <h2>Variante <code>fullscreen</code></h2>
        <p className="loader-demo__note">Para sesión, perfil y cambio de pantalla. Vista reducida dentro de un marco.</p>
        <div className="loader-demo__frame">
          <SivuLoader variant="fullscreen" message={message} />
        </div>
      </section>

      <section>
        <h2>Variante <code>inline</code></h2>
        <p className="loader-demo__note">Para cargas dentro de módulos, tarjetas y paneles. Contenedores de ejemplo, sin datos.</p>
        <div className="loader-demo__grid">
          <div className="card">
            <div className="loader-demo__card-head">Tarjeta de módulo</div>
            <SivuLoader message={message} />
          </div>
          <div className="card loader-demo__panel">
            <div className="loader-demo__card-head">Panel lateral angosto</div>
            <SivuLoader message="Cargando evaluación…" />
          </div>
        </div>
      </section>

      <section>
        <h2>Movimiento reducido</h2>
        <p className="loader-demo__note">
          Con <code>prefers-reduced-motion: reduce</code> (sistema operativo o DevTools → Rendering) la escena queda quieta y
          solo los puntos cambian de opacidad.
        </p>
      </section>
    </main>
  );
}
