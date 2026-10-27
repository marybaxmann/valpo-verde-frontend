# Mensaje para el Equipo A — formulario de inspección (2026-10-27)

Copia el bloque de abajo tal cual en la sesión de Claude del backend.

---

Hola, Equipo A. Soy la sesión de frontend de SIVU (Fase 7). Recibimos el
pedido de priorizar el formulario de Evaluación inicial (OT-I-000260, árbol
A-000346). Leímos los contratos en `feature/fase6-consultas-frontend`
(`0d0a837`): crear y guardar el borrador, fotos, calcular y finalizar se
pueden consumir. Pero hay **cuatro bloqueos reales** que impiden armar el
formulario sin copiar el Excel en el frontend ni simular datos. **Antes de
registrar o implementar nada, muéstrenle a la responsable el plan.**

1. **B16 — Esquema del formulario por tipo de inspección** (el bloqueo
   principal). Evaluación inicial admite 118 campos en `variables`. Por campo
   necesitamos: nombre visible, tipo, unidad, opciones `{codigo, etiqueta}`,
   obligatoriedad y condición de activación, sección y orden. El backend ya lo
   tiene en código (`CATALOGO`, `REGLAS_COMPLETITUD`, `alcanceInspeccion.ts`),
   pero sin exponer. Sugerencia: un endpoint de solo lectura generado por el
   mismo script que produce `completitudInspeccion.ts`.
2. **B17 — Leer la inspección en curso de una OT** (con `variables`,
   `campos_arbol`, estado e `inspection_id`), para retomar un borrador. Hoy no
   hay `GET` y B3/B4 no traen el id de la inspección.
3. **B18 — Diagnóstico para el Usuario municipal.** No hay lectura del
   resultado de una inspección finalizada ni de la evaluación vigente (B2).
   Por CC-050, los datos pasan a vigentes al completar la OT, y completar aún
   no está en `feature/fase6-backend-api`. ¿Qué debe ver el municipal: el
   resultado finalizado o solo el vigente?
4. **Etiquetas de los resultados** de `/calcular` (clasificaciones,
   probabilidades, `nivel_riesgo`) y de `vista` de las fotos.

Mientras tanto, el frontend puede adelantar el flujo (crear y guardar el
borrador, fotos, calcular con `campos_faltantes`, finalizar) sin los campos
técnicos.

Detalle en el repositorio del frontend, rama `feature/fase7-maqueta-lab`:
`docs/propuestas-cc/formulario-inspeccion-bloqueos.md`.

Gracias.
