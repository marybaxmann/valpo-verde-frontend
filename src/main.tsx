import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";
import "./styles/global.css";
import "./styles/material.css";
import "./styles/shell.css";
import "./styles/login.css";
import "./styles/dashboard.css";
import "./styles/inventory.css";
import "./styles/territory.css";
import "./styles/maintenance.css";
import "./styles/project.css";
import "./styles/inspection.css";
import "./styles/species.css";

/**
 * Tras un despliegue nuevo, una pestaña abierta pide módulos de la versión
 * anterior, que ya no existen: se recarga una vez para tomar la nueva
 * (como máximo una vez por minuto, para no entrar en un ciclo).
 */
window.addEventListener("vite:preloadError", (event) => {
  const clave = "sivu-recarga-por-version";
  let ultima = 0;
  try {
    ultima = Number(sessionStorage.getItem(clave) ?? 0);
  } catch {
    // Sin sessionStorage se recarga igual.
  }
  if (Date.now() - ultima < 60_000) return;
  event.preventDefault();
  try {
    sessionStorage.setItem(clave, String(Date.now()));
  } catch {
    // Ídem.
  }
  window.location.reload();
});

/**
 * react-router-dom se inicializa aquí (desde F0). Desde F5, App.tsx
 * define el árbol de rutas protegido por sesión + rol real.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
