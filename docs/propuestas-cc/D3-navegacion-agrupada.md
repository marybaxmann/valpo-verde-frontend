# Borrador CC (sin número) — D3: agrupación de la navegación y nombres de módulos

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 (borrador) |
| Origen | Maqueta Lab (`src/data/nav.ts`); decisión de la autora del 2026-10-26 en la Fase 7 del frontend. |
| Tipo | UX / navegación (PR-016, regla de integración 2) y producto (módulos nuevos) |
| Estado | APROBADO METODOLÓGICAMENTE como **CC-059** (navegación), **CC-060** (nombres visibles), **CC-061** (módulo Inspección) y **CC-062** (Conecta dentro de CC-036, sin cuentas) — 2026-10-26, backend `wip/cc057-frontend`, `57c4a7e` |
| Regla afectada | PR-016 v6.0, regla de integración 2: los módulos «pueden reorganizarse visualmente o cambiar su nombre visible solo con aprobación previa de la autora». CC-036 / PR-022 (punto 5). |
| Versión anterior | Menú lateral plano dentro de un proyecto: Dashboard, Inventario, Inspección y Riesgo, Infraestructura, Mantención, Incidencias, Índices. Fuera de un proyecto: «Mis proyectos». |

## Decisión de la autora (2026-10-26)

Orden de la navegación dentro de un proyecto:

| Orden | Grupo | Módulo (nombre visible nuevo) | Antes | Ruta |
|---|---|---|---|---|
| 1 | Análisis | **Dashboard** (primer módulo que se ve) | Dashboard | `/projects/:id/dashboard` |
| | | **Indicadores biométricos** | Índices | `/projects/:id/indices` (sin cambio) |
| 2 | Operación | Mantención | — | `/projects/:id/mantencion` |
| | | Incidencias | — | `/projects/:id/incidencias` |
| | | **Valpo Verde Conecta** (nuevo) | no existía | por definir |
| | | **Inspección** (nuevo) | no existía | por definir |
| 3 | Territorio | Inventario | — | `/projects/:id/mapa` |
| | | **Riesgo Arbóreo** | Inspección y Riesgo | `/projects/:id/inspeccion` (sin cambio) |
| | | Infraestructura | — | `/projects/:id/infraestructura` |
| 4 | Proyecto | Ficha, Miembros (solo Administrador), Cambiar proyecto | — | `/projects/:id`, `/projects` |

Proyecto (decisión de la autora, 2026-10-26): no va al final como en la
maqueta. El nombre del proyecto actual va **junto al logo**, con su menú
(ficha, miembros —solo Administrador—, cambiar proyecto). Los tres grupos
quedan a continuación.

## Versión nueva propuesta

1. La navegación se agrupa en Análisis, Operación, Territorio y Proyecto, en
   ese orden. Dashboard es la pantalla de entrada del proyecto.
2. Cambios de nombre visible (solo etiqueta; rutas, datos y permisos sin
   cambio): «Índices» → «Indicadores biométricos»; «Inspección y Riesgo» →
   «Riesgo Arbóreo».
3. «Indicadores biométricos» muestra lo mismo que hoy muestra Índices
   (agregados descriptivos del inventario). No implica adoptar los
   indicadores de la hoja INDICES, que siguen pendientes en CC-016.
4. Nuevo módulo **Inspección** (grupo Operación): donde el Inspector ve y
   trabaja sus OT de Inspección (borrador, fotos, calcular y finalizar).
   Riesgo Arbóreo queda como consulta territorial de los resultados.
5. Nuevo módulo **Valpo Verde Conecta** (grupo Operación): participación
   ciudadana (reportes desde placas QR, placas y ficha pública).
6. Los puntos 4 y 5 se implementan solo cuando el backend tenga su CC
   registrado, su rol o permisos y sus endpoints. Hasta entonces, no aparecen
   en la navegación (ni como botón inactivo). Los puntos 1 a 3 se implementan
   en el Paso 2 de la Fase 7.

## Puntos que el backend debe resolver (ver `mensaje-backend-D3.md`)

- Conecta: la maqueta propone cuenta ciudadana, reporte y seguimiento. CC-036
  / PR-022 vigente dice **formulario público sin cuenta**. Es un cambio de
  regla, no solo visual.
- Inspección: qué ve cada rol en ese módulo y el endpoint para listar las OT
  del Inspector (`pendientes-backend.md`, B4).
- Que el cambio de nombre de los dos módulos quede registrado (PR-016 regla 2)
  y, si corresponde, en los textos de la documentación del backend.

## Archivos afectados

Backend: `docs/registro-cambios.md`, `docs/project-rules.md` (PR-016; PR-022
si cambia Conecta). Frontend: `src/layouts/RoleLayout.tsx`,
`src/components/Sidebar.tsx`, `src/components/Topbar.tsx`, títulos de
`ModulePage.tsx`, `IndicesPage.tsx`, `ProjectDashboard.tsx`.

## Impacto

Puntos 1 a 3: ninguno en metodología, datos, API ni permisos. Puntos 4 y 5:
roles, permisos y API (requieren CC propio en el backend).
