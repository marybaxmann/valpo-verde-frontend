import logoLight from "../assets/sivu-logo-light.png";
import logoOlive from "../assets/sivu-logo-olive.png";

/**
 * Logotipo SIVU (CC-057; recursos de la autora copiados de la maqueta
 * SIVU Lab según CC-058). Oliva sobre fondo claro, claro sobre fondo
 * oscuro: el CSS muestra uno u otro según <html data-theme>, sin estado
 * propio, así sigue al tema aunque lo cambie otra parte de la interfaz.
 */
export function SivuLogo({ height = 30, className = "" }: { height?: number; className?: string }) {
  return (
    <span className={`sivu-logo ${className}`} style={{ height }}>
      <img className="sivu-logo__img sivu-logo__img--olive" src={logoOlive} alt="SIVU" height={height} />
      <img className="sivu-logo__img sivu-logo__img--light" src={logoLight} alt="SIVU" height={height} />
    </span>
  );
}
