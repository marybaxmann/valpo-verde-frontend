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
  // Ulmus minor, Araucaria angustifolia y Ginkgo biloba (pedido de la
  // responsable, 2026-11-11): textos de divulgación entregados por ella,
  // en el mismo estado BORRADOR — REQUIERE REVISIÓN que Acer negundo. Sin
  // bloque `temporal`: la edad, la altura, las fotos y el historial del
  // ejemplar quedan pendientes de SIVU, y la ficha muestra «próximamente».
  // Fuentes declaradas en el material: POWO (Kew), RHS, Woodland Trust,
  // European Atlas of Forest Tree Species, RBGE Threatened Conifers,
  // Enciclopedia de la flora chilena (Chloris Chile), Municipalidad de
  // Curitiba, SANBI (PlantZAfrica) y Northwest Missouri State University.
  "ulmus minor": {
    nombreComun: "Olmo común",
    genero: "Ulmus",
    familia: "Ulmaceae",
    origen: "Europa, norte de África y Asia occidental y central",
    curiosidades:
      "¡Mis hojas son asimétricas!: un lado de su base es más largo que el otro, una pista para reconocer a los olmos. Produzco frutos alados llamados sámaras, que viajan con el viento. Mis pequeñas flores aparecen al final del invierno, incluso antes que mis hojas. Muchos olmos del mundo han sido afectados por una enfermedad llamada grafiosis; por eso, conocer y cuidar los ejemplares que existen es especialmente importante.",
    beneficios:
      "Mi copa puede interceptar la radiación solar y crear espacios más frescos y agradables. Mientras crezco, incorporo carbono y lo guardo en mis tejidos. Las cifras de este ejemplar se publicarán cuando SIVU valide sus cálculos.",
    aire: "Mis hojas pueden retener parte de las partículas suspendidas en el aire; el beneficio cuantificado requiere un método validado.",
    agua: "Mi copa intercepta parte de la lluvia y puede ayudar a disminuir la escorrentía superficial; el volumen requiere un cálculo validado.",
    follaje:
      "Caducifolio: en primavera y verano mis hojas verdes forman mi copa; en otoño suelen ponerse amarillas y caen, y en invierno mis ramas quedan descubiertas.",
    hojas:
      "Hojas simples, alternas y generalmente ovaladas, con bordes dentados y la base desigual, como si un lado comenzara más abajo que el otro.",
    miAno:
      "En primavera desarrollo mis hojas nuevas y mis frutos alados maduran y se dispersan. En verano mi copa tiene abundante follaje verde y da sombra. En otoño mis hojas amarillean y caen poco a poco. En invierno suelo estar sin hojas y, hacia el final, pueden aparecer mis pequeñas flores. Es un ciclo orientativo para el hemisferio sur: puede variar según el clima y las condiciones del árbol.",
    comoCuidarme:
      "Puedo adaptarme a distintas condiciones, pero necesito espacio para crecer y atención adecuada para mantenerme sano. Si observas ramas quebradas, daños visibles u otra situación que necesite atención, repórtala para evaluación municipal.",
    consejos:
      "Evita compactar el suelo a mi alrededor y no dejes escombros sobre mis raíces. No claves objetos, no amarres cables ni dañes mi corteza. No me podes por tu cuenta: las intervenciones las hace personal autorizado. Si sospechas que estoy enfermo, no me apliques pesticidas ni otros productos sin una evaluación profesional.",
  },
  "araucaria angustifolia": {
    nombreComun: "Araucaria brasileña",
    genero: "Araucaria",
    familia: "Araucariaceae",
    origen:
      "Sudamérica: principalmente el sur de Brasil, también el noreste de Argentina y Paraguay",
    curiosidades:
      "Cuando soy joven tengo forma cónica, pero al crecer pierdo mis ramas bajas y mi copa parece un paraguas gigante. Mis semillas, llamadas pinhões en Brasil, son grandes y nutritivas: han sido alimento de comunidades indígenas y son parte de la cocina tradicional del sur de Brasil. Mi familia, las araucariáceas, viene de la era de los dinosaurios. En la naturaleza mi especie está En Peligro Crítico (UICN) por la pérdida y explotación de sus bosques; esa categoría es de la especie en el mundo, no describe la salud de este árbol.",
    beneficios:
      "Mis ramas y hojas interceptan parte de la radiación solar; mi sombra depende de la forma y el tamaño de mi copa. Mientras crezco, capturo dióxido de carbono y guardo parte de ese carbono en mi tronco, ramas y raíces. Las cifras de este ejemplar se publicarán cuando SIVU valide sus cálculos.",
    aire: "Mi follaje puede retener partículas suspendidas en el aire; el beneficio cuantificado requiere un método validado.",
    agua: "Mis hojas y ramas interceptan parte de la lluvia y moderan el agua que llega directo al suelo; el volumen requiere un cálculo validado.",
    follaje:
      "Perennifolio (siempreverde): conservo hojas todo el año y las renuevo poco a poco, en vez de perderlas todas en otoño.",
    hojas:
      "Hojas alargadas, firmes y terminadas en punta aguda, repartidas alrededor de mis ramas, donde pueden durar varios años. ¡Mejor no tocarlas: sus puntas pinchan!",
    miAno:
      "En primavera sigo creciendo y renovando mi follaje. En verano mantengo mis hojas verdes y mis ramas crecen según la luz, el agua y la temperatura. En otoño no pierdo mis hojas como los árboles caducifolios. En invierno conservo mi follaje, aunque crezco más lento con el frío. Mi especie suele tener árboles masculinos y femeninos: las piñas y piñones dependen del sexo, la madurez y las condiciones de cada ejemplar. Es una descripción orientativa para el hemisferio sur.",
    comoCuidarme:
      "Mi especie enfrenta amenazas en sus bosques naturales y, aunque vivo en la ciudad, también necesito protección para crecer bien. Si observas ramas quebradas, daños en mi tronco o cambios importantes en mi follaje, repórtalos para evaluación municipal.",
    consejos:
      "Evita compactar el suelo junto a mi tronco y no dejes basura, escombros ni sustancias químicas. No cortes mis ramas ni intentes cambiar mi forma: las podas las evalúa personal especializado. No recolectes mis conos ni semillas sin autorización; los conos grandes también pueden ser un riesgo al caer. No claves objetos ni amarres elementos que dañen mi corteza.",
  },
  "ginkgo biloba": {
    nombreComun: "Ginkgo",
    genero: "Ginkgo",
    familia: "Ginkgoaceae",
    origen: "China",
    curiosidades:
      "¡Soy un fósil viviente!: mi linaje existe desde hace más de 200 millones de años y algunos de mis parientes convivieron con los dinosaurios. Soy la única especie viva de mi género y de mi familia. Mi nombre biloba se refiere a los dos lóbulos de muchas de mis hojas. Mi especie tiene árboles masculinos y femeninos; los femeninos pueden producir semillas con una cubierta carnosa de olor fuerte al madurar. Algunos ginkgos superan los mil años de edad. En estado silvestre mi especie está En Peligro (UICN); esa categoría es de la especie, no describe la salud de este árbol.",
    beneficios:
      "En primavera y verano mi copa intercepta parte de la radiación solar y ayuda a refrescar los espacios cercanos. Mientras crezco, incorporo dióxido de carbono y guardo carbono en mi madera, ramas y raíces. Mis beneficios dependen de mi tamaño, follaje y condiciones; las cifras de este ejemplar se publicarán cuando SIVU valide sus cálculos.",
    aire: "Mis hojas pueden interceptar partículas del aire; el beneficio cuantificado requiere un método validado.",
    agua: "Mi copa intercepta parte de la lluvia y modera el agua que llega directo al suelo; el volumen requiere un cálculo validado.",
    follaje:
      "Caducifolio: pierdo mis hojas en otoño y vuelven a brotar en primavera. Antes de caer se vuelven de un amarillo dorado intenso y pueden formar una alfombra amarilla alrededor de mi tronco.",
    hojas:
      "Hojas en forma de abanico, con nervaduras que se dividen una y otra vez en dos. Aunque tengo hojas anchas, soy una gimnosperma: ¡un árbol verdaderamente singular!",
    miAno:
      "En primavera mis ramas se llenan de hojas verdes en forma de abanico y, en los ejemplares maduros, aparecen estructuras reproductivas. En verano mantengo mi follaje verde y doy sombra. En otoño mis hojas se vuelven doradas y caen, a veces en muy poco tiempo. En invierno quedo sin hojas, en reposo, preparándome para volver a brotar. Es un ciclo general para el hemisferio sur: puede variar según el ambiente.",
    comoCuidarme:
      "Resisto bien muchas condiciones de la ciudad, pero también necesito espacio, protección y cuidados adecuados. Si observas ramas quebradas, heridas en mi tronco o cambios preocupantes en mi copa, repórtalos para evaluación municipal.",
    consejos:
      "Evita compactar el suelo a mi alrededor y no dejes basura, escombros ni sustancias químicas cerca de mi tronco. No claves objetos ni amarres cables: mi corteza protege mis tejidos. No cortes mis ramas por tu cuenta; las podas las hace personal autorizado. No comas mis semillas ni manipules su cubierta carnosa sin protección: pueden causar irritación o intoxicación.",
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
