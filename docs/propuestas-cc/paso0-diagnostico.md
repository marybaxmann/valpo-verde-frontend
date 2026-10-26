# Fase 7 · Paso 0 — Diagnóstico: maqueta Lab vs. frontend productivo

Fecha: 2026-10-26. Documento de trabajo (no es un CC).

Fuentes revisadas:

- Frontend `main` = `bf43e5e` (PR #9). Rama de trabajo: `feature/fase7-maqueta-lab`.
- Maqueta: `prototype/sivu-maqueta-lab` = `6817fb2`, `prototypes/sivu-maqueta-lab/`.
- Backend: `origin/feature/fase6-backend-api` = `6356560` (leído con `git show`;
  la copia local está 15 commits atrás y no se tocó).
- `docs/project-rules.md` (PR-003 v8.0, PR-004 v7.0, PR-016 v6.0, PR-019 v1.2,
  PR-020 v1.1), `docs/registro-cambios.md` (CC-022, CC-023, CC-025, CC-026,
  CC-037, CC-040, CC-050 y siguientes), `HANDOFF.md` bloques 2 a 7,
  `src/routes/` y `src/routes/sivu/`.

## 0. Bloqueos para probar en el navegador

1. **El `.env` del frontend y el del backend apuntan a la base real**
   (`ytcxswbulsmboucardxa`), no a la de pruebas (`gmlbmyreoxgoqrolhyxo`).
   Por eso solo se abrió la pantalla de login del frontend; no se inició
   sesión ni se levantó el backend. Para seguir hace falta un `.env` local
   apuntando a pruebas (frontend y backend) y usuarios de prueba de cada rol.
2. **Las pantallas productivas leen la API de la demo, no la de la Fase 6.**
   El frontend consume ~22 llamadas bajo `/api/projects/...`, `/api/trees/...`
   y `/api/species` (modelo de la demo). La Fase 6 vive en `/api/sivu/...` y
   todavía **no tiene ningún endpoint de lectura de árboles, OT, inspecciones,
   evaluaciones, incidencias, dashboard ni índices** (ver
   `pendientes-backend.md`). En la base de pruebas `trees` está vacía
   (HANDOFF, bloque 2), así que con la API de la demo las pantallas
   mostrarán vacío o error.
   **Confirmado el 2026-10-26** con el backend local apuntando a pruebas
   (`DOTENV_CONFIG_PATH=.env.pruebas`) y el usuario `admin.f7@sivu-frontend.test`:
   el ingreso y `GET /api/auth/me` funcionan, pero `GET /api/projects` (demo)
   falla con «column projects.name does not exist» (la migración 012
   renombró `name` → `nombre_proyecto` y `status` → `estado_proyecto`). Lo
   mismo pasa con la lista de un usuario no administrador
   (`findProjectsForMember`). La lista de proyectos tendrá que leerse desde
   `/api/sivu/projects` (Paso 2).
   Con los otros tres usuarios de prueba: `municipal.f7` entra a `/usuario`
   y su lista de proyectos da 500 por la misma causa; `inspector.f7` y
   `mantencion.f7` ven «Rol no reconocido» con su identificador
   (`inspector`, `encargado_mantencion`), sin llamar a `/api/projects`.
   `GET /api/auth/me` respondió 200 para los cuatro roles.
3. `docs/frontend-architecture.md` está desactualizado: la bitácora termina
   en SIG-1 y dice «8/8 endpoints», pero `main` ya tiene Dashboard, módulos,
   Mantención, Incidencias, Índices y ~22 llamadas (PR #9, demo). Se corrige
   al registrar el Paso 0 en la bitácora.

## 1. Matriz de brecha, pantalla por pantalla

Leyenda de la columna «Dato real»: **Demo** = endpoint de la demo vigente en
`/api/...`; **F6** = endpoint de la Fase 6 en `/api/sivu/...`; **—** = no
existe; queda «pendiente del backend».

### Login

| | |
|---|---|
| Productivo | `src/pages/Login.tsx` (tarjeta centrada, logo de hoja, sin foto). |
| Cambio visual | Foto a pantalla completa (`login-calle.jpg`), titular, marcas animadas de observación, tarjeta translúcida con logo nuevo, selector de tema. |
| Datos de la maqueta | Solo correo y contraseña. |
| Dato real | Supabase Auth (`signInWithPassword`) — ya existe. |
| Pendiente | Nada de datos. Excluidos: «¿Olvidaste tu contraseña?», flujo «Recuperar contraseña», acceso a Conecta, insignia «MAQUETA». Marcas animadas («Cavidad en el fuste», etc.): **se mantienen, con la leyenda** «Observaciones ilustrativas sobre una fotografía; no constituyen una evaluación» (decisión de la autora, 2026-10-26). |

### TopBar / navegación

| | |
|---|---|
| Productivo | `RoleLayout` + `Sidebar` (riel lateral, compacto en pantallas con mapa) + `Topbar` (título fijo). Lista plana: Dashboard, Inventario, Inspección y Riesgo, Infraestructura, Mantención, Incidencias, Índices. Proyecto actual y cambio de proyecto en el pie del riel. |
| Cambio visual | Sin riel lateral: barra superior flotante con logo SIVU, tres menús desplegables (Territorio / Operación / Análisis) + menú Proyecto, buscador (Ctrl K), selector de tema y menú de cuenta. |
| Datos de la maqueta | Nombre y rol del usuario, proyecto actual, módulos por grupo. |
| Dato real | `GET /api/auth/me` (nombre, rol); proyecto actual: Demo `GET /api/projects/:id` o F6 `GET /api/sivu/projects/:id`. |
| Pendiente | Agrupación (D3) y roles (D4). Excluidos: ítem «Valpo Verde Conecta», selector «Ver la maqueta como», insignia «MAQUETA». |

### Paleta de comandos (Ctrl K)

| | |
|---|---|
| Productivo | No existe. |
| Cambio visual | Modal de búsqueda: módulos, árboles (código, especie, calle) y acciones según rol. |
| Datos de la maqueta | Árboles ficticios (A-000124, A-000206…). |
| Dato real | Módulos: rutas propias. Árboles: Demo `GET /api/projects/:id/trees` (código, especie, dirección; filtrado en el cliente). F6: —. |
| Pendiente | Las acciones deben salir de los permisos vigentes, no de `nav.ts` de la maqueta (ver §3, contradicción C3). Búsqueda por calle solo con los campos que trae la API (`direccion`, `lugar_referencia`). |

### Dashboard

| | |
|---|---|
| Productivo | `ProjectDashboard.tsx`: 10 tarjetas, visor SIG, composición, distribución por riesgo, accesos a módulos. |
| Cambio visual | Sin mapa. Fila de 6 indicadores, dona de riesgo, composición + especies más registradas, OT e incidencias por estado, próximas intervenciones, infraestructura con daño por componente, grilla de módulos. |
| Datos de la maqueta | Conteos de árboles/georreferenciados/evaluados/especies/OT abiertas/incidencias abiertas; % por clase de riesgo; top especies; OT por estado (incluye «Vencidas»); incidencias por estado; próximas intervenciones con fecha; conteo por componente de infraestructura. |
| Dato real | Demo: `trees` (total, georreferenciados, ciclo de vida), `risk-assessments/latest` por proyecto, `maintenance`, `incidents`, `infrastructure-assessments`, `indices`. F6: —. |
| Pendiente | «Próximas inspecciones y monitoreos» (CC-037: `v_upcoming_inspections` / `v_tree_fechas_vigentes` existen en la base, sin endpoint). Estados de OT de CC-050 (la demo usa otro catálogo). «Vencida» no es un estado de CC-050: hoy el frontend la calcula (`MaintenancePage.tsx:109`); hay que decidir si la entrega el backend. Un endpoint de resumen del proyecto evitaría contar en el cliente. |

### Inventario

| | |
|---|---|
| Productivo | `ProjectInventoryMap.tsx` (`/mapa`): mapa ArcGIS protagonista, panel contextual, alta y edición de árbol. |
| Cambio visual | Tabla protagonista (código, especie, estado, DAP, altura, riesgo, última medición, ubicación) con búsqueda, filtros por ciclo de vida y riesgo, paginación; columna derecha con filtro por especie y minimapa; botón «Ver en mapa». |
| Datos de la maqueta | DAP, altura, clasificación de riesgo y fecha de última medición por árbol; conteo por especie. |
| Dato real | Demo: `trees` (GeoJSON sin DAP, altura ni riesgo), `risk-assessments/latest` (riesgo por árbol), `trees/:id` (detalle uno por uno). F6: alta `POST /api/sivu/projects/:id/trees`; especies `GET /api/sivu/projects/:id/species`; **no hay listado**. |
| Pendiente | Listado de árboles con datos vigentes (DAP, altura, riesgo, fecha de vigencia) en una sola llamada. Hasta entonces, DAP/altura/última medición quedan «pendiente del backend» en la tabla. La ruta sigue siendo `/mapa` (D3). Conservar alta y edición (sujeto a contradicción C3). |

### Riesgo («Inspección y Riesgo»)

| | |
|---|---|
| Productivo | `ModulePage module="inspeccion"`: mapa + listado + asistente de evaluación de riesgo de 6 pasos + historial. |
| Cambio visual | Mapa a pantalla completa, tarjeta flotante con resumen de riesgo (dona/barras), aviso de árboles sin georreferencia, filtros y lista flotantes, ficha lateral. |
| Datos de la maqueta | Árboles en riesgo alto o extremo; conteo por clase; evaluados / total. |
| Dato real | Demo: `risk-assessments` (crear, listar, última). F6: borrador de inspección (`POST /work-orders/:id/inspections`, `PATCH /inspections/:id`), fotos. **Calcular y finalizar (#59/#72) no existen todavía**; no hay lectura de evaluaciones. |
| Pendiente | Nombre visible se mantiene «Inspección y Riesgo» (exclusión). Lectura de evaluaciones vigentes por proyecto en F6. |

### Infraestructura

| | |
|---|---|
| Productivo | `ModulePage module="infraestructura"`: mapa + listado + formulario + historial. |
| Cambio visual | Mapa protagonista, tarjeta flotante con conteo por componente (clic = filtro), leyenda inferior «con daño / sin daño / sin evaluación». |
| Datos de la maqueta | Árboles con evaluación; conteo por componente con daño o interferencia. |
| Dato real | Demo: `infrastructure-assessments` por proyecto y por árbol; catálogo `catalogs/modules`. F6: —. |
| Pendiente | Componentes y categorías deben salir del catálogo de la API, no de la maqueta (catálogos del 2026-10-17). Lectura F6. |

### Mantención

| | |
|---|---|
| Productivo | `MaintenancePage.tsx`: tarjetas resumen, filtros por estado, listado, alta, cambio de estado, detalle. |
| Cambio visual | Calendario mensual protagonista, lista de órdenes pendientes, minimapa, chips de resumen. |
| Datos de la maqueta | OT con fecha, acción/subtipo, árbol; estados Pendiente/Programada/En ejecución/Completada/Cancelada/«Vencida». |
| Dato real | Demo: `maintenance` (GET/POST/PATCH estado). F6: crear OT de **Inspección** (`POST /projects/:id/work-orders`), transición (`PATCH /work-orders/:id/estado`). **No hay listado de OT** ni OT de Mantenimiento (#61). |
| Pendiente | Calendario por `fecha_accion_programada` (CC-050: la ingresa el responsable al pasar a Programada). Listado de OT del proyecto. Lista de recordatorios (CC-037) — SIVU no agenda solo. |

### Incidencias, Índices, Proyecto y Miembros

| Pantalla | Productivo | Maqueta | Dato real | Pendiente |
|---|---|---|---|---|
| Incidencias | `IncidentsPage.tsx` | Sin pantalla propia (solo ítem de menú y resumen en Dashboard) | Demo: `incidents` | Se rediseña con el lenguaje visual general. F6: — (#62). |
| Índices | `IndicesPage.tsx` | Sin pantalla propia | Demo: `indices` | Igual que Incidencias. F6: —. |
| Proyectos / ficha | `ProjectsList`, `ProjectDetail` | Menú Proyecto (ficha, miembros, cambiar proyecto) | Demo y F6: `projects` (F6 agrega sector KML/KMZ, edición, estado Activo/Cerrado). | Crear proyecto con sector obligatorio (PR-004 v7.0) solo con F6 (Paso 5). |
| Miembros | `ProjectMembersSection` (admin, `user_id` crudo) | Ítem solo admin | Demo y F6: `members`. | Sigue sin endpoint para listar usuarios (selector). |

### Ficha del árbol

| | |
|---|---|
| Productivo | `TreeContextualPanel` (panel lateral) y `TreeDetailModal` (ficha completa), `TreeModulesSummary`. |
| Cambio visual | Hoja flotante con pestañas Resumen / Medición / Riesgo / Infra. / Gestión, diagrama de componentes, tarjeta de riesgo, acciones al pie. |
| Datos de la maqueta | Medición vigente e historial, resultado de riesgo con componentes, evaluación de infraestructura, OT e incidencias del árbol, ubicación. |
| Dato real | Demo: `trees/:id`, `measurements`, `risk-assessments`, `infrastructure-assessments`. F6: —. |
| Pendiente | La maqueta muestra «Coordenadas WGS84»: lo vigente es UTM (PR-006, PR-016 v6.0 regla 3) → se muestra lo que entregue la API. Acciones según rol vigente (C3). |

## 2. Elementos de la maqueta que caen en las exclusiones

No se implementan, ni como botón inactivo:

> Actualización 2026-10-26: la autora decidió incorporar Conecta, el módulo
> Inspección y el nombre «Riesgo Arbóreo» (ver D3). Siguen sin implementarse
> hasta que el backend registre sus CC; Conecta, además, choca con CC-036
> (formulario sin cuenta). Mensaje para el backend: `mensaje-backend-D3.md`.

1. Módulo **Valpo Verde Conecta** (`Conecta.tsx`, `conecta.css`, `#conecta`, `-placas`, `-publica`) y su ítem en el menú Operación.
2. **Vista ciudadana** (`Citizen.tsx`, `#ciudadano`, ficha pública, reporte, «mis reportes», placas QR).
3. Nombre **«Riesgo Arbóreo»** (menú, Dashboard, grilla de módulos, chip «Territorio · Riesgo Arbóreo») y la idea de un módulo de **Inspección** separado.
4. **«¿Olvidaste tu contraseña?»** y el panel «Recuperar contraseña» del login.
5. **Acceso a Conecta en el login** («¿No trabajas en el municipio?… Conoce los árboles en Valpo Verde Conecta»).
6. **Imagen aérea Esri/Maxar** como fondo (`.map__imagery`, `valparaiso-z19.jpg`) y su atribución; los nombres de calle dibujados sobre el fondo.

Además, por no ser funciones (PR-016 v6.0) o por contradecir lo vigente:

7. Selector **«Ver la maqueta como»** e insignia **«MAQUETA»**.
8. **«Vencida»** como estado de OT (no está en CC-050).
9. **«Coordenadas WGS84»** en la ficha.
10. Acciones de `nav.ts` › `ACTIONS` que dan al Usuario municipal «Nueva evaluación de riesgo» y «Nueva evaluación de infraestructura» (ver C3).
11. Todos los números, nombres, códigos, fechas y catálogos de `mock.ts`, `lab.ts` y `conecta.ts`.

## 3. Contradicciones entre fuentes

| # | Entre | Qué dice cada una | Manda |
|---|---|---|---|
| C1 | Maqueta Lab vs. CC-025 / PR-016 v6.0 | La autora eligió Lab como diseño objetivo (README, 2026-10-18), pero la referencia registrada sigue siendo SIVU Territorio (`c852104`). El README de Lab pide registrar el reemplazo «después de sincronizar la base de datos maestra». | CC-025 hasta que se apruebe D1. **Pregunta:** ¿la base maestra ya está sincronizada (condición del README)? |
| C2 | Pedido de reutilizar código vs. PR-016 v6.0 regla 5 | «El código del prototipo no se importa desde la aplicación productiva: se reescribe dentro de su arquitectura.» | PR-016 v6.0 hasta que se apruebe D2. |
| C3 | Frontend actual y `nav.ts` de la maqueta vs. PR-003 v8.0 / PR-019 v1.2 | El frontend (demo, PR-003 v6.0) y la maqueta dejan al Usuario municipal registrar evaluaciones de riesgo e infraestructura y editar datos técnicos del árbol. PR-003 v8.0 lo prohíbe: eso es del Inspector, vía OT. | PR-003 v8.0. **Choca con la regla del Paso 4 «conservar todas las funciones y permisos actuales»**: hay que decidir qué hacer con esas funciones mientras la Fase 6 no tenga el flujo del Inspector. |
| C4 | Roles de la maqueta vs. CC-026 / CC-032 | La maqueta solo tiene `admin` y `municipal` (CC-022). Vigente: `admin`, `usuario_municipal`, `inspector`, `encargado_mantencion`. Hoy un Inspector que inicia sesión ve «Rol no reconocido». | CC-026 / CC-032 → D4. |
| C5 | Catálogos de la maqueta vs. base vigente | Estados de OT, incidencias, componentes de infraestructura, clase de edad del 2026-10-17. | API / base maestra vigente. |
| C6 | CC-050 vs. calendario de Mantención | El calendario ubica OT por fecha; en CC-050 `fecha_accion_programada` la ingresa el responsable al pasar a Programada; las OT Pendientes no tienen fecha. CC-037: SIVU no agenda automáticamente. | CC-050 / CC-037: en el calendario solo van OT con fecha programada; las demás, en la lista. |
| C7 | API de la demo vs. Fase 6 | El frontend productivo consume la demo (modelo y permisos anteriores); la Fase 6 es un modelo separado sin lecturas todavía. | Decidir (ver resumen). |

## 4. Qué se puede hacer sin esperar al backend

- Paso 1 (tokens, tipografía, logo, primitivas) y Paso 2 (TopBar, navegación,
  tema, cambio de proyecto) no dependen de datos nuevos: solo de D1–D4.
- Paso 3 (login) solo depende de D1/D2 y de confirmar las marcas animadas.
- Paso 4 depende de la decisión C7 (qué API leer mientras la Fase 6 no tenga lecturas).
