# Formulario de inspección (Evaluación inicial) — contratos leídos y bloqueos

Fecha: 2026-10-27. Documento de trabajo del frontend para el Equipo A
(backend). Leído de `origin/feature/fase6-consultas-frontend` (`0d0a837`).
Pedido: completar al menos una inspección técnica real (OT-I-000260, árbol
A-000346, `inspector.f7`) y mostrar su diagnóstico al Usuario municipal,
respetando el diccionario vigente y PR-010 v4.0, sin datos simulados.

## Lo que ya existe y el frontend puede consumir

| Paso | Endpoint | Notas |
|---|---|---|
| Crear el borrador | `POST /api/sivu/work-orders/:id/inspections` | Body: `tipo_inspeccion_realizada`, `subtipo_inspeccion`, `variables` (objeto `campo → valor`), `campos_arbol`, `resultado_general`, `requiere_mantenimiento`, `observaciones`. Solo el Inspector responsable, OT En ejecución. |
| Guardar el borrador | `PATCH /api/sivu/inspections/:id` | Mismo body, sin `tree_id`. |
| Fotos (PR-010 v4.0: 4 vistas nuevas en Evaluación inicial) | `POST /api/sivu/inspections/:id/photos` (multipart `foto` + `vista`), `GET .../photos` | |
| Calcular | `POST /api/sivu/inspections/:id/calcular` | Devuelve el resultado, `nivel_riesgo`, fechas sugeridas, `campos_faltantes`, `valores_no_permitidos`, `puede_finalizar` y `huella`. |
| Finalizar | `POST /api/sivu/inspections/:id/finalizar` | Con la `huella` del cálculo y los ajustes. |

En el código del backend también existen, **sin exponer por la API**: el
catálogo con etiquetas (`CATALOGO`, `services/rules/engine/catalogs.ts`), las
reglas de obligatoriedad y activación de cada campo generadas del Excel
(`REGLAS_COMPLETITUD`, `schemas/sivu/completitudInspeccion.ts`) y el alcance
de campos por tipo (`alcanceInspeccion.ts`).

## Bloqueos (impiden continuar sin violar las reglas)

1. **B16 — Esquema del formulario por tipo de inspección.** Para
   Evaluación inicial el borrador admite **118 campos** en `variables`, más
   `campos_arbol`. El frontend necesita, por campo: nombre visible, tipo
   (número, texto, sí/no, selección, selección múltiple, fecha), unidad,
   opciones `{codigo, etiqueta}`, obligatoriedad y condición de activación
   (las de `REGLAS_COMPLETITUD`), sección y orden. Sin esto, el frontend
   tendría que **copiar el Excel y los catálogos en su código**, lo que las
   reglas prohíben (no se escriben catálogos compartidos; los datos vienen de
   la API autorizada). Sugerencia: un endpoint de solo lectura generado por el
   mismo script que hoy produce `completitudInspeccion.ts`, para que no se
   desincronice del Excel.
2. **B17 — Leer el borrador de una OT.** No hay `GET` de la inspección: si
   el Inspector cierra la pantalla, el frontend no puede recuperar el borrador
   guardado ni su `inspection_id` (B3/B4 no lo incluyen). Se necesita leer la
   inspección en curso de una OT (con sus `variables`, `campos_arbol` y
   estado) para retomarla.
3. **B18 — Diagnóstico para el Usuario municipal.** No hay lectura del
   resultado de una inspección finalizada ni de la evaluación vigente del
   árbol (B2). `/calcular` responde solo al Inspector. Además, según
   CC-050, los datos pasan a vigentes **al completar la OT**, y completar
   todavía no está disponible en `feature/fase6-backend-api` (hay una rama
   `wip/completar-ot`). Hay que definir qué ve el municipal: el resultado de
   la inspección finalizada (antes de completar) o solo el vigente (después).
4. **Etiquetas de los resultados.** El resultado de `/calcular` usa
   códigos (clasificaciones, probabilidades, `nivel_riesgo`). Para mostrar el
   diagnóstico hacen falta sus etiquetas desde la API (lo mismo que B15 y el
   punto 1). También las de `vista` de las fotos.

## Lo que el frontend puede adelantar sin esos endpoints

- El flujo de trabajo de la OT (abrir «Trabajar», crear el borrador,
  guardar, subir las fotos, calcular, mostrar `campos_faltantes`, finalizar)
  con la estructura visual de la ficha de la maqueta.
- **No** puede mostrar los campos técnicos ni las opciones sin B16, ni
  retomar un borrador sin B17, ni mostrar el diagnóstico al municipal sin
  B18 y las etiquetas.
