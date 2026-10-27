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

## Prioridad pedida por la responsable (2026-10-26, Paso 4)

El roadmap del backend (`docs/roadmap.md`, `dd6949b`) planifica B3 y B4
(CC-061), pero **no B1, B5 ni B7**. Sin ellos, el Dashboard y el Inventario
del frontend nuevo no tienen datos: hoy muestran sus paneles como
«pendiente». Decisión de la responsable: **el frontend no cuenta ni
clasifica** (no deriva indicadores a partir de listados); todo lo que se
muestre como indicador viene del backend.

| # | Para qué pantalla | Qué necesita el frontend (necesidad, no formato) |
|---|---|---|
| B7 | Dashboard (indicadores, distribución por riesgo, composición, operación) | Por proyecto: total de árboles y por estado de ciclo de vida; georreferenciados y sin georreferenciar; evaluados y sin evaluación; conteo por clasificación de riesgo vigente (incluidas «Sin clasificación» / «No determinado», con sus etiquetas de catálogo); especies distintas y las más registradas; OT por estado (CC-050) e incidencias por estado (con sus etiquetas). |
| B1 | Inventario, mapas, buscador, Dashboard | Listado de árboles del proyecto con sus datos vigentes (código, especie, ciclo de vida, ubicación, DAP, altura, clasificación de riesgo vigente con su etiqueta, fecha de vigencia). |
| B5 | Dashboard (Agenda), Mantención | Recordatorios de próxima inspección y monitoreo por proyecto (CC-037: inicio y término del rango, árbol, tipo). Las vistas `v_upcoming_inspections` / `v_tree_fechas_vigentes` ya existen en la base. |
| B13 | Riesgo Arbóreo, Infraestructura, Inventario, alta de árbol | **Geometría del sector del proyecto** en lectura (WGS84, como el GeoJSON de los árboles): `GET /api/sivu/projects/:id` hoy entrega solo `nombre_sector` y `superficie_sector_m2`. Sirve para centrar los mapas en el sector y dibujar su contorno (pedido de la responsable, 2026-10-26). |

## Observaciones de las pruebas del frontend

- **2026-10-26 — Código de árbol consumido en un alta rechazada.** Al probar
  `POST /api/sivu/projects/:id/trees` con un punto fuera del sector, el 422
  (CC-046) dice «El árbol A-000347 queda fuera de la delimitación del sector
  de su proyecto»: nombra un `tree_code` que nunca se creó (la secuencia se
  consume igual). Un usuario puede creer que ese árbol existe. Sugerencia: que
  el mensaje no incluya el código cuando el alta no se guardó. El alta válida
  anterior quedó como `A-000346`.
- **Catálogo de especies vacío en pruebas:** `GET /api/sivu/projects/:id/species?nombre=Acer`
  responde `{"data":[]}`. No es un error; solo hace que el buscador no pueda
  probarse con coincidencias hasta que el Inspector incorpore especies (CC-053).
