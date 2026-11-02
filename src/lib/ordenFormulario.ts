import type { CampoFormulario, SeccionFormulario } from "../types/inspection";

/**
 * Orden de presentación de la evaluación del Inspector (Valej, 2026-11-02:
 * «solo hazlo ordenado, no cambie metodología»). Sigue el recorrido en
 * terreno: identificación, medidas, zona objetivo, raíces, tronco, copa,
 * tutorado e infraestructura. Solo cambia dónde se muestra cada campo:
 * los campos, sus etiquetas, validaciones y condiciones siguen viniendo
 * del backend (B16) sin cambios.
 *
 * Un campo que no aparece aquí no se pierde: va al final de la sección que
 * corresponde a su sección del backend (`DESDE_BACKEND`), en su orden.
 */
interface Bloque {
  subtitulo?: string;
  campos: string[];
}

interface SeccionPresentacion {
  codigo: string;
  /** Si falta, se usa la etiqueta que entrega el backend para `codigo`. */
  etiqueta?: string;
  bloques: Bloque[];
}

const PRESENTACION: SeccionPresentacion[] = [
  {
    codigo: "identificacion",
    etiqueta: "Identificación",
    bloques: [{ campos: ["especie_cientifica", "nombre_comun", "sector", "ubicacion_descriptiva", "utm_este", "utm_norte"] }],
  },
  {
    codigo: "medidas",
    etiqueta: "Medidas del árbol",
    bloques: [
      { campos: ["multifustal", "numero_fustes", "dap_fustes_cm", "dap_cm", "altura_total_m"] },
      {
        subtitulo: "Copa",
        campos: [
          "diametro_copa_ns_m", "diametro_copa_eo_m", "copa_no_presenta",
          "altura_primera_rama_m", "altura_primera_rama_no_presenta",
          "altura_base_copa_viva_m", "altura_base_copa_viva_no_presenta",
        ],
      },
      { subtitulo: "Edad", campos: ["clase_edad", "rango_edad_estimada_anios"] },
    ],
  },
  { codigo: "zona_objetivo", etiqueta: "Zona objetivo", bloques: [{ campos: ["zona_objetivo", "tasa_ocupacion_objetivo"] }] },
  { codigo: "raices_cuello", bloques: [] },
  { codigo: "tronco", bloques: [] },
  {
    codigo: "copa_ramas",
    bloques: [
      {
        campos: [
          "ramas_secas", "ramas_secas_pct_copa", "diametro_max_ramas_secas_cm",
          "ramas_quebradas", "numero_ramas_quebradas", "diametro_max_ramas_quebradas_cm", "permanece_suspendida",
          "desequilibrio_copa", "copa_faltante_pct", "exposicion_luminica_copa_cle",
        ],
      },
      // CC-040 (a): monitoreo fitosanitario.
      { subtitulo: "Estado fitosanitario", campos: ["defoliacion_estimada_pct", "clorosis_pct", "necrosis_pct", "muerte_regresiva_copa_pct"] },
      { campos: ["observaciones_copa"] },
    ],
  },
  { codigo: "tutorado", bloques: [] },
  {
    codigo: "infraestructura",
    bloques: [
      { campos: ["infraestructura_inmediata"] },
      {
        subtitulo: "Vereda",
        campos: [
          "existe_vereda", "materialidad_vereda", "dano_interferencia_vereda",
          "presenta_levantamiento_vereda", "presenta_desplazamiento_horizontal_vereda", "presenta_grieta_vereda",
          "presenta_rotura_vereda", "presenta_hundimiento_vereda", "desnivel_max_vereda_cm", "numero_grietas_vereda",
          "ancho_max_grieta_vereda_cm", "longitud_max_grieta_vereda_cm", "superficie_afectada_vereda_m2",
          "reduce_circulacion_peatonal", "ancho_libre_remanente_m", "impide_paso_seguro",
        ],
      },
      {
        subtitulo: "Calzada",
        campos: [
          "existe_calzada", "materialidad_calzada", "dano_interferencia_calzada", "levantamiento_calzada",
          "grieta_fisuracion_calzada", "hundimiento_calzada", "rotura_calzada", "desnivel_max_calzada_cm",
          "superficie_afectada_calzada_m2", "afecta_circulacion_vehicular", "distancia_arbol_calzada_m",
        ],
      },
      {
        subtitulo: "Alcorque y suelo",
        campos: [
          "existe_superficie_permeable", "existe_alcorque", "forma_alcorque", "largo_alcorque_m", "ancho_alcorque_m",
          "diametro_alcorque_m", "superficie_alcorque_m2", "dano_interferencia_alcorque",
          "indicios_compactacion_superficial", "suelo_sellado_impermeabilizado", "obstaculos_crecimiento_radicular",
          "condicion_radicular_entorno",
        ],
      },
      {
        subtitulo: "Infraestructura vertical",
        campos: [
          "contacto_interferencia_infraestructura_vertical", "tipo_infraestructura_vertical",
          "otro_tipo_infraestructura_vertical", "dano_fisico_observable_infraestructura_vertical",
          "compromete_estabilidad_funcionalidad",
        ],
      },
      {
        subtitulo: "Redes de servicios",
        campos: [
          "interferencia_redes_servicios", "red_aerea_presente", "tipo_red_aerea", "distancia_copa_red_aerea_m",
          "dano_interferencia_red_aerea", "cumplimiento_distancia_seguridad_bt_mt", "red_subterranea_presente",
          "tipo_red_subterranea", "distancia_arbol_red_subterranea_m", "afectacion_fisica_red_subterranea",
          "compromete_funcionalidad_red_subterranea",
        ],
      },
      { campos: ["observaciones_infraestructura"] },
    ],
  },
  { codigo: "objetivo_consecuencias", bloques: [] },
];

/** Sección del backend → sección de presentación para los campos no listados. */
const DESDE_BACKEND: Record<string, string> = { arbol: "medidas" };

export interface BloqueVisible {
  subtitulo?: string;
  campos: CampoFormulario[];
}

export interface SeccionVisible {
  seccion: SeccionFormulario;
  bloques: BloqueVisible[];
}

export function ordenarParaPresentacion(campos: CampoFormulario[], secciones: SeccionFormulario[]): SeccionVisible[] {
  const porId = new Map(campos.map((c) => [c.identificador, c]));
  const usados = new Set<string>();
  const etiquetaBackend = new Map(secciones.map((s) => [s.codigo, s.etiqueta]));
  const salida: SeccionVisible[] = [];

  for (const p of PRESENTACION) {
    const bloques: BloqueVisible[] = [];
    for (const b of p.bloques) {
      const lista = b.campos.map((id) => porId.get(id)).filter((c): c is CampoFormulario => !!c && !usados.has(c.identificador));
      lista.forEach((c) => usados.add(c.identificador));
      if (lista.length) bloques.push({ subtitulo: b.subtitulo, campos: lista });
    }
    salida.push({ seccion: { codigo: p.codigo, etiqueta: p.etiqueta ?? etiquetaBackend.get(p.codigo) ?? p.codigo }, bloques });
  }

  // Campos no listados: al final de su sección, en el orden del backend.
  const otros: SeccionVisible = { seccion: { codigo: "__otros", etiqueta: "Otros datos" }, bloques: [] };
  for (const c of campos) {
    if (usados.has(c.identificador)) continue;
    const backend = c.seccion?.codigo;
    const destinoCodigo = backend ? (DESDE_BACKEND[backend] ?? backend) : null;
    let destino = destinoCodigo ? salida.find((s) => s.seccion.codigo === destinoCodigo) : undefined;
    if (!destino && backend && c.seccion) {
      destino = { seccion: c.seccion, bloques: [] };
      salida.push(destino);
    }
    const s = destino ?? otros;
    const ultimo = s.bloques[s.bloques.length - 1];
    if (ultimo && !ultimo.subtitulo) ultimo.campos.push(c);
    else s.bloques.push({ campos: [c] });
  }
  if (otros.bloques.length) salida.push(otros);
  return salida.filter((s) => s.bloques.length > 0);
}
