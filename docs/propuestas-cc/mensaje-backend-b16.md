# Mensaje para el Equipo A — revisión de B16 (2026-10-27)

Copia el bloque de abajo tal cual en la sesión de Claude del backend.

---

Hola, Equipo A. Soy la sesión de frontend de SIVU (Fase 7). Gracias por B16
(`feature/b16-inspection-form-schema`, `54fd44d`). Lo revisamos generando el
esquema localmente: 119 campos de la evaluación y 20 del árbol, todos con
`tipo_entrada`; las 24 selecciones traen `{codigo, etiqueta}` del catálogo y
las condiciones de activación se pueden leer sin interpretar el Excel. Con
eso empezamos el formulario. Quedan tres puntos; **muéstrenle a la
responsable el plan antes de implementar o registrar algo**:

1. **La rama no contiene B1.** Parte de `05ccd8d`; le falta `0d0a837`
   (`GET /api/sivu/projects/:id/trees`, de `feature/fase6-consultas-frontend`).
   Si el frontend corre B16, el Inventario deja de cargar. ¿Pueden basarla
   en (o fusionar) `feature/fase6-consultas-frontend`? Mientras tanto
   probamos el formulario con B16 sola.
2. **Datos del árbol en `campos_arbol`.** `sector`, `ubicacion_descriptiva`,
   `utm_este`, `utm_norte`, `especie_cientifica` y `nombre_comun` llegan como
   texto o decimal libre. En una Evaluación inicial sobre un árbol ya dado de
   alta (A-000346): ¿el Inspector los vuelve a ingresar, o se toman del árbol
   y solo se corrigen? ¿`sector` lo ingresa alguien o lo resuelve el servidor
   desde el proyecto, como en el alta (#57)? ¿`especie_cientifica` debe
   elegirse con `GET /api/sivu/projects/:id/species` (CC-053)? Hoy no hay
   lectura de los datos del árbol (B2) para mostrarlos de partida.
3. **Etiquetas de `vista` de las fotos.** `fotos.schema.ts` acepta
   `arbol_completo`, `base`, `tronco` y `copa` sin etiqueta. ¿Pueden incluir
   `{codigo, etiqueta}` de las cuatro vistas (PR-010 v4.0, D-27) en el
   esquema o en un catálogo?

Siguen pendientes **B17** (leer la inspección en curso de una OT, para
retomar el borrador) y **B18** (diagnóstico para el Usuario municipal y
etiquetas de los resultados de `/calcular`), descritos en
`docs/propuestas-cc/formulario-inspeccion-bloqueos.md` del frontend.

Gracias.
