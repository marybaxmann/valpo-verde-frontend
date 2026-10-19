import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "./Icon";
import type { Theme } from "./TopBar";
import logoLight from "../assets/sivu-logo-light.png";
import logoOlive from "../assets/sivu-logo-olive.png";

/* ═════════ Ilustración: copas vistas desde abajo ═════════
   Dibujo propio en SVG (sin fotos de terceros). Determinista: siempre igual. */

const W = 800;
const H = 900;
const CX = 400;
const CY = 430;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Rama ahusada desde fuera del marco hacia el claro del cielo. */
function branch(x0: number, y0: number, x1: number, y1: number, w0: number, bend: number) {
  const mx = (x0 + x1) / 2 + (y1 - y0) * bend;
  const my = (y0 + y1) / 2 - (x1 - x0) * bend;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const w1 = w0 * 0.18;
  return `M${x0 + nx * w0} ${y0 + ny * w0} Q${mx + nx * w0 * 0.6} ${my + ny * w0 * 0.6} ${x1 + nx * w1} ${y1 + ny * w1} L${x1 - nx * w1} ${y1 - ny * w1} Q${mx - nx * w0 * 0.6} ${my - ny * w0 * 0.6} ${x0 - nx * w0} ${y0 - ny * w0}Z`;
}

const TRUNKS: [number, number, number, number, number, number][] = [
  [-60, -40, 300, 300, 46, 0.08],
  [860, -60, 520, 290, 50, -0.1],
  [-80, 980, 290, 600, 54, -0.06],
  [880, 960, 520, 590, 48, 0.1],
  [-90, 470, 240, 450, 36, 0.12],
  [900, 420, 580, 430, 34, -0.12],
  [380, 1000, 410, 690, 40, 0.04],
  [430, -90, 400, 190, 30, -0.05],
];

function Canopy() {
  const { clusters, twigs } = useMemo(() => {
    const r = rng(7);
    const clusters: { x: number; y: number; s: number; tone: number }[] = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2 + r() * 0.25;
      // Elipse del claro: más ancha arriba-abajo, como en la referencia.
      const d = 245 + r() * 420;
      clusters.push({ x: CX + Math.cos(a) * d * 1.05, y: CY + Math.sin(a) * d * 1.18, s: 34 + r() * 46, tone: r() });
    }
    const twigs = TRUNKS.flatMap(([x0, y0, x1, y1, w], k) => {
      const t = 0.45 + (k % 3) * 0.15;
      const bx = x0 + (x1 - x0) * t;
      const by = y0 + (y1 - y0) * t;
      const ang = Math.atan2(y1 - y0, x1 - x0) + (k % 2 ? 0.7 : -0.7);
      return [branch(bx, by, bx + Math.cos(ang) * 170, by + Math.sin(ang) * 170, w * 0.32, 0.1)];
    });
    return { clusters, twigs };
  }, []);

  const blob = (c: (typeof clusters)[number], i: number, layer: "halo" | "base" | "light") => {
    const r = rng(i * 13 + 1);
    const n = 7;
    return Array.from({ length: n }, (_, j) => {
      const a = (j / n) * Math.PI * 2 + r();
      const d = c.s * (0.35 + r() * 0.4);
      const rad = c.s * (0.38 + r() * 0.22) * (layer === "halo" ? 1.12 : layer === "light" ? 0.55 : 1);
      const dx = layer === "light" ? -c.s * 0.18 : layer === "halo" ? c.s * 0.06 : 0;
      return <circle key={`${layer}${i}-${j}`} cx={c.x + Math.cos(a) * d + dx} cy={c.y + Math.sin(a) * d + dx} r={rad} />;
    });
  };

  return (
    <svg className="lg-art__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="lg-sky" cx="50%" cy="48%" r="60%">
          <stop offset="0" stopColor="#e4f1ef" />
          <stop offset="0.55" stopColor="#b9dbe2" />
          <stop offset="1" stopColor="#9cc9d4" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#lg-sky)" />
      <g fill="#2f3a22">
        {TRUNKS.map((t, i) => (
          <path key={i} d={branch(...t)} />
        ))}
        {twigs.map((d, i) => (
          <path key={`t${i}`} d={d} />
        ))}
      </g>
      <g fill="#eef0c4">{clusters.map((c, i) => blob(c, i, "halo"))}</g>
      <g>
        {clusters.map((c, i) => (
          <g key={i} fill={c.tone < 0.33 ? "#485635" : c.tone < 0.7 ? "#6f8a45" : "#8fae55"}>
            {blob(c, i, "base")}
          </g>
        ))}
      </g>
      <g fill="#b9d36f" opacity="0.85">{clusters.filter((c) => c.tone > 0.4).map((c, i) => blob(c, i + 200, "light"))}</g>
      {/* Textura: hojas sueltas sobre las copas */}
      {clusters.map((c, i) => {
        const r = rng(i * 31 + 5);
        return (
          <g key={`lv${i}`}>
            {Array.from({ length: 6 }, (_, j) => (
              <ellipse
                key={j}
                cx={c.x + (r() - 0.5) * c.s * 1.6}
                cy={c.y + (r() - 0.5) * c.s * 1.6}
                rx={5 + r() * 4}
                ry={2.4 + r() * 1.6}
                transform={`rotate(${r() * 180} ${c.x} ${c.y})`}
                fill={j % 3 === 0 ? "#2f3a22" : "#d6e59a"}
                opacity={j % 3 === 0 ? 0.35 : 0.7}
              />
            ))}
          </g>
        );
      })}
      <g fill="#2a331f">
        {[
          [372, 360, 1],
          [350, 420, 0.85],
          [392, 468, 1.15],
        ].map(([x, y, s], i) => (
          <path key={i} transform={`translate(${x} ${y}) scale(${s})`} d="M0 0 C-6 -4 -12 -2 -16 4 C-10 1 -5 2 -2 6 L0 14 L2 6 C5 2 10 1 16 4 C12 -2 6 -4 0 0Z" />
        ))}
      </g>
    </svg>
  );
}

function Leaf({ x, y, r, s = 1 }: { x: string; y: string; r: number; s?: number }) {
  return (
    <svg className="lg-leaf" style={{ left: x, top: y, transform: `rotate(${r}deg) scale(${s})` }} viewBox="0 0 24 14" aria-hidden="true">
      <path d="M1 7 C6 0 17 0 23 7 C17 14 6 14 1 7Z" />
    </svg>
  );
}

/* ═════════ Pantalla de acceso ═════════ */

export function Login({ theme, onTheme, onEnter, onCitizen }: { theme: Theme; onTheme: () => void; onEnter: () => void; onCitizen: () => void }) {
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
    <div className={`lg theme-${theme}`}>
      <div className="lg-art">
        <Canopy />
        <svg className="lg-wave lg-wave--v" viewBox="0 0 160 900" preserveAspectRatio="none" aria-hidden="true">
          <path d="M160 0 H70 C20 80 30 170 80 240 C130 310 140 400 90 470 C40 540 10 620 60 700 C100 770 90 850 60 900 H160Z" />
        </svg>
        <svg className="lg-wave lg-wave--h" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 V30 C60 0 120 10 180 34 C240 58 320 50 400 14 V60Z" />
        </svg>
      </div>

      <main className="lg-panel">
        <Leaf x="4%" y="12%" r={-30} />
        <Leaf x="12%" y="78%" r={40} s={0.8} />
        <Leaf x="86%" y="20%" r={18} s={0.7} />

        <div className="lg-top">
          <span className="brand__tag">Maqueta</span>
          <button type="button" className="lg-theme" aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={onTheme}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
          </button>
        </div>

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

        <p className="lg-foot">Acceso para personal autorizado · SIVU</p>
      </main>
    </div>
  );
}
