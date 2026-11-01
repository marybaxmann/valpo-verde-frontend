import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { obtenerFichaPublica } from "../api/publico";
import { ApiError } from "../api/client";
import type { FichaPublica } from "../types/fichaPublica";
import { ExperienciaArbol } from "../components/conecta/ExperienciaArbol";
import { SivuLoader } from "../components/SivuLoader";
import { SivuLogo } from "../components/SivuLogo";

/**
 * Página pública del árbol (Valpo Verde Conecta, CC-062): la abre el QR de
 * la placa, sin iniciar sesión. Pide la ficha al endpoint público por
 * `qr_token`; un token inexistente y un endpoint aún no publicado (#62) se
 * ven igual para la persona: la ficha no está disponible.
 */
export default function ArbolPublicoPage() {
  const { qrToken = "" } = useParams();
  const [estado, setEstado] = useState<{ token: string; ficha: FichaPublica } | { token: string; error: "no-disponible" | "red" } | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerFichaPublica(qrToken)
      .then((ficha) => !cancelado && setEstado({ token: qrToken, ficha }))
      .catch((err: unknown) => {
        if (cancelado) return;
        setEstado({ token: qrToken, error: err instanceof ApiError && err.status < 500 ? "no-disponible" : "red" });
      });
    return () => {
      cancelado = true;
    };
  }, [qrToken]);

  const actual = estado?.token === qrToken ? estado : null;

  if (!actual) return <SivuLoader variant="fullscreen" message="Buscando a tu árbol…" />;

  if ("error" in actual) {
    return (
      <div className="vvc vvc--empty">
        <header className="vvc-top">
          <SivuLogo height={22} />
          <span className="vvc-top__brand">Valpo Verde Conecta</span>
        </header>
        <main className="vvc-empty">
          <SivuLoader variant="inline" message="" />
          <h1>{actual.error === "red" ? "No pudimos conectarnos" : "Esta ficha está en preparación"}</h1>
          <p>
            {actual.error === "red"
              ? "Revisa tu conexión e inténtalo de nuevo en unos minutos."
              : "Muy pronto este código QR te mostrará quién es este árbol, qué aporta a Valparaíso y cómo puedes cuidarlo."}
          </p>
        </main>
      </div>
    );
  }

  return <ExperienciaArbol ficha={actual.ficha} qrToken={qrToken} />;
}
