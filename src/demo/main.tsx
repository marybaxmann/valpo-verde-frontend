import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SivuLoaderDemo from "./SivuLoaderDemo";
import "../styles/global.css";

/** Punto de entrada de demo/sivu-loader.html (fuera del build de la app). */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SivuLoaderDemo />
  </StrictMode>
);
