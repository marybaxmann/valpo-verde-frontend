# D5 — Inspector y Encargado entran a su módulo, sin «Mis OT»

Borrador para registrar como CC en `valpo-verde-backend/docs/registro-cambios.md`
(el frontend no edita ese registro). Modifica CC-064, puntos k, n y o.

| Campo | Valor |
|---|---|
| Fecha | 2026-11-01 |
| Origen | Revisión del módulo Mantenimiento (#61) en el frontend: «Mis OT» repetía las OT que ya muestran los módulos Inspección y Mantención (grupo Operación, CC-059). |
| Tipo | 5 — navegación e interfaz por rol |
| Versión anterior (CC-064 k, n, o) | El Inspector y el Encargado de mantención entran a «Mis OT», con las OT de todos sus proyectos y filtro por proyecto (rutas `/inspector` y `/mantencion`). |
| Versión nueva | Se elimina «Mis OT» como pantalla. Al iniciar sesión, el usuario elige el proyecto; dentro del proyecto entra a su módulo principal: el Inspector a **Inspección** (OT de Inspección) y el Encargado a **Mantención** (OT de Mantenimiento). Desde ahí navega por los demás módulos del proyecto en **solo lectura**, sin crear, editar ni eliminar fuera de sus OT. El Encargado no ve el módulo Inspección (CC-064, sin cambio). El Inspector llega a «Revisiones de mantenimiento» desde Mantención y al «Catálogo de especies» desde Inspección. |
| Sin cambio | Qué ve y qué registra cada rol (CC-064 a–j), los permisos del backend y las rutas `/inspector` y `/mantencion`. |
| Impacto en backend | Ninguno: B3 ya filtra por rol. B4 (`/work-orders/mine`) deja de usarse en el frontend. |
| Impacto en frontend | `feature/mantenimiento-61`: rutas sin `mis-ot`; «Entrar al proyecto» y el logotipo llevan al módulo principal; marca «Solo lectura» fuera de él; menú, buscador y Dashboard sin Inspección para el Encargado. |
| Decisión | De la responsable, 2026-11-01. |
