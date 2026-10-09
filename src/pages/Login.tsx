import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icons";
import { useAuth } from "../hooks/useAuth";

/**
 * Pantalla de acceso institucional SIVU (INV-1C).
 * Autenticación real contra Supabase Auth.
 * Identidad visual técnica, institucional y limpia.
 */
export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Identidad de marca SIVU */}
        <div className="login-card__mark">
          <Icon name="leaf" size={26} />
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.04em",
            color: "var(--sivu-primary-dark)",
            marginBottom: 2,
          }}
        >
          SIVU
        </h1>
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Sistema de Información del Verde Urbano
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 24,
          }}
        >
          Plataforma de gestión técnica y territorial del arbolado
        </p>

        {/* Formulario de autenticación */}
        <form onSubmit={handleSubmit} style={{ textAlign: "left", marginTop: 8 }}>
          <div className="field">
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="nombre@ejemplo.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-primary)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--classification-critical)",
                fontSize: 12.5,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="alert" size={13} /> {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: "100%",
              background: "var(--sivu-primary)",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: 13.5,
              padding: "9px 14px",
              marginTop: 6,
              borderRadius: "var(--radius-sm)",
            }}
          >
            {submitting ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p
          className="login-note"
          style={{
            fontSize: 11.5,
            color: "var(--text-secondary)",
            marginTop: 22,
            marginBottom: 0,
          }}
        >
          Municipalidad de Valparaíso • Acceso institucional
        </p>
      </div>
    </div>
  );
}
