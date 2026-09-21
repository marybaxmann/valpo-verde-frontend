import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";
import "./styles/global.css";

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
