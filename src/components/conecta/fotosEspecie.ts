// Crespón: imagen de terceros, origen no documentado; referencial TEMPORAL
// hasta tener una foto propia con el crespón florecido (verano).
import lagerstroemiaIndica from "../../assets/especies/lagerstroemia-indica.webp";
// Arce negundo y Falso plátano: fotos propias de Mari, levantamiento del
// 2026-10-01 en Plaza Victoria (AV_000009/IMG_9984, árbol A-000425, y
// AV_000007/IMG_9947, árbol A-000423). Reemplazan, desde el 2026-11-16, las
// imágenes de internet que se usaban antes. Sin datos de ubicación.
import acerNegundo from "../../assets/especies/acer-negundo.webp";
import acerPseudoplatanus from "../../assets/especies/acer-pseudoplatanus.webp";
// Fotografías propias de Mari (2026-11-11), tomadas en Plaza Victoria; se
// usan igual que las demás, como foto de la especie.
import araucariaAngustifolia from "../../assets/especies/araucaria-angustifolia.webp";
import ginkgoBiloba from "../../assets/especies/ginkgo-biloba.webp";
// Ulmus minor: foto genérica de la especie entregada por la responsable
// (2026-11-11) para todos los olmos de Plaza Victoria. Imagen de terceros
// (marca de agua «Serbal»), no de un ejemplar de Valparaíso.
// PENDIENTE (pedido de la responsable): una foto por cada individuo.
import ulmusMinor from "../../assets/especies/ulmus-minor.webp";

/**
 * Foto referencial por especie para la portada de la ficha pública
 * (pedido de la responsable, 2026-11-02). No es una foto del ejemplar: la
 * ficha la rotula «Foto referencial de la especie». Provisional hasta que
 * la foto por especie o por árbol exista en el backend (propuesta D6).
 */
const FOTOS: Record<string, string> = {
  "lagerstroemia indica": lagerstroemiaIndica,
  "acer negundo": acerNegundo,
  "acer pseudoplatanus": acerPseudoplatanus,
  "araucaria angustifolia": araucariaAngustifolia,
  "ginkgo biloba": ginkgoBiloba,
  "ulmus minor": ulmusMinor,
};

export function fotoDeEspecie(especieCientifica: string | null): string | null {
  if (!especieCientifica) return null;
  return FOTOS[especieCientifica.trim().replace(/\s+/g, " ").toLowerCase()] ?? null;
}
