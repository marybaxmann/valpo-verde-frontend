import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sivu-theme";

/** Tema inicial: lo resuelve index.html antes del primer pintado. */
function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Modo claro / oscuro. La preferencia es solo de este navegador. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  const toggleTheme = useCallback(() => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento (modo privado): el tema dura solo esta visita.
    }
    setTheme(next);
  }, []);

  return { theme, toggleTheme };
}
