import { useState, type FormEvent } from "react";
import { Icon } from "./Icon";
import type { Theme } from "./TopBar";
import logoLight from "../assets/sivu-logo-light.png";
import logoOlive from "../assets/sivu-logo-olive.png";
import calle from "../assets/login-calle.jpg";

/* ═════════ Formulario ═════════ */

function LoginForm({ theme, onEnter, onCitizen }: { theme: Theme; onEnter: () => void; onCitizen: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (forgot) {
      setError(null);
      setBusy(true);
      window.setTimeout(() => {
        setBusy(false);
        setForgot(false);
        setError("Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.");
      }, 700);
      return;
    }
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    setError(null);
    setBusy(true);
    window.setTimeout(onEnter, 800);
  };

  const sent = error?.startsWith("Si el correo");

  return (
    <form className="lg-form" onSubmit={submit} noValidate>
      <img className="lg-logo" src={theme === "dark" ? logoLight : logoOlive} alt="SIVU" />
      <h1>{forgot ? "Recuperar contraseña" : "Ingresa a SIVU"}</h1>
      <p className="lg-sub">{forgot ? "Te enviaremos un enlace a tu correo." : "Gestión del arbolado urbano de Valparaíso"}</p>

      <label className="lg-field">
        <span>Correo electrónico</span>
        <input type="email" value={email} placeholder="nombre@ejemplo.cl" autoComplete="off" onChange={(e) => setEmail(e.target.value)} />
      </label>

      {!forgot && (
        <label className="lg-field">
          <span>Contraseña</span>
          <span className="lg-pass">
            <input type={show ? "text" : "password"} value={password} placeholder="••••••••" autoComplete="off" onChange={(e) => setPassword(e.target.value)} />
            <button type="button" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
              <Icon name="eye" size={18} />
            </button>
          </span>
        </label>
      )}

      {error && (
        <p className={`lg-msg ${sent ? "lg-msg--ok" : ""}`} role="alert">
          <Icon name={sent ? "check" : "alert"} size={14} />
          {error}
        </p>
      )}

      <button type="submit" className="lg-btn" disabled={busy}>
        {busy ? <span className="lg-spin" aria-label="Cargando" /> : forgot ? "Enviar enlace" : "Ingresar"}
      </button>

      <button
        type="button"
        className="lg-link"
        onClick={() => {
          setForgot((f) => !f);
          setError(null);
        }}
      >
        {forgot ? "Volver al ingreso" : "¿Olvidaste tu contraseña?"}
      </button>

      <div className="lg-or">
        <span>¿No trabajas en el municipio?</span>
      </div>
      <button type="button" className="lg-citizen" onClick={onCitizen}>
        <Icon name="leaf" size={16} />
        Conoce los árboles en Valpo Verde Conecta
        <Icon name="arrowRight" size={15} />
      </button>
    </form>
  );
}

/* ═════════ Acceso: la calle leída por SIVU ═════════
   Las marcas se ubican en % de la foto (4:3), que cubre la pantalla. */

const MARKS: { x: number; y: number; side: "l" | "r"; title: string; tag: string; delay: number }[] = [
  { x: 42.5, y: 30, side: "r", title: "Cavidad en el fuste", tag: "Tronco · defecto observado", delay: 0.6 },
  { x: 67, y: 63, side: "l", title: "Acera levantada", tag: "Infraestructura · Acera / vereda", delay: 1.3 },
  { x: 33, y: 72, side: "l", title: "Alcorque sin delimitar", tag: "Infraestructura · Alcorque", delay: 2 },
];

export function Login(props: { theme: Theme; onTheme: () => void; onEnter: () => void; onCitizen: () => void }) {
  return (
    <div className={`lg lg--foto theme-${props.theme}`}>
      <div className="lgf-photo" aria-hidden="true">
        <div className="lgf-frame">
          <img src={calle} alt="" />
          <span className="lgf-scan" />
          {MARKS.map((m) => (
            <span key={m.title} className={`lgf-mark lgf-mark--${m.side}`} style={{ left: `${m.x}%`, top: `${m.y}%`, animationDelay: `${m.delay}s` }}>
              <i className="lgf-ring" />
              <span className="lgf-label">
                <strong>{m.title}</strong>
                <small>{m.tag}</small>
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="lgf-shade" aria-hidden="true" />

      <section className="lgf-copy">
        <span className="lgf-eyebrow">
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

      <main className="lgf-card">
        <div className="lg-top">
          <span className="brand__tag">Maqueta</span>
          <button type="button" className="lg-theme" aria-label={props.theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={props.onTheme}>
            <Icon name={props.theme === "dark" ? "sun" : "moon"} size={17} />
          </button>
        </div>
        <LoginForm theme={props.theme} onEnter={props.onEnter} onCitizen={props.onCitizen} />
        <p className="lg-foot">Acceso para personal autorizado · SIVU</p>
      </main>
    </div>
  );
}
