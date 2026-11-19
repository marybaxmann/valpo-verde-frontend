# Estado actual — frontend SIVU

> **Leer esto primero.** Es lo único que una sesión nueva necesita para empezar. Todo lo demás se consulta **por sección** cuando la tarea lo pide (tabla «Qué leer y cuándo»). Al terminar un trabajo, actualiza este archivo: es corto a propósito (máximo ~100 líneas); el detalle va en la bitácora.
>
> Última actualización: 2026-11-19.

## Qué es

Frontend productivo de **SIVU** (gestión del arbolado urbano de Valparaíso; antes «Valpo Verde»). React + Vite + TypeScript, ArcGIS para el mapa, Supabase solo para la sesión. Todos los datos vienen de la API del backend (`valpo-verde-backend`). El frontend **no calcula metodología**: representa lo que entrega la API.

## Ramas y despliegue

| Qué | Dónde |
|---|---|
| Rama que despliega Vercel (**integración**) | `feature/fase7-maqueta-lab` → https://sivu-plataforma.vercel.app |
| `main` | Atrasada; no se usa para trabajar. |
| API publicada | https://sivu-api.vercel.app (backend `release/demo`), base de **pruebas** `gmlbmyreoxgoqrolhyxo` |
| Referencia visual aprobada | Maqueta SIVU Lab: rama `prototype/sivu-maqueta-lab`, worktree `../valpo-verde-frontend-maqueta` |

Las ramas de trabajo salen de `feature/fase7-maqueta-lab` y vuelven a ella por PR.

## Trabajo en curso

| Qué | Estado (2026-11-19) |
|---|---|
| **D-27 (CC-077), cierre con dos fotos** | **Publicado en sivu.cl:** #19 (porcentajes de copa) y #20 (dos fotos sin etiquetas) fusionados; el backend y las migraciones 040 y 041 también están publicados. Falta la prueba de cierre real con un Inspector y una OT de prueba. |
| **Rediseño de Infraestructura** (`feature/infraestructura-componentes`) | PR #22, en **borrador**: pin «reloj», rueda de componentes como filtro, ficha Resumen/Componentes/Fotos. Aprobado por la responsable y probado con datos reales. Se fusiona después de la prueba de D-27. Fotos por componente: requiere un CC. |
| Documentación de arranque | PR #21 (este `ESTADO.md` y la bitácora al día) |

## Cómo correrlo y probarlo

- `npm run dev` (o `preview_start` con `frontend` desde `C:\Users\usuario\code\.claude\launch.json`, puerto 5173).
- **Ojo:** `.env.development.local` apunta a la **API publicada** (`sivu-api.vercel.app`) con cuentas reales. Para probar con datos hay que iniciar sesión; el agente no ingresa credenciales: se le pide a la persona que entre en el navegador.
- Proyecto con datos para probar: **Piloto Valparaíso** (`18b647e8-7b5e-44a4-ac02-a5a6a2b4f7d8`).
- Antes de entregar: `npx tsc -b`, `npm run build` (el aviso de bloques > 500 kB es conocido) y prueba en el navegador. El lint es `npm run lint` (oxlint; no hay ESLint).

## Mapa del código

| Módulo (ruta) | Página → componente principal | Datos (API) |
|---|---|---|
| Dashboard (`dashboard`) | `ProjectDashboard` | B7 resumen |
| Inventario (`mapa`) | `InventoryPage` + `TreeSheet` | B1, B2 |
| Riesgo Arbóreo (`inspeccion`) | `RiskPage` → `DiagnosisModule` | B18 diagnósticos |
| Infraestructura (`infraestructura`) | `InfrastructurePage` → `InfrastructureModule` + `InfraSheet` (en la rama de arriba) | B8 |
| Mantención / OT de inspección | `MaintenancePage`, `InspectionOrdersPage`, `InspectionFormPage` | B3, B16, borradores |
| Incidencias, Conecta, Indicadores | `IncidentsPage`, `ConectaPage`, `IndicesPage` | B9, Conecta, B19 |

- Pantallas con mapa: `TerritorialModule` (lugar y resumen a la izquierda, leyenda abajo, ficha a la derecha) + `ProjectMapView` (ArcGIS, solo representa).
- Estilos por módulo en `src/styles/*.css`, importados en `src/main.tsx`. Tokens y tema claro/oscuro en `global.css` y `shell.css` (`data-theme`).
- Navegación (grupos Dashboard, Inventario, Operación, Ciudadanía): `src/lib/navigation.ts` (CC-072).
- Clientes de la API: `src/api/*.ts`; tipos: `src/types/*.ts`.

## Personas y decisiones

- **Valej**: metodología, evaluación y medidas; aprueba los cambios de diseño de los módulos técnicos.
- **Mari**: Valpo Verde Conecta y fichas públicas.
- Las decisiones metodológicas se registran como CC en el backend (`docs/registro-cambios.md`). Nunca se inventa un dato, un endpoint ni una regla.

## Qué leer y cuándo

| Necesito… | Leer (solo la sección indicada) |
|---|---|
| Reglas de trabajo del frontend | `CLAUDE.md` (ya cargado) |
| Estado del backend, bases de datos, migraciones | `../valpo-verde-backend/docs/ESTADO.md` (rama `feature/fase6-backend-api`) |
| Historia de un módulo o fase | `docs/frontend-architecture.md` — buscar el título con `grep -n "^### " docs/frontend-architecture.md` y leer solo esa sección |
| Endpoints que consume el frontend | `docs/frontend-architecture.md` §7 |
| Contrato de un endpoint | `src/routes/` y el `README.md` del backend, § «Contrato para frontend» |
| Significado de un campo o catálogo | Backend `docs/methodology/00-index.md`; manda el Excel |
| Una regla vigente (PR-xxx) | Backend `docs/ESTADO.md` § «Cómo leer project-rules» (no cargar el archivo entero) |
