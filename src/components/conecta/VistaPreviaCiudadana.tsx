import { useEffect, useState } from "react";
import { buscarEspeciesCatalogo } from "../../api/species";
import type { ArbolInventario } from "../../types/inventory";
import type { FichaPublica } from "../../types/fichaPublica";
import { ExperienciaArbol } from "./ExperienciaArbol";

/**
 * Vista previa, dentro de la plataforma, de lo que verá quien escanee el QR
 * de un árbol (Valpo Verde Conecta). Mientras no exista el endpoint público
 * (#62), arma la ficha con los datos con sesión, limitados a los campos que
 * CC-062 autoriza: especie, nombre común, ubicación descriptiva y el
 * catálogo de la especie. El origen, el follaje y el tipo de hoja llegan
 * como códigos sin etiqueta (B20): no se muestran hasta tener la etiqueta.
 */
export function VistaPreviaCiudadana({ projectId, arbol }: { projectId: string; arbol: ArbolInventario }) {
  const [especie, setEspecie] = useState<{ id: string; genero: string | null; familia: string | null } | null>(null);

  useEffect(() => {
    let cancelado = false;
    if (!arbol.especie_cientifica) return;
    buscarEspeciesCatalogo(projectId, arbol.especie_cientifica)
      .then((lista) => {
        if (cancelado) return;
        const e = lista.find((x) => x.especie_cientifica.toLowerCase() === arbol.especie_cientifica!.toLowerCase());
        setEspecie({ id: arbol.id, genero: e?.genero ?? null, familia: e?.familia ?? null });
      })
      .catch(() => !cancelado && setEspecie({ id: arbol.id, genero: null, familia: null }));
    return () => {
      cancelado = true;
    };
  }, [projectId, arbol.id, arbol.especie_cientifica]);

  const esp = especie?.id === arbol.id ? especie : null;
  const ficha: FichaPublica = {
    especie_cientifica: arbol.especie_cientifica,
    nombre_comun: arbol.nombre_comun,
    ubicacion_descriptiva: arbol.ubicacion_descriptiva,
    especie: {
      especie_cientifica: arbol.especie_cientifica,
      genero: esp?.genero ?? null,
      familia: esp?.familia ?? null,
      origen_biogeografico: null,
      persistencia_follaje: null,
      tipo_hoja: null,
    },
  };

  return (
    <div className="vvc-preview" aria-label="Vista previa en un teléfono">
      <div className="vvc-preview__screen">
        <ExperienciaArbol key={arbol.id} ficha={ficha} qrToken={null} vistaPrevia />
      </div>
    </div>
  );
}
