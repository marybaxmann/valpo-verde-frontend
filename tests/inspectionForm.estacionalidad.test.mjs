import assert from "node:assert/strict";
import test from "node:test";
import { armarBody, cumple, valoresConvertidos } from "../src/lib/inspectionForm.ts";

const casilla = "sin_follaje_estacional";
const porcentajes = ["defoliacion_estimada_pct", "clorosis_pct", "necrosis_pct"];
const variables = [
  { identificador: casilla, tipo_entrada: "booleano", condicion_activacion: { op: "no_verdadero", campo: "copa_no_presenta" } },
  ...porcentajes.map((identificador) => ({
    identificador,
    tipo_entrada: "decimal",
    condicion_activacion: { op: "igual", campo: casilla, valor: false },
  })),
];
const arbol = [{ identificador: "copa_no_presenta", tipo_entrada: "booleano", condicion_activacion: null }];
const estimaciones = { defoliacion_estimada_pct: "20", clorosis_pct: "0", necrosis_pct: "5" };

for (const [nombre, valores, esperado] of [
  ["copa ausente con valores retenidos", { ...estimaciones, [casilla]: false, copa_no_presenta: true }, {}],
  ["receso estacional confirmado", { ...estimaciones, [casilla]: true }, { [casilla]: true }],
  ["casilla desconocida", { ...estimaciones, [casilla]: null }, {}],
  ["copa presente sin receso", { ...estimaciones, [casilla]: false }, {
    [casilla]: false, defoliacion_estimada_pct: 20, clorosis_pct: 0, necrosis_pct: 5,
  }],
]) {
  test(nombre, () => {
    const body = armarBody(variables, arbol, valores, "evaluacion_inicial", null);
    assert.deepEqual(body.variables, esperado);
    if (valores.copa_no_presenta === true) {
      assert.equal(body.campos_arbol.copa_no_presenta, true);
      const convertidos = valoresConvertidos([...variables, ...arbol], valores);
      assert.ok(variables.every((campo) => !cumple(campo.condicion_activacion, convertidos)));
      assert.equal(valores[casilla], false);
    }
  });
}
