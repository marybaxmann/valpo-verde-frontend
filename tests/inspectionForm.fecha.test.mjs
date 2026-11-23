import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { armarBody } from "../src/lib/inspectionForm.ts";

const source = await readFile(new URL("../src/components/FechaInspeccion.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
}).outputText.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve("react/jsx-runtime")));
const { default: FechaInspeccion, fechaInspeccionValida } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

function inputDe(valor, bloqueada, cambiar = () => {}) {
  return FechaInspeccion({ valor, bloqueada, maximo: "2026-11-21", cambiar }).props.children[1].props;
}

test("la fecha anterior se serializa y la fecha persistida reaparece al abrir el borrador", () => {
  const body = armarBody([], [], {}, "evaluacion_inicial", null, "2026-10-25");
  assert.equal(body.fecha_inspeccion, "2026-10-25");
  assert.equal(inputDe(body.fecha_inspeccion, false).value, "2026-10-25");
});

test("rechaza fechas inválidas, futuras o posteriores al registro", () => {
  assert.equal(inputDe("2026-11-22", false)["aria-invalid"], true);
  assert.equal(fechaInspeccionValida("2026-10-26", "2026-10-25"), false);
  assert.equal(fechaInspeccionValida("2026-02-29", "2026-11-21"), false);
});

test("un cambio en preguardado se envía en el siguiente guardado", () => {
  let fecha = "2026-10-25";
  inputDe(fecha, false, (valor) => { fecha = valor; }).onChange({ currentTarget: { value: "2026-10-26" } });
  assert.equal(armarBody([], [], {}, "evaluacion_inicial", null, fecha).fecha_inspeccion, "2026-10-26");
});

test("la fecha finalizada queda de solo lectura", () => {
  const campo = inputDe("2026-10-25", true, () => assert.fail("La fecha está bloqueada"));
  assert.equal(campo.readOnly, true);
  campo.onChange({ currentTarget: { value: "2026-10-26" } });
  assert.equal(campo.value, "2026-10-25");
});
