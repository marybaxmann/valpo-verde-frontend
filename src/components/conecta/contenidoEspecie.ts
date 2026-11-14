import negundoHoja from "../../assets/especies/reconocer/acer-negundo-hoja.webp";
import platanoHoja from "../../assets/especies/reconocer/acer-pseudoplatanus-hoja.webp";
import platanoFlores from "../../assets/especies/reconocer/acer-pseudoplatanus-flores.webp";
import cresponHoja from "../../assets/especies/reconocer/lagerstroemia-indica-hoja.webp";
import araucariaFoto from "../../assets/especies/araucaria-angustifolia.webp";

/**
 * Textos ciudadanos por especie de la ficha pública (formato V5).
 *
 * Diseño V5 y textos aprobados por la responsable el 2026-11-14
 * (`FICHAS_SEIS_ESPECIES.md` v5, P1 a P12 del cuestionario de la ficha
 * pública). Es contenido de divulgación, no metodológico ni de inventario:
 * vive en el frontend mientras no exista su lugar en el catálogo de especies
 * del backend (decisión P5, pendiente de implementar con su CC y el Excel).
 *
 * Cada bloque tiene una sola idea. Las fuentes de cada bloque están en el
 * campo `fuentes` y en `FICHAS_SEIS_ESPECIES.md`; no se muestran en pantalla.
 *
 * Fotos de «Reconóceme»: tomadas por la responsable en el levantamiento del
 * 2026-10-01 en Plaza Victoria (carpetas AV_000003, 006, 007 y 012), sin
 * datos de ubicación ni de cámara. `null` = foto pendiente («Foto próximamente»).
 */

export type IconoAporte = "sombra" | "frescor" | "pajaro" | "abeja" | "flor" | "siempreverde" | "hito" | "generaciones";

export type Estacion = "prim" | "ver" | "oto" | "inv";

export interface FichaEspecie {
  /** Nombre de visualización ciudadana (P11), con su artículo. */
  nombreComun: string;
  articulo: "el" | "la";
  curiosidad: string;
  aportes: [IconoAporte, string][];
  quienSoy: string;
  rasgos: { etiqueta: string; texto: string; foto: string | null }[];
  /** Estaciones; si la especie es siempreverde se usa `ciclo` en su lugar. */
  anio?: Record<Estacion, string>;
  ciclo?: { titulo: string; pasos: { etiqueta: string; texto: string }[] };
  historia: string;
  consejo: string;
  fuentes: string[];
}

const FICHAS: Record<string, FichaEspecie> = {
  "ulmus minor": {
    nombreComun: "Olmo común",
    articulo: "el",
    curiosidad: "Mis hojas son chuecas: un lado de su base nace más abajo que el otro.",
    aportes: [["sombra", "Sombra en verano"], ["pajaro", "Refugio para pájaros"]],
    quienSoy: "Vengo de Europa, el norte de África y el oeste de Asia.",
    rasgos: [{ etiqueta: "Semillas", texto: "Mis semillas tienen alas redondas, como discos planos.", foto: null }],
    anio: {
      prim: "Brotan mis hojas y vuelan mis semillas.",
      ver: "Copa verde y llena.",
      oto: "Me pongo amarillo.",
      inv: "Sin hojas; al final, flores diminutas y rojizas.",
    },
    historia: "En el siglo XX, la grafiosis mató a millones de olmos. ¡Cada olmo sano vale oro!",
    consejo: "No pises ni cubras la tierra junto a mi tronco: mis raíces necesitan aire.",
    fuentes: ["POWO (Kew), Ulmus minor", "European Atlas of Forest Tree Species", "RHS, Ulmus minor", "Woodland Trust, Field elm"],
  },
  "acer negundo": {
    nombreComun: "Arce negundo",
    articulo: "el",
    curiosidad: "Mis semillas tienen alas y caen girando como hélices, de dos en dos.",
    aportes: [["sombra", "Sombra en pocos años"], ["frescor", "Frescor en verano"]],
    quienSoy: "Vengo de Norteamérica y crezco muy rápido.",
    rasgos: [{ etiqueta: "Hoja", texto: "Cada hoja tiene de 3 a 5 folíolos unidos a un mismo tallo.", foto: negundoHoja }],
    anio: {
      prim: "Hojas nuevas y flores colgantes.",
      ver: "Maduran mis semillas.",
      oto: "Me pongo amarillo.",
      inv: "Descanso sin hojas.",
    },
    historia: "Me dicen «arce de hoja de fresno». Solo los árboles femeninos dan semillas.",
    consejo: "Mi madera es blanda: no te cuelgues de mis ramas.",
    fuentes: ["POWO (Kew) 781412-1", "NC State Extension, Acer negundo", "Oregon State University, Acer negundo", "UF/IFAS ST-20", "World Flora Online"],
  },
  "araucaria angustifolia": {
    nombreComun: "Araucaria brasileña",
    articulo: "la",
    curiosidad: "La gralha-azul, un pájaro azul de Brasil, se lleva mis piñones para comerlos en otra parte. ¡Los que se le caen pueden convertirse en nuevas araucarias!",
    aportes: [["siempreverde", "Verde todo el año"], ["hito", "Un hito en la plaza"]],
    quienSoy: "Vengo del sur de Brasil, donde mi especie está en peligro crítico.",
    rasgos: [
      { etiqueta: "Silueta", texto: "De adulta pierdo las ramas bajas y quedo como un paraguas.", foto: araucariaFoto },
      { etiqueta: "Hojas", texto: "Duras, alargadas y con punta que pincha. ¡Mejor no tocarlas!", foto: null },
    ],
    ciclo: {
      titulo: "Mi piña",
      pasos: [
        { etiqueta: "Año 1", texto: "El viento me poliniza." },
        { etiqueta: "Año 2", texto: "Madura mi piña." },
        { etiqueta: "Al final", texto: "Se desarma y suelta los piñones." },
      ],
    },
    historia: "Soy el símbolo del estado de Paraná: una de mis ramas está en su bandera.",
    consejo: "Mis piñas son pesadas: no te quedes bajo mi copa cuando están maduras.",
    fuentes: ["POWO (Kew), Araucaria angustifolia", "Embrapa Florestas (maduración y dispersión)", "Reinert y Bornschein 1998, Ornitología Neotropical", "UICN, Lista Roja", "Gobierno de Paraná, Agência Estadual de Notícias"],
  },
  "ginkgo biloba": {
    nombreComun: "Ginkgo",
    articulo: "el",
    curiosidad: "Un ginkgo del jardín Shukkeien, en Hiroshima, sobrevivió a la bomba atómica de 1945. ¡Sigue vivo hasta hoy!",
    aportes: [["sombra", "Sombra fresca en verano"], ["generaciones", "Un árbol para generaciones"]],
    quienSoy: "Vengo de China. Soy un fósil viviente: el último de mi familia.",
    rasgos: [{ etiqueta: "Hoja", texto: "Mi hoja es un abanico: sus nervios se dividen en dos una y otra vez.", foto: null }],
    anio: {
      prim: "Brotan mis abanicos verdes.",
      ver: "Hojas verdes y firmes.",
      oto: "Me vuelvo dorado.",
      inv: "Descanso sin hojas.",
    },
    historia: "Tengo hojas anchas, pero soy pariente de los pinos: una gimnosperma.",
    consejo: "Mis semillas huelen fuerte e irritan la piel: no las toques sin guantes.",
    fuentes: ["POWO (Kew), Ginkgo biloba", "Oregon State University, Ginkgo biloba", "RHS", "NC State Extension", "Agencia de Turismo de Japón (MLIT), Shukkeien Garden"],
  },
  "acer pseudoplatanus": {
    nombreComun: "Falso plátano",
    articulo: "el",
    curiosidad: "¡Mi nombre engaña! Aunque me llaman falso plátano, soy un arce. Mis semillas tienen alas y giran como pequeños helicópteros.",
    aportes: [["sombra", "Gran sombra"], ["abeja", "Flores para abejas"]],
    quienSoy: "Vengo de Europa y el oeste de Asia, y aguanto bien el viento y la brisa marina.",
    rasgos: [
      { etiqueta: "Hoja", texto: "Mi hoja parece una mano abierta, casi siempre con cinco lóbulos y borde dentado.", foto: platanoHoja },
      { etiqueta: "Flores", texto: "En primavera cuelgo racimos de flores amarillo verdoso.", foto: platanoFlores },
    ],
    anio: {
      prim: "Hojas nuevas y flores en racimo.",
      ver: "Maduran mis semillas.",
      oto: "Se caen mis hojas.",
      inv: "Descanso sin hojas.",
    },
    historia: "Con los años, mi corteza se desprende en placas y deja ver tonos más claros.",
    consejo: "Dale espacio a mis raíces: no excaves junto a mi tronco.",
    fuentes: ["POWO (Kew) 781462-1", "Oregon State University, Acer pseudoplatanus", "RHS 269", "Woodland Trust, Sycamore"],
  },
  "lagerstroemia indica": {
    nombreComun: "Crespón",
    articulo: "el",
    curiosidad: "Mis pétalos parecen papel crepé arrugado. ¡De ahí viene mi nombre!",
    aportes: [["flor", "Color en verano"], ["abeja", "Alimento para polinizadores"]],
    quienSoy: "Vengo de Asia y crezco con uno o varios troncos.",
    rasgos: [
      { etiqueta: "Hojas", texto: "Mis hojas son lisas y ovaladas, sin dientes en el borde.", foto: cresponHoja },
      { etiqueta: "Flores", texto: "Mis pétalos arrugados pueden ser blancos, rosados, rojos o violetas.", foto: null },
      { etiqueta: "Tronco", texto: "Mi corteza se pela en láminas y deja manchas de colores.", foto: null },
    ],
    anio: {
      prim: "Brotan mis hojas.",
      ver: "Me lleno de flores.",
      oto: "Hojas amarillas, naranjas o rojizas.",
      inv: "Sin hojas: se luce mi tronco.",
    },
    historia: "Mi nombre, Lagerstroemia, honra a Magnus von Lagerström, un comerciante sueco que le hacía llegar a Linneo plantas de Asia.",
    consejo: "Me gusta el sol. Florezco en ramas nuevas: una poda fuerte me debilita.",
    fuentes: ["POWO (Kew) 553576-1", "NC State Extension, Lagerstroemia indica", "RHS 100448", "Smithsonian Gardens", "Linnean Society (correspondencia de Lagerström con Linneo)"],
  },
};

export function contenidoDeEspecie(especieCientifica: string | null): FichaEspecie | null {
  if (!especieCientifica) return null;
  return FICHAS[especieCientifica.trim().replace(/\s+/g, " ").toLowerCase()] ?? null;
}

/** Estación actual en Valparaíso (hemisferio sur), para marcar «Ahora» en «Mi año». */
export function estacionActual(fecha = new Date()): Estacion {
  const v = (fecha.getMonth() + 1) * 100 + fecha.getDate();
  if (v >= 921 && v < 1221) return "prim";
  if (v >= 1221 || v < 321) return "ver";
  if (v < 621) return "oto";
  return "inv";
}
