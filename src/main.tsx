import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./styles/global.css";

/**
 * react-router-dom se instala y se inicializa aquí (F0) para confirmar
 * que la dependencia compila, pero App.tsx todavía no define ninguna
 * ruta: el árbol de rutas productivo se construye en F5.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
