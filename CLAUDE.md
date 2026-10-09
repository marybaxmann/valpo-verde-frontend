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

Siempre:

1. este archivo;
2. `../valpo-verde-backend/HANDOFF.md` — estado actual, cambios recientes
   y bloqueos (relevo entre agentes; único para ambos repositorios);
3. `docs/frontend-architecture.md` — arquitectura y bitácora del frontend.

Según la tarea (fuentes canónicas, en el repositorio backend):

| Necesito saber… | Fuente |
|---|---|
| Reglas y decisiones vigentes (roles, observado→calculado, SIG, jerarquía de fuentes) | `../valpo-verde-backend/docs/project-rules.md` |
| Decisiones de arquitectura (autenticación, ubicación, SIG) | `../valpo-verde-backend/docs/architecture-decisions.md` |
| Contrato de la API (endpoints, formatos, errores) | `../valpo-verde-backend/README.md` § "Contrato para frontend" y `src/routes/` del backend |
| Significado de los datos, catálogos y clasificaciones | `../valpo-verde-backend/docs/methodology/00-index.md` y `convenciones-catalogos.md` |
| Cambios aprobados o pendientes (CC) | `../valpo-verde-backend/docs/registro-cambios.md` |
| Procedimiento para cambios | `../valpo-verde-backend/docs/workflow.md` |

Repositorio remoto del backend: `marybaxmann/valpo-verde-backend`.

## Jerarquía de fuentes (PR-016 v4.0, CC-021)

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
| Referencia visual principal | `docs/referencias/visuales/03_CityDashboardsButton.jpg` | Composición, lenguaje gráfico, relación mapa–paneles, densidad informativa y paleta. No define funcionalidad ni metodología. |

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

`npx tsc -b`, `npm run build`, prueba en el navegador de la funcionalidad
tocada (incluidos los estados de error y vacío) y verificación de que no
se versiona ningún secreto.

## Agente

`.claude/agents/frontend-ux.md` — traduce el modelo vigente a la
experiencia de SIVU. Para revisar la consistencia puede usarse el agente
`qa` del backend.

## Handoff

Mismo protocolo que el backend: leer y actualizar
`../valpo-verde-backend/HANDOFF.md`.
