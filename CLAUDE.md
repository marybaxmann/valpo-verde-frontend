# SIVU — Frontend · Instrucciones de proyecto

Frontend productivo de SIVU. Punto de entrada corto: indica qué leer y qué
fuente manda. No duplica documentos que tienen una fuente canónica en el
backend. Algunos documentos históricos usan el nombre anterior del
proyecto, "Valpo Verde".

## Principio fundamental

**El frontend representa la lógica de SIVU; no la redefine.**

- La metodología vigente, las decisiones controladas y el backend/API
  determinan qué datos existen, qué puede ingresar el usuario, qué se
  calcula, y qué relaciones, operaciones, permisos, clasificaciones y
  estados existen.
- El frontend determina cómo se presentan, se recorren, se relacionan
  visualmente, se comprenden y se interactúa con ellos.

## Antes de trabajar — orden de lectura

Siempre, y nada más al arrancar:

1. este archivo;
2. **`docs/ESTADO.md`** — estado actual del frontend en menos de 100 líneas:
   ramas, despliegue, trabajo en curso, cómo probar y qué leer para cada
   tarea.

**No leas completos** al arrancar `../valpo-verde-backend/HANDOFF.md`
(~166 KB), `docs/frontend-architecture.md` (~60 KB) ni
`../valpo-verde-backend/docs/project-rules.md` (~158 KB): consume buena
parte del contexto antes de empezar. Busca la sección que necesitas
(`grep -n "^### "`, `grep -n "^## PR-0"`) y lee solo esas líneas.

**Al terminar** un trabajo, actualiza `docs/ESTADO.md` (corto) y agrega el
detalle a la bitácora de `docs/frontend-architecture.md`. Si además se
registraron árboles, se cargaron evaluaciones o fotos, o se publicó algo,
anótalo **en el momento** en `../valpo-verde-backend/docs/ESTADO.md`
(tabla «Cuándo hay que documentar»): los datos son de todos.

Según la tarea (fuentes canónicas, en el repositorio backend; leer solo la
sección pertinente):

| Necesito saber… | Fuente |
|---|---|
| Reglas y decisiones vigentes (roles, observado→calculado, SIG, jerarquía de fuentes) | `../valpo-verde-backend/docs/project-rules.md` |
| Decisiones de arquitectura (autenticación, ubicación, SIG) | `../valpo-verde-backend/docs/architecture-decisions.md` |
| Contrato de la API (endpoints, formatos, errores) | `../valpo-verde-backend/README.md` § "Contrato para frontend" y `src/routes/` del backend |
| Significado de los datos, catálogos y clasificaciones | `../valpo-verde-backend/docs/methodology/00-index.md` y `convenciones-catalogos.md` |
| Cambios aprobados o pendientes (CC) | `../valpo-verde-backend/docs/registro-cambios.md` |
| Procedimiento para cambios | `../valpo-verde-backend/docs/workflow.md` |

Repositorio remoto del backend: `marybaxmann/valpo-verde-backend`.

## Jerarquía de fuentes (PR-016 v7.0; CC-021, CC-023, CC-025, CC-057)

Ante contradicción, manda la de mayor nivel:

1. metodología y fuentes vigentes (paquete metodológico, PR-002);
2. decisiones controladas (ADR, PR, CC);
3. backend + API vigente;
4. documentación vigente del proyecto;
5. Figma / prototipo histórico — solo intención funcional;
6. referencias visuales aprobadas — solo UX/UI, nunca lógica.

## Referencias de producto

| Referencia | Ubicación | Función |
|---|---|---|
| Figma original (8 pantallas) | `docs/referencias/figma-original/` | Intención funcional histórica de cada pantalla. Puede contener módulos, campos, categorías y cálculos superados; no restablece decisiones posteriormente modificadas. |
| Prototipo navegable | `marybaxmann/Valpo-Verde-Conecta` | Intención funcional histórica (mismo nivel que el Figma, PR-001 v3.0). |
| Referencia visual principal (PR-016 v7.0, CC-057) | Rama `prototype/sivu-maqueta-lab` (`6817fb2`), `prototypes/sivu-maqueta-lab/` | Maqueta «SIVU Lab»: composición, navegación, tipografía, color, densidad, estados visuales y pantalla de acceso. Aprueba la dirección, no cada componente. No es una implementación funcional: usa datos ficticios, catálogos del 2026-10-17 y las acciones por rol de CC-022, que nunca prevalecen sobre la API ni sobre la base vigente. Navegación y nombres visibles: CC-059 y CC-060. Lo que propone sin CC propio queda fuera. |
| Reutilización de código (PR-016 v7.0, regla 5; CC-058) | — | La aplicación no importa nada desde `prototypes/`. Se pueden copiar, adaptados, solo elementos de presentación sin datos: valores de diseño, logo y fotografía de la autora, hojas de estilo de presentación e íconos SVG. Los componentes con lógica o datos se reescriben. Nunca se copian `mock.ts`, `lab.ts`, `conecta.ts`, `conecta.css`, `Conecta.tsx`, `Citizen.tsx`, `nav.ts` ni la imagen aérea. Cada commit con material copiado lo indica en su mensaje. |
| Antecedente visual (CC-057) | Rama `prototype/sivu-territorio-v1` (`c852104`), `prototypes/sivu-territorio-lab/` | Antigua referencia principal (CC-025), reemplazada por SIVU Lab. |
| Antecedente visual | `docs/referencias/visuales/03_CityDashboardsButton.jpg` | Inspiración complementaria: relación mapa–paneles y densidad informativa. |
| Referencias complementarias (PR-016 v5.0, CC-023) | Fuera del repositorio (material de terceros) | Inspiración UX/UI: ficha lateral con pestañas y pines legibles (vista de árbol de Groundzy), resumen flotante sobre el mapa, donas y tarjetas tintadas, barras ordenadas. Se adaptan a la arquitectura de SIVU sin copiar identidad ni composición; la paleta de riesgo es la de PR-016 v8.0 (CC-082) y solo cambia con un CC; sin funciones que SIVU no calcula; gráficos solo con datos reales; rediseño solo tras validar una maqueta con la autora. |

Los diagramas de decisión metodológicos **no** son referencias de UI y no
se copian a este repositorio. La metodología se consulta solo en las
fuentes canónicas del backend.

## Reglas transversales

- **No inventar.** Si falta un dato, un endpoint o una decisión, no se
  simula: se muestra el estado real (carga, vacío, error, pendiente) y se
  reporta el bloqueo.
- **Sin datos ficticios ni respaldos falsos.** Una petición fallida nunca
  se reemplaza con valores fijos que aparenten que la función opera.
- **El frontend no calcula metodología:** probabilidad de falla, riesgo,
  clasificaciones, afectación de infraestructura, clasificación de
  prioridad ni indicadores derivados. Los recibe del backend y los
  representa.
- **Los datos se obtienen de la API autorizada.** Supabase se usa solo
  para la sesión (Supabase Auth), no para consultar datos en lugar de la
  API.
- **Catálogos:** se guarda el `codigo` y se muestra la `etiqueta`; no se
  escriben catálogos compartidos en el código.
- **Permisos:** el frontend adapta la interfaz al rol confirmado por el
  backend; no decide la seguridad.
- **Mapa:** ArcGIS solo representa; nunca se escribe en ArcGIS (ADR-015).
- **Secretos:** `VITE_ARCGIS_API_KEY` y demás valores reales viven solo en
  `.env`; nunca en el código ni en el repositorio. `service_role` no
  existe en este repositorio.

## Arquitectura (orientación)

React + Vite + TypeScript → cliente API (`src/api/client.ts`, JWT de
Supabase) → backend. Detalle en `docs/frontend-architecture.md`.

## Antes de entregar

`npx tsc -b`, `npm run build`, `npm run lint` (oxlint), prueba en el navegador de la funcionalidad
tocada (incluidos los estados de error y vacío) y verificación de que no
se versiona ningún secreto.

## Agente

`.claude/agents/frontend-ux.md` — traduce el modelo vigente a la
experiencia de SIVU. Para revisar la consistencia puede usarse el agente
`qa` del backend.

## Relevo

El estado vigente vive en `docs/ESTADO.md` (frontend) y en
`../valpo-verde-backend/docs/ESTADO.md` (backend y bases de datos). Al
cerrar un trabajo se actualiza el `ESTADO.md` del repositorio tocado. El
`HANDOFF.md` del backend queda como historial: se consulta por sección,
no se lee entero.
