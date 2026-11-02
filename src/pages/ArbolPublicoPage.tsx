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
 * `qr_token`. Si el QR no existe (404) se muestra «Código QR no disponible»
 * sin ningún dato del ejemplar; el límite de consultas (429) y la falta de
 * conexión tienen su propio aviso.
 */
type Fallo = "no-disponible" | "limite" | "red";

const MENSAJES: Record<Fallo, { titulo: string; texto: string }> = {
  "no-disponible": {
    titulo: "Código QR no disponible",
    texto: "Este código no corresponde a una ficha pública vigente. Si crees que es un error, avisa al municipio.",
  },
  limite: { titulo: "Demasiadas consultas", texto: "Hiciste muchas consultas seguidas. Inténtalo de nuevo en unos minutos." },
  red: { titulo: "No pudimos conectarnos", texto: "Revisa tu conexión e inténtalo de nuevo en unos minutos." },
};

export default function ArbolPublicoPage() {
  const { qrToken = "" } = useParams();
  const [estado, setEstado] = useState<{ token: string; ficha: FichaPublica } | { token: string; error: Fallo } | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerFichaPublica(qrToken)
      .then((ficha) => !cancelado && setEstado({ token: qrToken, ficha }))
      .catch((err: unknown) => {
        if (cancelado) return;
        const status = err instanceof ApiError ? err.status : 0;
        setEstado({ token: qrToken, error: status === 404 || status === 400 ? "no-disponible" : status === 429 ? "limite" : "red" });
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
          <h1>{MENSAJES[actual.error].titulo}</h1>
          <p>{MENSAJES[actual.error].texto}</p>
        </main>
      </div>
    );
  }

  return <ExperienciaArbol ficha={actual.ficha} qrToken={qrToken} />;
}
