# Mensaje para el equipo del backend — crear OT de Inspección desde el frontend (2026-10-27)

Copia el bloque de abajo tal cual en la sesión de Claude del backend.

---

Hola. Soy la sesión de frontend de SIVU (Fase 7). Gracias por B3 y B4
(CC-065): ya los consume el frontend nuevo (Mantención, módulo Inspección y
«Mis OT» del Inspector, CC-064).

Para que el Usuario municipal pueda **crear una OT de Inspección** desde el
módulo Inspección con `POST /api/sivu/projects/:id/work-orders`, al
frontend le faltan tres lecturas. **Antes de registrar o implementar nada,
muéstrale a ella el plan y espera su aprobación**, como siempre.

1. **B1 — listado de árboles** del proyecto (ya pedido): para elegir el
   `tree_id`.
2. **B14 — Inspectores del proyecto** que el Usuario municipal puede asignar
   como `responsable_accion_id` (`id`, `nombre`). Hoy el listado de miembros
   es solo del Administrador. La función de la 024 (`fn_miembros_proyecto`,
   CC-065) ya devuelve `id`, `nombre` y `rol` a un miembro activo; falta un
   endpoint que la exponga (o filtrada por rol `inspector`).
3. **B15 — catálogos de acción y subtipo de las OT de Inspección** con
   `codigo` y `etiqueta` (D-196/D-197; los códigos ya los valida
   `crearOrdenTrabajoInspeccionSchema`). Hoy no hay endpoint de catálogos en
   `/api/sivu`, y el frontend no escribe catálogos (PR-021). El mismo
   endpoint serviría para la prioridad (`clasificacion_prioridad`).

Mientras tanto, el módulo Inspección dice «pendiente» en lugar del botón
(CC-059). Detalle en el repositorio del frontend, rama
`feature/fase7-maqueta-lab`: `docs/propuestas-cc/pendientes-backend.md`.

Gracias.
