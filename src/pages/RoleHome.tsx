import { useAuth } from "../hooks/useAuth";

/**
 * Placeholder de inicio para /admin y /usuario (F5). Reutiliza el
 * mismo contenido de perfil que ya existía en App.tsx desde F4 — no es
 * un dashboard real, solo confirma que el routing por rol llegó al
 * shell correcto con los datos reales del backend.
 */
export default function RoleHome({ roleLabel }: { roleLabel: string }) {
  const { profile } = useAuth();

  return (
    <div className="card card--pad">
      <h3 style={{ marginBottom: 10 }}>Routing por rol confirmado (F5)</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        Estás en el shell de <strong>{roleLabel}</strong>, resuelto desde{" "}
        <code>profile.role</code> (GET /api/auth/me), no desde un mock.
      </p>

      {profile && (
        <div className="info-list">
          <div className="info-list__item">
            <span>Nombre</span>
            {profile.nombre ?? "—"}
          </div>
          <div className="info-list__item">
            <span>Email</span>
            {profile.email ?? "—"}
          </div>
          <div className="info-list__item">
            <span>Rol (backend)</span>
            {profile.role ?? "—"}
          </div>
          <div className="info-list__item">
            <span>Activo</span>
            {profile.activo ? "Sí" : "No"}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 14 }}>
        Sin proyectos, inventario ni dashboard real todavía — fases posteriores.
      </p>
    </div>
  );
}
