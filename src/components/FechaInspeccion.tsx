export function fechaInspeccionValida(valor: string, maximo: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000-") || valor > maximo) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export default function FechaInspeccion({ valor, maximo, bloqueada, cambiar }: {
  valor: string;
  maximo: string;
  bloqueada: boolean;
  cambiar: (fecha: string) => void;
}) {
  const invalida = !fechaInspeccionValida(valor, maximo);
  return (
    <div className="sivu-insp-field">
      <label htmlFor="fecha-inspeccion-terreno" className="sivu-insp-field__name">Fecha de inspección (terreno)</label>
      <input id="fecha-inspeccion-terreno" type="date" value={valor} max={maximo} readOnly={bloqueada} required
        aria-invalid={invalida} aria-describedby={invalida ? "fecha-terreno-ayuda fecha-terreno-error" : "fecha-terreno-ayuda"}
        onChange={(evento) => { if (!bloqueada) cambiar(evento.currentTarget.value); }} />
      <small id="fecha-terreno-ayuda" className="sivu-insp-field__hint">Fecha en que se realizó la visita; puede ser anterior a la fecha de registro</small>
      {invalida && <small id="fecha-terreno-error" className="sivu-insp-field__error">Ingresa una fecha válida hasta {maximo}.</small>}
    </div>
  );
}
