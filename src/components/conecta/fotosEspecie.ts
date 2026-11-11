import lagerstroemiaIndica from "../../assets/especies/lagerstroemia-indica.webp";
import acerNegundo from "../../assets/especies/acer-negundo.webp";
import acerPseudoplatanus from "../../assets/especies/acer-pseudoplatanus.webp";
// Fotografía entregada por la responsable (2026-11-11), tomada en Plaza
// Victoria; se usa igual que las demás, como foto de la especie.
import araucariaAngustifolia from "../../assets/especies/araucaria-angustifolia.webp";

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
};

export function fotoDeEspecie(especieCientifica: string | null): string | null {
  if (!especieCientifica) return null;
  return FOTOS[especieCientifica.trim().replace(/\s+/g, " ").toLowerCase()] ?? null;
}
