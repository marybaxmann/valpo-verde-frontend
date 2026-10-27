# Mensaje para el equipo del backend — lecturas para el Dashboard e Inventario (2026-10-26)

Copia el bloque de abajo tal cual en la sesión de Claude del backend.

---

Hola. Soy la sesión de frontend de SIVU (Fase 7). La responsable pidió
(2026-10-26) que el backend **planifique tres lecturas** que hoy no están
en `docs/roadmap.md` y sin las cuales el Dashboard y el Inventario del
frontend nuevo no tienen ningún dato. **Antes de registrar o implementar
nada, muéstrale a ella el plan y espera su aprobación**, como siempre.

**Decisión de la responsable:** el frontend **no cuenta ni clasifica**: no
deriva indicadores de un listado (por ejemplo, contar OT por estado a
partir de B3). Todo lo que se muestre como indicador viene del backend.

Lo que necesita el frontend (necesidad, no formato; el contrato lo definen
ustedes):

1. **B7 — resumen del proyecto** (Dashboard): total de árboles y por
   estado de ciclo de vida; georreferenciados y sin georreferenciar;
   evaluados y sin evaluación; conteo por clasificación de riesgo vigente
   (incluidas «Sin clasificación» / «No determinado», con sus etiquetas);
   especies distintas y las más registradas; OT por estado (CC-050) e
   incidencias por estado, con sus etiquetas.
2. **B1 — listado de árboles con datos vigentes** (Inventario, mapas,
   buscador): código, especie, ciclo de vida, ubicación, DAP, altura,
   clasificación de riesgo vigente con su etiqueta y fecha de vigencia.
3. **B5 — recordatorios de próxima inspección y monitoreo** por proyecto
   (CC-037; las vistas `v_upcoming_inspections` / `v_tree_fechas_vigentes`
   ya existen): inicio y término del rango, árbol y tipo.
4. **B13 — geometría del sector** en lectura (agregado el 2026-10-26, al
   rediseñar Riesgo Arbóreo): hoy `GET /api/sivu/projects/:id` entrega solo
   `nombre_sector` y `superficie_sector_m2`. Con la geometría (WGS84) los
   mapas se centran en el sector y muestran su contorno.

Pregunta abierta: ¿en qué orden respecto de B3 y B4 (CC-061)?

Detalle en el repositorio del frontend, rama `feature/fase7-maqueta-lab`:
`docs/propuestas-cc/pendientes-backend.md` (sección «Prioridad pedida por
la responsable»).

Además, para que lo anotes en el HANDOFF: en la base de pruebas existe el
proyecto **«QA Fase 7 — proyecto de prueba del frontend»** (creado con
`fn_create_project_with_sector`) y los usuarios `*.f7@sivu-frontend.test`
(uno por rol). Son del frontend: por favor, que la limpieza de datos de
prueba no los borre.

Gracias.
