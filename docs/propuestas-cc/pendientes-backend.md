# Pendientes para el equipo del backend (Fase 6)

Lista de lo que el frontend de la Fase 7 necesita y no existe en
`origin/feature/fase6-backend-api` (`6356560`, leído el 2026-10-26). No se
inventa ningún contrato: cada punto describe la necesidad, no el formato.

| # | Necesidad | Para qué pantalla | Hoy |
|---|---|---|---|
| B1 | Listar los árboles del proyecto con sus datos vigentes (código, especie, ciclo de vida, ubicación, DAP, altura, clasificación de riesgo vigente, fecha de vigencia) en una llamada | Inventario (tabla), mapas, paleta de búsqueda | Solo la demo `GET /api/projects/:id/trees` (sin DAP, altura ni riesgo). F6 solo tiene el alta. |
| B2 | Ficha de un árbol: medición vigente e historial, evaluación vigente con componentes, infraestructura, OT e incidencias del árbol | Ficha del árbol | Solo demo (`/api/trees/:id/...`). |
| B3 | Listar las OT del proyecto (con estado CC-050, tipo, responsable, `fecha_accion_programada`, árbol) | Mantención (calendario y lista), Dashboard | F6 crea y transiciona, pero no lista. |
| B4 | Listar las OT asignadas al usuario (Inspector / Encargado) | Interfaz del Inspector y del Encargado (D4) | No existe. |
| B5 | Lista de próximas inspecciones y monitoreos por proyecto (CC-037) | Dashboard, Mantención | Vistas `v_upcoming_inspections` / `v_tree_fechas_vigentes` en la base, sin endpoint. |
| B6 | ¿Una OT «vencida» la determina el backend? Hoy el frontend la calcula (fecha programada pasada y estado no final). No es un estado de CC-050. | Mantención, Dashboard | Sin definición. |
| B7 | Resumen del proyecto (conteos por ciclo de vida, por clase de riesgo, OT por estado, incidencias por estado, infraestructura por componente) | Dashboard | El frontend cuenta en el cliente sobre la demo. |
| B8 | Lectura de evaluaciones de infraestructura y su catálogo de componentes vigente | Infraestructura | Solo demo. |
| B9 | Incidencias en el modelo nuevo (#62) | Incidencias, Dashboard | Solo demo. |
| B10 | Índices en el modelo nuevo | Índices | Solo demo. |
| B11 | Listar usuarios disponibles para agregar como miembros | Miembros | No existe (se pide `user_id` a mano). |
| B12 | Documentar `/api/sivu/...` en el README § «Contrato para frontend» | Todas | El README solo documenta la demo. |
