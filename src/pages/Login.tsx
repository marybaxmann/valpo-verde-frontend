import { Icon } from "../components/Icons";

/**
 * Esqueleto visual únicamente (F0). No hay autenticación real todavía:
 * sin Supabase Auth, sin sesión, sin navegación. Los callbacks se
 * conectarán a Supabase Auth en una fase posterior (F2).
 */
export default function Login({
  onSelectAdmin,
  onSelectUsuario,
}: {
  onSelectAdmin?: () => void;
  onSelectUsuario?: () => void;
}) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__mark">
          <Icon name="leaf" size={26} />
        </div>
        <h1>Arbolado Urbano</h1>
        <p>Plataforma de gestión técnica de arbolado municipal</p>

        <div className="login-options">
          <button className="login-option" onClick={onSelectAdmin}>
            <div className="login-option__icon">
              <Icon name="check-square" size={17} />
            </div>
            <div>
              <div className="login-option__title">Ingresar como Administrador</div>
              <div className="login-option__sub">Equipo técnico — gestión y evaluación</div>
            </div>
          </button>

          <button className="login-option" onClick={onSelectUsuario}>
            <div className="login-option__icon">
              <Icon name="building" size={17} />
            </div>
            <div>
              <div className="login-option__title">Ingresar como Usuario municipal</div>
              <div className="login-option__sub">Institución responsable del arbolado</div>
            </div>
          </button>
        </div>

        <p className="login-note">Esqueleto visual — autenticación real pendiente (F2)</p>
      </div>
    </div>
  );
}
