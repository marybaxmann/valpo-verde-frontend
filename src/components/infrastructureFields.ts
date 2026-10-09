import type { InfraVariables } from "../api/moduleRecords";

/**
 * Presentación de los campos de infraestructura (claves = DICCIONARIO_CAMPOS,
 * REGISTRO_EVALUACION). Los dominios de cada lista llegan del backend
 * (`/api/catalogs/modules` → infrastructure[domain]); aquí solo se define
 * cómo se preguntan y cuándo se muestran, siguiendo el orden de los
 * flujos de docs/methodology/05-infrastructure.md. No se calcula
 * severidad ni nivel global (M04 fuera de este corte).
 */
export interface InfraField {
  key: string;
  label: string;
  /** yesno = Sí/No · check = marcado de tipo de daño (Sí/No) · select = dominio del catálogo */
  kind: "yesno" | "check" | "select";
  domain?: string;
  showIf?: (v: InfraVariables) => boolean;
}

export interface InfraComponent {
  title: string;
  gate: InfraField;
  fields: InfraField[];
}

const yes = (k: string) => (v: InfraVariables) => v[k] === "Sí";

export const INFRA_COMPONENTS: InfraComponent[] = [
  {
    title: "Acera / vereda",
    gate: { key: "existe_vereda", label: "¿Existe acera como infraestructura inmediata?", kind: "yesno" },
    fields: [
      { key: "materialidad_vereda", label: "Materialidad", kind: "select", domain: "materialidad_vereda" },
      { key: "presenta_levantamiento_vereda", label: "Levantamiento", kind: "check" },
      { key: "presenta_desplazamiento_horizontal_vereda", label: "Desplazamiento horizontal", kind: "check" },
      { key: "presenta_grieta_vereda", label: "Grieta", kind: "check" },
      { key: "presenta_rotura_vereda", label: "Rotura", kind: "check" },
      { key: "presenta_hundimiento_vereda", label: "Hundimiento", kind: "check" },
      { key: "reduce_circulacion_peatonal", label: "¿El daño afecta la circulación peatonal?", kind: "yesno" },
      {
        key: "impide_paso_seguro",
        label: "¿Impide el paso seguro o la continuidad de la vereda?",
        kind: "yesno",
        showIf: yes("reduce_circulacion_peatonal"),
      },
    ],
  },
  {
    title: "Calzada",
    gate: { key: "existe_calzada", label: "¿Existe calzada como infraestructura inmediata?", kind: "yesno" },
    fields: [
      { key: "materialidad_calzada", label: "Materialidad", kind: "select", domain: "materialidad_calzada" },
      { key: "dano_interferencia_calzada", label: "¿Existe daño o interferencia?", kind: "yesno" },
      { key: "levantamiento_calzada", label: "Levantamiento", kind: "check", showIf: yes("dano_interferencia_calzada") },
      { key: "grieta_fisuracion_calzada", label: "Grieta / fisuración", kind: "check", showIf: yes("dano_interferencia_calzada") },
      { key: "hundimiento_calzada", label: "Hundimiento", kind: "check", showIf: yes("dano_interferencia_calzada") },
      { key: "rotura_calzada", label: "Rotura", kind: "check", showIf: yes("dano_interferencia_calzada") },
      {
        key: "afecta_circulacion_vehicular",
        label: "¿Afecta la circulación vehicular?",
        kind: "yesno",
        showIf: yes("dano_interferencia_calzada"),
      },
    ],
  },
  {
    title: "Alcorque / superficie de plantación",
    gate: { key: "existe_alcorque", label: "¿Existe alcorque o superficie de plantación / permeable disponible?", kind: "yesno" },
    fields: [{ key: "forma_alcorque", label: "Forma del alcorque", kind: "select", domain: "forma_alcorque" }],
  },
  {
    title: "Infraestructura vertical",
    gate: {
      key: "contacto_interferencia_infraestructura_vertical",
      label: "¿Existe contacto o interferencia con infraestructura vertical?",
      kind: "yesno",
    },
    fields: [
      { key: "tipo_infraestructura_vertical", label: "Tipo de infraestructura", kind: "select", domain: "tipo_infraestructura_vertical" },
      {
        key: "dano_fisico_observable_infraestructura_vertical",
        label: "¿Existe daño físico observable en la infraestructura?",
        kind: "yesno",
      },
      {
        key: "compromete_estabilidad_funcionalidad",
        label: "¿El daño compromete estabilidad, funcionalidad o requiere reparación estructural?",
        kind: "yesno",
        showIf: yes("dano_fisico_observable_infraestructura_vertical"),
      },
    ],
  },
  {
    title: "Redes / servicios",
    gate: { key: "interferencia_redes_servicios", label: "¿Existe interferencia con redes o servicios?", kind: "yesno" },
    fields: [
      { key: "red_aerea_presente", label: "Red aérea presente", kind: "yesno" },
      { key: "tipo_red_aerea", label: "Tipo de red aérea", kind: "select", domain: "tipo_red_aerea", showIf: yes("red_aerea_presente") },
      { key: "red_subterranea_presente", label: "Red subterránea presente", kind: "select", domain: "si_no_nd" },
      {
        key: "tipo_red_subterranea",
        label: "Tipo de red subterránea",
        kind: "select",
        domain: "tipo_red_subterranea",
        showIf: yes("red_subterranea_presente"),
      },
      {
        key: "afectacion_fisica_red_subterranea",
        label: "¿Existe afectación física de la red subterránea?",
        kind: "yesno",
        showIf: yes("red_subterranea_presente"),
      },
      {
        key: "compromete_funcionalidad_red_subterranea",
        label: "¿Compromete la funcionalidad de la red?",
        kind: "yesno",
        showIf: yes("afectacion_fisica_red_subterranea"),
      },
    ],
  },
];

export function isVisible(field: InfraField, gateValue: string | null, v: InfraVariables): boolean {
  return gateValue === "Sí" && (!field.showIf || field.showIf(v));
}

/** Valores iniciales: compuertas en "No", resto sin registrar (null). */
export function emptyInfraVariables(): InfraVariables {
  const v: InfraVariables = {};
  for (const c of INFRA_COMPONENTS) {
    v[c.gate.key] = "No";
    for (const f of c.fields) v[f.key] = null;
  }
  return v;
}

/** Deja en null todo campo que no se muestra (rama no aplicable). */
export function cleanInfraVariables(v: InfraVariables): InfraVariables {
  const out: InfraVariables = {};
  for (const c of INFRA_COMPONENTS) {
    out[c.gate.key] = v[c.gate.key] ?? "No";
    for (const f of c.fields) {
      // Se evalúa sobre lo ya limpiado: un campo que depende de otro oculto también queda en null.
      out[f.key] = isVisible(f, out[c.gate.key], { ...v, ...out }) ?(f.kind === "check" ? (v[f.key] === "Sí" ? "Sí" : "No") : v[f.key] ?? null) : null;
    }
  }
  return out;
}
