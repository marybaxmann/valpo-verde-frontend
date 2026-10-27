# Pendientes para el equipo del backend (Fase 6)

Lista de lo que el frontend de la Fase 7 necesita y no existe en
`origin/feature/fase6-backend-api` (`6356560`, leído el 2026-10-26). No se
inventa ningún contrato: cada punto describe la necesidad, no el formato.

| # | Necesidad | Para qué pantalla | Hoy |
|---|---|---|---|
| B1 | Listar los árboles del proyecto con sus datos vigentes (código, especie, ciclo de vida, ubicación, DAP, altura, clasificación de riesgo vigente, fecha de vigencia) en una llamada | Inventario (tabla), mapas, paleta de búsqueda | Solo la demo `GET /api/projects/:id/trees` (sin DAP, altura ni riesgo). F6 solo tiene el alta. |
| B2 | Ficha de un árbol: medición vigente e historial, evaluación vigente con componentes, infraestructura, OT e incidencias del árbol | Ficha del árbol | Solo demo (`/api/trees/:id/...`). |
| B3 | Listar las OT del proyecto (con estado CC-050, tipo, responsable, `fecha_accion_programada`, árbol) | Mantención (calendario y lista), Dashboard | **Hecho** (CC-065, `GET /api/sivu/projects/:id/work-orders`); consumido por Mantención desde el 2026-10-27. |
| B4 | Listar las OT asignadas al usuario (Inspector / Encargado) | Interfaz del Inspector y del Encargado (D4) | **Hecho** (CC-065, `GET /api/sivu/work-orders/mine`); se usará en el módulo Inspección y en la interfaz de esos roles. |
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
| B1 | Inventario, mapas, buscador, Dashboard | Listado de árboles del proyecto con sus datos vigentes. **Columnas decididas por la responsable el 2026-10-27** (ciclo de vida, riesgo efectivo, DAP equivalente del backend, «datos vigentes desde»): ver `B1-listado-arboles.md`. |
| B5 | Dashboard (Agenda), Mantención | Recordatorios de próxima inspección y monitoreo por proyecto (CC-037: inicio y término del rango, árbol, tipo). Las vistas `v_upcoming_inspections` / `v_tree_fechas_vigentes` ya existen en la base. |
| B13 | Riesgo Arbóreo, Infraestructura, Inventario, alta de árbol | **Geometría del sector del proyecto** en lectura (WGS84, como el GeoJSON de los árboles): `GET /api/sivu/projects/:id` hoy entrega solo `nombre_sector` y `superficie_sector_m2`. Sirve para centrar los mapas en el sector y dibujar su contorno (pedido de la responsable, 2026-10-26). |
| B14 | Módulo Inspección: crear OT de Inspección | **Inspectores del proyecto** que el Usuario municipal puede asignar como responsables (`id`, `nombre`): hoy `GET /api/sivu/projects/:id/members` es solo del Administrador. La función de la 024 (`fn_miembros_proyecto`, CC-065) ya devuelve `id`, `nombre` y `rol` de los miembros a un miembro activo; falta exponerla. |
| B15 | Módulo Inspección: crear OT de Inspección | **Catálogos de acción y subtipo de las OT de Inspección** con `codigo` y `etiqueta` (D-196/D-197; los códigos ya los valida `crearOrdenTrabajoInspeccionSchema`). Hoy no hay endpoint de catálogos en `/api/sivu` y el frontend no los escribe (PR-021). Lo mismo servirá para prioridad (`clasificacion_prioridad`). |

## Formulario de inspección e indicadores (2026-10-27)

Pedido de la responsable: el formulario de Evaluación inicial del Inspector
(PR-010 v4.0) y el diagnóstico desde la interfaz del Usuario municipal.
Detalle en `formulario-inspeccion-bloqueos.md` y `mensaje-backend-b16.md`.

| # | Para qué pantalla | Qué necesita el frontend | Estado |
|---|---|---|---|
| B16 | Formulario de inspección (Inspector) | Esquema del formulario por tipo de inspección: campos, tipo de entrada, unidad, opciones `{codigo, etiqueta}`, obligatoriedad y condición de activación. | **Entregado** en `feature/b16-inspection-form-schema` (`54fd44d`, `GET /api/sivu/projects/:id/inspection-form-schema?tipo=evaluacion_inicial`); consumido desde `d984e28`. Pendiente: (a) la rama no incluye B1 (`0d0a837`), así que con ella el Inventario no carga; (b) nombres visibles de los campos (`etiqueta_pendiente: true`) y secciones (`seccion: null`); (c) los `campos_arbol` (sector, ubicación, UTM, especie): ¿los vuelve a ingresar el Inspector o se toman del árbol? ¿especie usa el endpoint de especies?; (d) etiquetas de las vistas de foto (`arbol_completo`, `base`, `tronco`, `copa`). |
| B17 | Formulario de inspección (Inspector) | Leer la inspección en curso de una OT (`inspection_id`, `variables`, `campos_arbol`, estado) para retomar el borrador. Hoy el frontend lo recuerda solo en el navegador donde se escribió. | Sin endpoint. |
| B18 | Diagnóstico para el Usuario municipal | Lectura del resultado de una inspección finalizada y de la evaluación vigente del árbol, con etiquetas de los resultados (`nivel_riesgo`, clasificaciones, prioridad). Definir qué ve el municipal antes de completar la OT (CC-050). Completar la OT tampoco está disponible. | Sin endpoint. `/calcular` responde solo al Inspector y con códigos. |
| B19 | Indicadores biométricos | Cálculo e indicadores por proyecto y por sector, una vez que la autora cierre CC-016 (qué indicadores se adoptan; contradicción con CC-039). | Propuesto; depende de CC-016. Sustituye a B10 para este módulo. |

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
- **2026-10-27 — B1 (`feature/fase6-consultas-frontend`), probado con el árbol A-000346:**
  (a) la `busqueda` distingue tildes: «plátano» encuentra el árbol, «platano»
  no (sugerencia: comparar sin tildes, por ejemplo con `unaccent`);
  (b) `estado_ciclo_vida` llega solo como código (`activo`): el frontend lo
  muestra tal cual hasta que llegue su etiqueta (punto 5 de la responsable).
- **2026-10-27 — B16 con datos reales (AV_000007 = A-000346, OT-I-000260).**
  Los 71 valores del registro de terreno calzaron con los campos y las
  opciones del esquema sin conflictos. `/calcular` no pidió `sector` (dato
  para el punto (c) de B16). Faltaban `diametro_copa_eo_m` (vacío en la
  planilla; la autora lo entregó: 4,3 m) y las cuatro fotos. Con ambos,
  `/calcular` devolvió `puede_finalizar: true` y `/finalizar` aceptó la
  inspección (riesgo `alto`, prioridad `media`, próxima inspección
  2026-11-27, próximo monitoreo 2026-11-10). La OT sigue «En ejecución»:
  completar no está disponible (B18).
