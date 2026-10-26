import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icons";
import { SivuLogo } from "../components/SivuLogo";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import calle from "../assets/login-calle.jpg";

/**
 * Marcas sobre la fotografía, en % del marco 4:3 que cubre la pantalla.
 * Son ilustrativas (lo dice la leyenda): no son una evaluación ni usan
 * nombres de catálogo; la segunda línea es solo la zona del árbol o de la
 * calle (decisión de la autora, 2026-10-26).
 */
const MARKS: { x: number; y: number; side: "l" | "r"; title: string; zone: string; delay: number }[] = [
  { x: 42.5, y: 30, side: "r", title: "Cavidad en el fuste", zone: "Tronco", delay: 0.6 },
  { x: 67, y: 63, side: "l", title: "Acera levantada", zone: "Acera", delay: 1.3 },
  { x: 33, y: 72, side: "l", title: "Alcorque sin delimitar", zone: "Alcorque", delay: 2 },
];

/**
 * Pantalla de acceso de SIVU (Fase 7, Paso 3): diseño oficial de la
 * maqueta «SIVU Lab» (CC-057) con la fotografía de la autora (CC-058).
 * Solo correo y contraseña contra Supabase Auth. Sin recuperación de
 * contraseña ni acceso a Valpo Verde Conecta (no aprobados).
 */
export default function Login() {
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setError(error);
  }

  return (
    <div className="sivu-login">
      <div className="sivu-login__photo" aria-hidden="true">
        <div className="sivu-login__frame">
          <img src={calle} alt="" />
          <span className="sivu-login__scan" />
          {MARKS.map((m) => (
            <span
              key={m.title}
              className={`sivu-login__mark sivu-login__mark--${m.side}`}
              style={{ left: `${m.x}%`, top: `${m.y}%`, animationDelay: `${m.delay}s` }}
            >
              <i className="sivu-login__ring" />
              <span className="sivu-login__label">
                <strong>{m.title}</strong>
                <small>{m.zone}</small>
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="sivu-login__shade" aria-hidden="true" />

      <section className="sivu-login__copy">
        <span className="sivu-login__eyebrow">
          <Icon name="pin" size={14} /> Valparaíso
        </span>
        <h2>
          Del tronco a la vereda,
          <br />
          todo queda registrado.
        </h2>
        <p>Inventario, riesgo, infraestructura y mantención del arbolado urbano en un solo lugar.</p>
        <small>Observaciones ilustrativas sobre una fotografía; no constituyen una evaluación.</small>
      </section>

      <main className="sivu-login__card">
        <button
          type="button"
          className="sivu-login__theme"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
        </button>

        <form className="sivu-login__form" onSubmit={handleSubmit} noValidate>
          <span className="sivu-login__logo">
            <SivuLogo height={40} />
          </span>
          <h1>Ingresa a SIVU</h1>
          <p className="sivu-login__sub">Gestión del arbolado urbano de Valparaíso</p>

          <label className="sivu-login__field">
            <span>Correo electrónico</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="nombre@ejemplo.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </label>

          <label className="sivu-login__field">
            <span>Contraseña</span>
            <span className="sivu-login__pass">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                <Icon name="eye" size={18} />
              </button>
            </span>
          </label>

          {error && (
            <p className="sivu-login__msg" role="alert">
              <Icon name="alert" size={14} />
              {error}
            </p>
          )}

          <button type="submit" className="sivu-login__btn" disabled={submitting}>
            {submitting ? <span className="sivu-login__spin" aria-label="Ingresando" /> : "Ingresar"}
          </button>
        </form>

        <p className="sivu-login__foot">Acceso para personal autorizado · SIVU</p>
      </main>
    </div>
  );
}
