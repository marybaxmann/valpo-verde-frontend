import { Icon, type IconName } from "./Icons";

export function Placeholder({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state__icon">
          <Icon name={icon} size={26} />
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
        <span className="mock-tag">Vista placeholder — pendiente de diseño detallado</span>
      </div>
    </div>
  );
}
