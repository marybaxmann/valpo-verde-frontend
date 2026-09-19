import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icons";
import { useAuth } from "../hooks/useAuth";

/**
 * Login real contra Supabase Auth (F2). Sin roles todavía: el rol de
 * aplicación se resuelve en F4 vía GET /api/auth/me.
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
        <div className="login-card__mark">
          <Icon name="leaf" size={26} />
        </div>
        <h1>Arbolado Urbano</h1>
        <p>Plataforma de gestión técnica de arbolado municipal</p>

        <form onSubmit={handleSubmit} style={{ textAlign: "left", marginTop: 8 }}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <p style={{ color: "var(--red-500)", fontSize: 12.5, marginBottom: 12 }}>
              <Icon name="alert" size={12} /> {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="login-note">Sesión real vía Supabase Auth</p>
      </div>
    </div>
  );
}
