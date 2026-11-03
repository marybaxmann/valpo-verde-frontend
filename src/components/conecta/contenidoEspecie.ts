/**
 * Textos ciudadanos por especie para la ficha pública (pedido de la
 * responsable, 2026-11-03: «solo como front», contenido de divulgación
 * para la presentación). Fuente: SIVU_Contenido_Horizontal_Acer_negundo.xlsx,
 * estado «BORRADOR — REQUIERE REVISIÓN». La ficha no lo rotula en pantalla
 * (pedido de la responsable, 2026-11-03: frontend limpio, estado documentado
 * aquí y en git). No es dato metodológico ni de inventario: no reemplaza un
 * valor que entregue la API (catálogo de especies), solo cubre su ausencia.
 * Provisional hasta que el contenido por especie exista en el backend.
 */
export interface ContenidoEspecie {
  nombreComun: string;
  genero: string;
  familia: string;
  origen: string;
  curiosidades: string;
  beneficios: string;
  aire: string;
  agua: string;
  follaje: string;
  hojas: string;
  miAno: string;
  comoCuidarme: string;
  consejos: string;
  /**
   * Relleno temporal para la demostración (pedido de la responsable,
   * 2026-11-03), redactado con información general de la especie; no es
   * oficial ni medido en el ejemplar; tampoco se rotula en pantalla.
   */
  temporal?: {
    fotos: string;
    edadAltura: string;
    sombra: string;
    carbono: string;
    historia: string;
  };
}

const CONTENIDO: Record<string, ContenidoEspecie> = {
  "acer negundo": {
    nombreComun: "Arce negundo",
    genero: "Acer",
    familia: "Sapindaceae",
    origen: "América del Norte",
    curiosidades:
      "Mis hojas están formadas por varios folíolos, algo poco habitual entre los arces. Mis frutos alados se llaman sámaras y pueden dispersarse con el viento.",
    beneficios:
      "Con mi copa puedo proporcionar sombra y contribuir al ambiente urbano. Las cifras específicas se publicarán cuando SIVU valide sus cálculos.",
    aire: "Mis hojas pueden interceptar partículas del aire; el beneficio cuantificado requiere un método validado.",
    agua: "Mi copa puede interceptar parte de la lluvia; el volumen anual requiere un cálculo validado.",
    follaje:
      "Caducifolio: pierdo las hojas durante la estación desfavorable, habitualmente en otoño e invierno.",
    hojas:
      "Hojas opuestas y compuestas, habitualmente con 3 a 7 folíolos; pueden recordar a las de un fresno.",
    miAno:
      "En primavera brotan hojas nuevas y puede ocurrir la floración; durante la temporada de crecimiento desarrollo mi copa; en otoño mis hojas suelen amarillear y caer. Los tiempos varían según el clima local.",
    comoCuidarme:
      "Evita dañar mi tronco, mis raíces y el suelo que me rodea. Si observas una rama peligrosa o daños, repórtalos para evaluación municipal.",
    consejos:
      "No claves objetos en el tronco ni cortes ramas por tu cuenta. Evita compactar el suelo o depositar residuos junto a mis raíces. Reporta ramas quebradas, inclinaciones nuevas o daños visibles mediante SIVU.",
    // Fuentes generales: UF/IFAS (ST-20), RHS, fichas de arbolado de
    // Vitacura (cita CONAF 2013, «Árboles urbanos de Chile») y de
    // Emilia-Romagna.
    temporal: {
      fotos:
        "Esta es una foto referencial de mi especie. Pronto verás fotos de mí, tomadas aquí mismo en Valparaíso.",
      edadAltura:
        "Un arce negundo adulto suele medir entre 9 y 15 metros, como un edificio de 4 o 5 pisos. Crezco rápido, pero vivo poco para ser un arce: en la ciudad rara vez paso de los 40 años.",
      sombra:
        "Mi copa adulta puede abrirse entre 8 y 13 metros de ancho y dar sombra a un espacio parecido al de una casa.",
      carbono:
        "Mientras crezco, saco CO₂ del aire y guardo su carbono en mi tronco y mis ramas. Como crezco rápido, en mis primeros años lo acumulo con rapidez.",
      historia:
        "Soy uno de los árboles que SIVU registra en el centro de Valparaíso. Aquí aparecerán las revisiones y cuidados que reciba del municipio.",
    },
  },
};

export function contenidoDeEspecie(
  especieCientifica: string | null,
): ContenidoEspecie | null {
  if (!especieCientifica) return null;
  return (
    CONTENIDO[especieCientifica.trim().replace(/\s+/g, " ").toLowerCase()] ??
    null
  );
}
