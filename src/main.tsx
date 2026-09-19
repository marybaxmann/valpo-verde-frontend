import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";
import "./styles/global.css";

/**
 * react-router-dom se inicializa aquí (desde F0) pero App.tsx todavía
 * no define ninguna ruta: el árbol de rutas productivo se construye en
 * F5, una vez exista el rol resuelto (F4) para los guards.
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
