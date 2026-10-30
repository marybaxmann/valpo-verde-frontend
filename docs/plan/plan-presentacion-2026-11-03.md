# Plan SIVU — presentación del martes 3 de noviembre de 2026

> **Este plan manda sobre cualquier otra prioridad hasta el lunes 2 de noviembre a las 12:00.** Lo aprobó la responsable (marybaxmann). Si una tarea no está aquí, no se hace sin preguntarle. Si una tarea del plan choca con el Excel maestro o con un CC aprobado, manda el Excel/CC y se le informa.
>
> Vive igual en los dos repositorios: `valpo-verde-backend/docs/plan/plan-presentacion-2026-11-03.md` y `valpo-verde-frontend/docs/plan/plan-presentacion-2026-11-03.md`. Cada sesión marca **solo sus propias tareas** (`[x]`) en su repositorio, en el mismo commit que las cierra.

## 1. Objetivo

El lunes 2 a las 12:00, el sitio publicado muestra el **ciclo central de SIVU completo, con datos reales del piloto y sin atajos de demo**:

1. El Administrador crea el proyecto piloto con su sector (KML de las plazas).
2. El Usuario municipal da de alta los árboles y crea las OT de Inspección.
3. El Inspector programa y ejecuta la OT y registra la evaluación (Evaluación inicial y Reevaluación; Monitoreo si alcanza), con fotos y especie del catálogo.
4. El sistema calcula riesgo, infraestructura, prioridad y fechas sugeridas; el Inspector ajusta si corresponde, con justificación.
5. El Usuario municipal completa la OT y el árbol queda con su **evaluación vigente** en el mapa, la ficha y el Dashboard.
6. Además: cancelar y reasignar una OT, y anular una inspección (CC-050, CC-067).

**Fuera de alcance** (se muestran como «en desarrollo», sin datos inventados): Mantenimiento (#61), Incidencias y Conecta (#62), Indicadores (B19), Recordatorios (#63), Notificaciones (CC-051), árbol nuevo en Levantamiento (CC-052).

**Base:** la presentación usa la base de **pruebas** (`gmlbmyreoxgoqrolhyxo`), limpia y con datos reales del piloto. La base real (`ytcxswbulsmboucardxa`) **no se toca** (#45 sigue en la Fase 8).

## 2. Reglas para todas las sesiones

- Fuente metodológica: el Excel maestro y los CC aprobados. «D-n» = fila del .xlsx, nunca línea del CSV.
- **No inventar** reglas, datos ni contratos. Ante una duda: opciones con recomendación, y esperar a la responsable.
- Toda migración sigue el ciclo del relevo (backend, `docs/relevo/RELEVO_2026-10-29.md` §4.3). Las que **cambian** algo existente se muestran antes de aplicar.
- Nada de datos ficticios en pantalla. Lo que no existe, se muestra como «en desarrollo».
- **Congelamiento: lunes 2 a las 12:00.** Después solo se corrigen errores, con aviso a la responsable.
- Al cerrar cada tarea: commit y push, marcar la tarea `[x]` aquí y escribir una línea en «Registro» (sección 6) con fecha, hora y commit.
- Si una tarea se atrasa más de medio día respecto a su fecha, avisar a la responsable con una propuesta de recorte.
- **Las fechas son máximos, no turnos.** Una tarea se adelanta apenas sus dependencias estén listas; la meta de la responsable es tener todo listo el **viernes 30**. B-8 y F-10 pueden etiquetar una versión candidata (`presentacion-2026-11-03-rc1`, `-rc2`…) cada vez que algo quede estable; la etiqueta final se pone al cerrar todo.

## 3. Tareas del backend (sesión backend)

| ID | Tarea | Para | Depende de | Hecho cuando |
|---|---|---|---|---|
| B-1 | Revisar `wip/bloque1-completar-ot` (Jest, tsc, diff), llevarla con `--ff-only` a `feature/fase6-backend-api` y dejar `release/demo` igual (Vercel redespliega) | Vie 30, 12:00 | 025–027 aplicadas (ya están) | `sivu-api.vercel.app` responde completar, cancelar, reasignar, anular, B17 y B18 con `vigente` |
| B-2 | Pruebas de RLS en la base de B7, B17 y B18 (incluido `tree_assessments`) | Vie 30 | B-1 | Script con miembro y no miembro, en verde |
| B-3 | B13: geometría del sector en `GET /api/sivu/projects/:id` (GeoJSON WGS84) | Vie 30 | — | El frontend puede dibujar el contorno |
| B-4 | Mensajes de error claros: alta rechazada sin nombrar un `tree_code` que no se creó; especie inválida en palabras simples; perfil ilegible → 503 (no 403) | Sáb 31 | — | Tests de cada mensaje |
| B-5 | Búsqueda sin tildes en B1 y en especies («platano» encuentra «plátano») | Sáb 31 | — | Test con y sin tilde |
| B-6 | Avisar al frontend de cada endpoint nuevo o cambiado (en `docs/plan/coordinacion.md`) | Continuo | — | Cada cambio de contrato anotado el mismo día |
| B-7 | Apoyo a la carga de datos del piloto (domingo): resolver bloqueos del backend en el momento | Dom 1 | F-8 | Carga completa sin atajos |
| B-8 | Congelar: `release/demo` en un commit etiquetado `presentacion-2026-11-03` | Lun 2, 12:00 | Todo lo anterior | Etiqueta creada y desplegada |

## 4. Tareas del frontend (sesión frontend)

| ID | Tarea | Para | Depende de | Hecho cuando |
|---|---|---|---|---|
| F-1 | Subir el commit pendiente `2f3e394` (Agenda y diagnóstico en la ficha) | Jue 29 | — | Desplegado en Vercel |
| F-2 ✔ | Completar, cancelar y reasignar OT; anular inspección (solo Usuario municipal, CC-067) | Vie 30 | B-1 | Probado con cada rol en el sitio publicado |
| F-3 ✔ | Retomar el borrador desde cualquier equipo (B17), sin depender del navegador | Vie 30 | B-1 | Borrador abierto en otro navegador |
| F-4 ✔ | Mapas, ficha y Dashboard con la **evaluación vigente** (B18 `vigente`), distinguiendo «finalizado» de «vigente» | Vie 30 | B-1 | Árbol con OT completada se ve con su vigente |
| F-5 | Formulario con las etiquetas y secciones aprobadas (139) y tipos Reevaluación y Monitoreo | Sáb 31 | — | Sin nombres técnicos; los 3 tipos probados |
| F-6 ✔ | Contorno del sector en los mapas | Sáb 31 | B-3 | Contorno visible y mapas centrados en el sector |
| F-7 ✔ | Limpieza: borrar código de la demo vieja (`api/trees.ts`, `api/moduleRecords.ts`, `api/treeRiskAssessments.ts` y lo que dependa); módulos fuera de alcance como «en desarrollo»; sin avisos técnicos en pantalla | Sáb 31 | — | Build y lint limpios; ninguna llamada a `/api/` fuera de `/api/sivu` y `/api/auth` |
| F-8 | Carga de datos reales del piloto con la propia aplicación (proyecto, sector, árboles, OT, inspecciones con fotos, completar OT) | Dom 1 | F-2 a F-6, datos de la responsable | 3 o 4 árboles con evaluación vigente; el resto dado de alta |
| F-9 | Recorrido completo por rol en el sitio publicado (Administrador, Usuario municipal, Inspector), computador y teléfono, claro y oscuro; corregir lo que aparezca | Dom 1 | F-8 | Lista de errores en cero o aceptados por la responsable |
| F-10 | Congelar: rama del frontend etiquetada `presentacion-2026-11-03` y desplegada | Lun 2, 12:00 | Todo lo anterior | Etiqueta creada |
| F-11 | Guion de la presentación y video de respaldo del recorrido completo | Lun 2 | F-10 | Guion y video entregados a la responsable |

## 5. Lo que aporta la responsable

| ID | Qué | Para |
|---|---|---|
| R-1 | Para quién es la presentación (comisión de tesis, municipio, otro) | Jue 29 |
| R-2 | Datos del piloto: planilla del levantamiento del 10 de agosto (árboles y evaluaciones) y fotos | Sáb 31 |
| R-3 | Aprobar cada migración que cambie algo existente, y cada recorte de alcance | Cuando se pida |
| R-4 | Cuentas de presentación por rol (crearlas o autorizar su creación) | Dom 1 |
| R-5 | Ensayo del guion | Lun 2 |

## 5b. Pendientes sin fecha (no entran en el plan del lunes)

Ideas aprobadas como pendientes por la responsable, **sin fecha asignada**. No se trabajan hasta que ella les ponga fecha; si se adelantan, nunca antes de cerrar F-8 y F-9.

| ID | Qué | Notas |
|---|---|---|
| P-1 | **Animaciones y microinteracciones del frontend** (registrado el 2026-10-30) | Animación de espera al iniciar sesión y al cargar cada módulo; transiciones suaves al seleccionar un árbol, una OT o una pestaña; una pequeña animación al completar acciones (guardar, finalizar, completar la OT). Con transiciones de CSS, sin librerías pesadas; respetar `prefers-reduced-motion`; ninguna animación bloquea ni hace más lenta la página. Skills candidatas: `frontend-design` (oficial de Anthropic) para el trabajo y `web-design-guidelines` (Vercel) como revisión. Las skills de la comunidad («UI UX Pro Max», «Transitions dev», «Animate») se revisan antes de instalarlas. |

## 6. Registro

Una línea por tarea cerrada: `AAAA-MM-DD HH:MM · ID · commit · nota`.

- 2026-10-29 · plan acordado con la responsable.
- 2026-10-30 · F-7 · (este commit) · borrado el código de la demo vieja (3 módulos de API y 13 archivos sin uso); avisos «En desarrollo» sin códigos técnicos; build y lint limpios.
- 2026-10-30 · F-5 en curso · (este commit) · secciones y etiquetas del Excel, Reevaluación, ajustes del Inspector y fechas con justificación; falta probar en el navegador. Monitoreo espera que el backend entregue el esquema por subtipo.
- 2026-10-30 · F-2, F-3, F-4, F-6 · (este commit) · código listo, compila, lint y build limpios; **sin probar en el navegador** (falta iniciar sesión con las cuentas de prueba). F-2: completar, cancelar y reasignar OT, e inspecciones de la OT con anular (Usuario municipal). F-3: el formulario retoma el borrador desde B17, sin depender del navegador. F-4: Riesgo, Infraestructura, ficha e Inventario muestran la evaluación vigente; sin ella, «Evaluación pendiente»; la inspección finalizada sin completar se ve aparte. F-6: contorno del sector en los mapas y encuadre. Pendiente del backend: B7 (Dashboard) cuenta el riesgo finalizado, no el vigente.
- 2026-10-30 · F-3 · (este commit) · probado con `inspector.f7` en local contra `sivu-api`: programar → iniciar → formulario de Reevaluación; borrador guardado y retomado tras recargar (desde B17). F-5 probado en parte: secciones, etiquetas, Reevaluación y «Calcular» con la lista de faltantes legible; los ajustes y las fechas se prueban con una inspección completa (F-8). Corregidos: unidad repetida en las etiquetas, condiciones con nombres técnicos, nombre de campos en fuente monoespaciada.
- 2026-10-30 · F-3, F-4, F-6 · (este commit) · probados con `municipal.f7` e `inspector.f7` en local contra `sivu-api`: OT-I-000260 completada desde la interfaz → A-000346 queda «Alto» vigente en Riesgo Arbóreo, ficha e Inventario (columna «Riesgo vigente»), con próximas fechas; el resto «Evaluación pendiente»; contorno del sector en los mapas. Corregido: la vigente creada al completar una OT trae `inspection_id` nulo; ahora se compara por la OT. F-2 en parte: completar probado; cambiar responsable abre su formulario (no hay otro Inspector en el proyecto, ver R-4); cancelar y anular no se enviaron para no borrar el único ejemplo vigente.
- 2026-10-30 · F-2 en parte · (este commit) · con `municipal.f7`: cancelar OT-I-000261 (queda «Cancelada», sin acciones, su borrador INS-000319 sigue en el historial como Preguardado, CC-050); anular INS-000241 de la OT-I-000260 completada (queda «Anulado» con su motivo y A-000346 vuelve a «Evaluación pendiente», CC-045 a, CC-067). Falta: cambiar responsable, a la espera de un segundo Inspector en el proyecto QA (lo crea la responsable).
- 2026-10-30 · F-2 · (este commit) · cerrada: con `municipal.f7`, OT-I-000350 creada para «Inspector Fase 7» y reasignada a «Inspector 2 Fase 7» (la lista solo ofrece al otro Inspector; el panel muestra el nuevo responsable). Con lo anterior, completar, cancelar, reasignar y anular probados en el navegador. Corregido: mensaje de confirmación duplicado. Nota: el segundo Inspector necesitó su fila en `user_profiles` (crear la cuenta en Supabase Auth no la crea); tenerlo en cuenta en R-4.
- 2026-10-30 · F-5 en parte, F-8 en curso · (este commit) · Piloto Valparaíso: 11 árboles reales de alta (A-000417 a A-000427; AV_000011 sin especie queda fuera), 4 OT de Evaluación inicial (OT-I-000351 a 354, prioridad Media, Inspector Fase 7) en ejecución con el formulario completo desde la Hoja 3 y calculado. F-5 probado con A-000419 (fotos subidas por la responsable): un ajuste sin justificación bloquea Recalcular y Finalizar; el riesgo ajustado a Alto recalcula prioridad (Media) y fechas; un ajuste igual al nuevo calculado lo rechaza el backend (D-173) y el mensaje se ve en la barra; la fecha editada exige justificación. Ajustes de prueba retirados: el borrador queda con el cálculo de SIVU. Falta para F-5: Monitoreo (esquema por subtipo del backend). Falta para F-8: fotos de 3 árboles, 2 datos vacíos en el Excel (D-21 copa EO de A-000423; D-78 diámetro máx. ramas secas de A-000426), finalizar y completar. `observaciones_infraestructura` del Excel no tiene campo en el formulario.
- 2026-10-30 · F-8 en curso · (este commit) · A-000419 finalizada (INS-000320, Moderado, sin ajustes). Al finalizar, la respuesta tardó ~15 s y la pantalla mostró «no está en Preguardado» aunque el backend ya la había finalizado. Corregido: ante un error al finalizar, el formulario consulta B17 y, si la inspección ya está finalizada, muestra «Inspección finalizada». tsc, lint y build limpios; ese caso no se pudo reproducir en el navegador.
- 2026-10-30 20:01 · F-8 en curso · (este commit) · A-000422 finalizada (OT-I-000352, Moderado, prioridad Media). Corregido: el formulario `/inspector/ot/:id/inspeccion` no se podía desplazar porque su ruta termina en «/inspeccion», como el mapa de Riesgo, y recibía el diseño de mapa a pantalla completa (`overflow: hidden`); por eso la sección Fotografías no se alcanzaba. Ahora ese diseño se aplica solo dentro de un proyecto. Probado en el navegador con A-000423 (la página se desplaza hasta Fotografías); tsc, lint y build limpios.
