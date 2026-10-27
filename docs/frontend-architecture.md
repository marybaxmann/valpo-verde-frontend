# Arquitectura y bitácora de desarrollo — valpo-verde-frontend

## Propósito de este documento

Documento técnico persistente para continuidad de desarrollo y
trazabilidad. Describe la arquitectura actual del frontend, el registro
fase por fase (F0-F7) de lo implementado, las decisiones técnicas
tomadas, las validaciones realizadas y los endpoints consumidos.

Fuentes usadas para redactarlo: `git log` real de este repositorio
(hashes y fechas citados tal como aparecen), el código fuente actual, y
los reportes de validación producidos al cierre de cada fase durante su
implementación. No contiene información inventada ni funcionalidades
futuras descritas como si ya existieran.

Para una explicación no técnica de este mismo contenido, ver
[`thesis-frontend-development.md`](thesis-frontend-development.md).

---

## 1. Arquitectura actual

```
Frontend React (Vite)
  → Supabase Auth (signInWithPassword / getSession / onAuthStateChange)
  → access_token (JWT), administrado por supabase-js, nunca por código propio
  → Authorization: Bearer <JWT>  (src/api/client.ts, en cada request)
  → Backend Express (valpo-verde-backend, repositorio separado)
  → authorization.service.ts (assertAdmin / assertProjectAccess)
  → Supabase/PostgreSQL (createUserScopedClient + RLS como segunda capa)
```

Piezas reales, por archivo:

- **`src/lib/supabase.ts`** — único cliente de Supabase del frontend, creado con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Nunca `service_role`.
- **`src/hooks/useAuth.tsx`** — `AuthProvider`/`useAuth`. Expone `session`, `user`, `loading` (sesión de Supabase) y `profile`, `profileLoading`, `profileError` (perfil real del backend), además de `signIn`/`signOut`. La sesión la persiste y refresca `supabase-js` internamente — este hook no guarda el JWT por su cuenta ni lo expone fuera de `session`.
- **`src/api/client.ts`** — cliente HTTP mínimo (`fetch` nativo, sin Axios). En cada llamada obtiene el `access_token` vigente desde Supabase (nunca cacheado en una variable de módulo) y lo envía como `Authorization: Bearer <token>`. Maneja JSON, `204 No Content`, errores HTTP (`ApiError`, con el mensaje real del backend) y ausencia de sesión (`NoSessionError`, lanzado antes de tocar la red).
- **`src/App.tsx`** — árbol de rutas y guards (`RootRoute`, `RequireRole`) — ver §3.
- **`src/api/projects.ts`**, **`src/api/projectMembers.ts`** — capas delgadas sobre `client.ts`, una función por endpoint, sin lógica HTTP propia.

El backend sigue siendo la autoridad real de autorización (dos capas:
`authorization.service.ts` + RLS en Postgres). Todo lo que hace este
frontend en materia de roles/rutas es control de navegación y UX — no
una frontera de seguridad.

---

## 2. Roles

Identificadores reales (backend, `roles.nombre` / `profile.role`):

- `admin`
- `usuario_municipal`

El frontend los reconoce a través de `KnownRole` (`src/types/authProfile.ts`),
que es solo el vocabulario que el *routing* de esta fase sabe interpretar
— no una afirmación de que el backend valide esa unión (`AuthProfile.role`
se mantiene tipado `string | null`, igual que el backend).

El rol se resuelve **siempre** desde `profile.role`, obtenido de
`GET /api/auth/me`. Nunca desde `sessionStorage`, nunca inferido por
email, nunca hardcodeado.

> **Modelo de roles aprobado (CC-026, 2026-10-18; backend ADR-006 v2.0):**
> Administrador, Usuario municipal, **Inspector** y **Encargado de
> mantención**. El Usuario municipal da de alta el árbol solo con
> nombre y ubicación y no registra datos técnicos; el Inspector
> registra los datos técnicos e inspecciones y revisa el mantenimiento
> cuando la OT lo requiere; el Encargado de mantención registra la
> ejecución. El frontend sigue reconociendo solo `admin` y
> `usuario_municipal`: los identificadores de los roles nuevos están
> pendientes en el backend y su implementación no está autorizada
> todavía (PR-003 v7.0, PR-019 v1.0, PR-020 v1.0).

---

## 3. Routing y guards (`src/App.tsx`)

```
/                              RootRoute — resuelve destino según sesión/perfil/rol
/admin/projects                ProjectsList (crear proyecto visible solo si profile.role === "admin")
/admin/projects/:projectId     ProjectDetail (+ sección de miembros si es admin)
/usuario/projects              ProjectsList (sin creación)
/usuario/projects/:projectId   ProjectDetail
/admin|usuario/projects/:projectId/mapa   ProjectInventoryMap (SIG-1, carga diferida)
```

- **`RootRoute`** — único lugar que decide "a dónde va este usuario": sin sesión → `Login`; perfil cargando → estado de carga; error de perfil → mensaje controlado; `role === "admin"` → `/admin`; `role === "usuario_municipal"` → `/usuario`; cualquier otro valor (incluido `null`) → mensaje controlado de "rol no reconocido", **nunca** un shell operativo ni un fallback a admin.
- **`RequireRole`** — layout-route que exige sesión + perfil + `profile.role === role`; si no se cumple, redirige a `/` (que resuelve el destino correcto) en vez de mostrar el shell equivocado.

---

## 4. Bitácora de fases

### F0 — Base visual mínima
**Commit:** `830eeef` "chore: initialize production frontend foundation" (junto con F1).
**Objetivo:** demostrar que React arranca, el CSS carga y los componentes portados del prototipo compilan.
**Archivos:** scaffold Vite+React+TS, `src/styles/global.css` y 11 componentes portados desde `Valpo-Verde-Conecta` (Badge, BarRow, Icons, MapPlaceholder, Modal, Placeholder, Sidebar, StatCard, Tabs, Topbar, WizardShell), `App.tsx` como vitrina.
**Decisiones:** versiones actuales de React/Vite/TS elegidas por el scaffold oficial de Vite; ningún dato de `mock/data.ts` del prototipo se copió.
**Validación:** build/tsc/lint limpios; render manual verificado en navegador (sin backend involucrado — no aplica aún).

### F1 — Base estructural
**Commit:** `830eeef` (mismo commit que F0).
**Objetivo:** cerrar la base del repo antes de implementar autenticación.
**Archivos:** rama renombrada a `main`; `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`); convención de carpetas documentada en README.
**Decisiones:** no crear `src/api/`, `src/hooks/`, `src/lib/`, `src/types/` vacías — se crean en fases posteriores junto con su primer archivo real.
**Validación:** build/tsc/lint limpios; sin backend involucrado.

### F2 — Autenticación real (Supabase Auth)
**Commit:** `ad31af5` "feat: add Supabase authentication" (18-09-2026).
**Objetivo:** login/logout reales contra Supabase Auth.
**Archivos:** `src/lib/supabase.ts`, `src/hooks/useAuth.tsx` (`AuthProvider` con `getSession`/`onAuthStateChange`), `src/pages/Login.tsx` (formulario real, reemplaza los botones simulados del prototipo).
**Decisiones:** sesión administrada íntegramente por `supabase-js`, sin `localStorage` propio; JWT nunca logueado.
**Validación (contra Supabase real, proyecto `valpo-verde-conecta`):** casos A-G con dos usuarios QA creados vía Admin API (uno `admin`, uno `usuario_municipal`) — credenciales inválidas rechazadas (400 real), login válido de ambos roles, sesión persistente tras refresh, logout limpio, sin fallback a mocks.

### F3 — Cliente API autenticado
**Commit:** `6e1b434` "feat: add authenticated API client" (21-09-2026).
**Objetivo:** capa HTTP real hacia el backend con JWT de Supabase.
**Archivos:** `src/api/client.ts` (`ApiError`, `NoSessionError`, `api.get/post/delete`).
**Decisiones:** `fetch` nativo (sin Axios); el `access_token` se obtiene en cada llamada, nunca cacheado.
**Validación (contra backend real en `localhost:3000`):** `GET /api/auth/me` → 200 real con `Authorization: Bearer` correcto, confirmado además vía `performance.getEntriesByType('navigation')`/network log; sin errores CORS; `NoSessionError` confirmado sin sesión (sin llamada de red). Verificación temporal se hizo con un hook de depuración (`window.__api`) en `main.tsx`, retirado al terminar la prueba.

### F4 — Perfil real (`GET /api/auth/me`)
**Commit:** `4dfac64` "feat: load authenticated user profile" (21-09-2026).
**Objetivo:** integrar el perfil real del backend al estado de autenticación.
**Archivos:** `src/types/authProfile.ts` (`AuthProfile`, campos exactos del backend: `id`, `email`, `nombre`, `role`, `activo`), `src/hooks/useAuth.tsx` extendido con `profile`/`profileLoading`/`profileError`.
**Decisiones:** el efecto de perfil depende de `sessionUserId` (no del objeto `session` completo) para no repetir la llamada en cada refresco silencioso del token; `profile`/`profileLoading`/`profileError` se limpian de inmediato al cambiar de sesión.
**Validación (contra backend + Supabase reales):** casos A-E con los dos usuarios QA — `role` correcto para cada uno, refresh recupera sesión y perfil, logout limpia el perfil, sin sesión no se llama el endpoint. Revisión posterior confirmó que el `cancelled`-flag ya prevenía una condición de carrera (respuesta tardía de un usuario anterior pisando el estado del actual) — no se encontró ningún caso real de ese problema.

### F5 — Routing protegido por rol
**Commit:** `bc6cb8d` "feat: add role-based protected routing" (21-09-2026).
**Objetivo:** rutas `/admin` y `/usuario` protegidas por sesión + `profile.role` real.
**Archivos:** `App.tsx` reescrito (`RootRoute`, `RequireRole`), `AdminLayout`/`UserLayout` adaptados a `<Outlet/>` y `useAuth()` propio.
**Decisiones:** `/` como único resolutor de destino (los guards de rol nunca deciden a dónde mandar, solo rebotan a `/`); rol `null`/desconocido nunca cae a un shell operativo.
**Validación (contra backend + Supabase reales):** casos A-G — admin y municipal terminan en su shell correcto desde `/`, no pueden quedarse en la ruta del otro rol, refresh mantiene el shell correcto, logout limpio, rol no reconocido verificado a nivel de código (sin fallback a admin).

### F6 — Gestión de proyectos
**Commit:** `6b32034` "feat: add project management" (21-09-2026).
**Objetivo:** listado, detalle y creación de proyectos reales.
**Archivos:** `src/types/project.ts`, `src/api/projects.ts`, `src/pages/ProjectsList.tsx`, `src/pages/ProjectDetail.tsx`; ítem "Proyectos" agregado a los Sidebar de ambos layouts; `src/pages/RoleHome.tsx` (placeholder de F5) eliminado por quedar superado.
**Decisiones:** `ProjectsList`/`ProjectDetail` compartidos entre ambos roles — la diferencia de UI (botón "Crear proyecto") se decide leyendo `profile.role` real dentro del propio componente, no por la ruta que lo montó.
**Validación (contra backend + Supabase reales):** casos A-H — admin lista/crea/ve detalle (201/200 reales), municipal lista solo sus proyectos (scoping real del backend, no del frontend), municipal sin acceso a un proyecto real recibe 403 real mostrado como error controlado, refresh y logout correctos.

**Bug real encontrado y corregido durante la validación (caso G):** un hard-reload directo en una ruta profunda (`/admin/projects/:id`) colapsaba silenciosamente al listado, perdiendo el `projectId`. Causa raíz en `src/hooks/useAuth.tsx`: `profileLoading` arrancaba en `useState(false)`. En el render donde `session` se resuelve, hay una ventana de un render donde `sessionUserId` ya es real pero el efecto que dispara `GET /api/auth/me` todavía no corrió — en ese instante `profile` es `null` **y** `profileLoading` también es `false` (su valor inicial obsoleto). `RequireRole` interpretaba eso como "el rol no coincide" y redirigía a `/`, perdiendo el path profundo. El bug ya existía desde F4/F5 pero era invisible: en F5 la única ruta protegida era el índice, así que el redirect incorrecto terminaba en el mismo destino final; F6 lo hizo visible al agregar sub-rutas reales bajo `/admin` y `/usuario`. **Corrección:** `useState(true)` en vez de `useState(false)` para `profileLoading` — cierra exactamente esa ventana, sin tocar `RequireRole`/`RootRoute` ni agregar estado nuevo. Verificado en vivo antes y después del fix (deep-link se mantenía tras el fix, se perdía antes).

### F7 — Gestión de miembros de proyecto
**Estado:** implementada y validada; **no committeada todavía** (pendiente de aprobación).
**Objetivo:** listar, agregar y eliminar miembros de un proyecto — admin-only.
**Archivos:** `src/types/projectMember.ts` (`ProjectMember`, campos exactos incluido el join `user: { nombre }`), `src/api/projectMembers.ts`, `src/pages/ProjectMembersSection.tsx`, integrada en `ProjectDetail.tsx` solo si `profile.role === "admin"`.
**Decisiones:** ver §5 (limitaciones) — campo `user_id` crudo para agregar miembro, documentado como interfaz provisional.
**Validación (contra backend + Supabase reales):** casos A-I — listado real, alta real (201), duplicado real (409, "El usuario ya es miembro de este proyecto"), baja real (204), sección ausente del DOM para municipal (ni se llama el endpoint), **llamada manual al endpoint desde la consola del navegador con el JWT real de un usuario municipal confirmó 403 ("Requiere rol administrador") independientemente de que el frontend oculte los controles**, proyecto no permitido con error controlado, refresh recupera proyecto + miembros, logout sin residuos. Membresía QA usada para las pruebas fue eliminada al cierre; confirmado por consulta SQL de solo lectura que quedaron 0 miembros en el proyecto de prueba.

### SIG-1 — Mapa de inventario de árboles por proyecto
**Estado:** implementada; **no committeada todavía** (pendiente de revisión). Rama `feature/sig-1-mapa-inventario`.
**Objetivo:** primer mapa funcional de inventario (ADR-015, PR-015 v2.0, ADR-010 v2.0), de solo lectura.
**Archivos:** `src/lib/arcgis.ts` (lectura de `VITE_ARCGIS_API_KEY` sin importar el SDK, basemap y encuadre por defecto), `src/types/tree.ts`, `src/api/trees.ts` (`GET /api/projects/:id/trees`), `src/pages/ProjectInventoryMap.tsx`, `src/components/InventoryMapView.tsx`, ruta `projects/:projectId/mapa` en `App.tsx`, botón en `ProjectDetail.tsx`, estilos en `global.css`. Dependencia nueva: `@arcgis/core`.
**Decisiones:**
- Los árboles llegan solo por el backend (GeoJSON RFC 7946); el frontend no consulta Supabase para esto ni escribe en ArcGIS.
- FeatureLayer client-side: un `Graphic` por feature, `OBJECTID` entero generado solo en el frontend, `id` (uuid) como identidad real, `spatialReference` wkid 4326. Renderer neutro (un solo símbolo, sin Arcade ni clasificación). Popup mínimo: código, nombre científico, nombre común, estado de ciclo de vida y dirección/comuna/lugar de referencia cuando existen.
- Todos los estados de ciclo de vida, sin filtros. Los árboles sin ubicación se informan con un aviso (`meta.sin_ubicacion`).
- Con puntos, el mapa se ajusta a su extensión. Sin ningún árbol con ubicación usa el encuadre visual por defecto de Valparaíso (centro `[-71.620, -33.045]`, zoom 13): no es una coordenada técnica, de levantamiento ni del proyecto.
- El SDK (`InventoryMapView`) y la página se cargan de forma diferida. Sin `VITE_ARCGIS_API_KEY` no se carga el SDK y se muestra un error controlado; el resto de la aplicación funciona. Los recursos del SDK (estilos, workers) se cargan por defecto desde el CDN de ArcGIS.

> Nota (2026-10-26): entre SIG-1 y la Fase 7 se fusionó la demo funcional (PR #9, `bf43e5e`): Dashboard, Inspección y Riesgo, Infraestructura, Mantención, Incidencias e Índices, sobre la API de la demo (`/api/projects/...`, `/api/trees/...`). Esta bitácora no la registró; las secciones §5 a §7 siguen describiendo el estado de SIG-1.

### Fase 7 · Paso 0 — Diagnóstico frente a la maqueta Lab
**Fecha:** 2026-10-26. Rama `feature/fase7-maqueta-lab` (desde `main` = `bf43e5e`). Sin cambios de código.
**Objetivo:** matriz de brecha entre la maqueta Lab (`prototype/sivu-maqueta-lab`, `6817fb2`) y el frontend productivo, exclusiones y borradores de las decisiones D1–D4.
**Archivos:** `docs/propuestas-cc/paso0-diagnostico.md`, `D1-…` a `D4-…`, `pendientes-backend.md`.
**CC asignados (backend `wip/cc057-frontend`, `57c4a7e`, aprobados el 2026-10-26):** D1 → CC-057, D2 → CC-058, D3 → CC-059 y CC-060 (más CC-061, módulo Inspección, y CC-062, Conecta dentro de CC-036), D4 → CC-059 puntos 5 y 6.
**Hallazgos principales (Paso 0):** el `.env` local apunta a la base real (no se inició sesión); el frontend lee la API de la demo y la Fase 6 (`/api/sivu`) todavía no tiene lecturas; el frontend y la maqueta dan al Usuario municipal acciones que PR-003 v8.0 ya no le permite.

### Fase 7 · Paso 1 — Material visual de SIVU Lab
**Fecha:** 2026-10-26. Commit `1249ebd` (rama `feature/fase7-maqueta-lab`, sin push).
**Objetivo:** fundaciones visuales de la maqueta (CC-057), sin tocar datos, rutas ni permisos.
**Archivos:** `index.html` (Geist / Geist Mono; título «SIVU — Gestión del arbolado urbano»), `src/styles/global.css` (valores de los tokens claro/oscuro y fondo de página; mismos nombres de variables), `src/styles/material.css` (nuevo: botones, insignias, indicadores, tarjetas, tablas, pestañas, campos, modales), `src/components/SivuLogo.tsx` (nuevo) y `src/assets/sivu-logo-*.png`, logo en `Login.tsx` y `Sidebar.tsx`.
**Decisiones:** material copiado según CC-058 (logo de la autora y valores de diseño), indicado en el commit. El tema sigue con `data-theme` en `<html>` (no el sistema de clases de la maqueta). La paleta de riesgo no cambia: los colores de riesgo usan `--classification-*`, que no se modificaron.
**Validación:** `tsc -b` y `npm run build` sin errores; `npm run lint` solo con advertencias ya existentes en `main`. Navegador (backend local contra pruebas): login en claro y oscuro; `municipal.f7` en `/usuario/projects`, en claro y oscuro, con el estado de error real (500 de la API de la demo, ver Paso 0). No probado: el error del login (requiere enviar una contraseña inválida a Supabase) y las pantallas de módulos (no hay proyectos legibles hasta el Paso 2).

### Fase 7 · Paso 2 — Barra superior y navegación agrupada
**Fecha:** 2026-10-26. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** estructura de la maqueta (CC-057) con la navegación de CC-059 y los nombres de CC-060; mismas rutas y guards.
**Archivos:** `src/components/AppTopBar.tsx` (nuevo: logotipo, proyecto actual con su menú, grupos Análisis / Operación / Territorio, buscador, tema, cuenta), `src/components/ModuleSearch.tsx` (nuevo: Ctrl K, solo módulos), `src/lib/navigation.ts` (nuevo), `src/lib/projects.ts` (etiquetas de `estado_proyecto`, CC-042), `src/styles/shell.css` (nuevo), `src/layouts/RoleLayout.tsx` reescrito; se eliminan `Sidebar.tsx` y `Topbar.tsx`. `src/types/project.ts` y `src/api/projects.ts` pasan a `GET /api/sivu/projects` y `GET /api/sivu/projects/:id` (`{ proyecto, sector }`); la ficha muestra el sector y su superficie (el modelo nuevo no tiene institución ni profesional responsable). «Inspección y Riesgo» → «Riesgo Arbóreo» e «Índices» → «Indicadores biométricos» en menú y títulos. `App.tsx`: `inspector` y `encargado_mantencion` reciben un mensaje con su rol (CC-059, punto 5).
**Decisiones de la autora (2026-10-26):** proyectos desde la API de la Fase 6; «Crear proyecto» sigue con la API de la demo hasta el Paso 5 (contra pruebas muestra el error real); buscador solo con módulos (los árboles esperan B1).
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Navegador contra pruebas (backend local con `.env.pruebas`), proyecto «QA Fase 7 — proyecto de prueba del frontend» creado con `fn_create_project_with_sector`: `municipal.f7` (lista, barra en el proyecto, menús, Ctrl K, pantalla con mapa bajo la barra, ficha con sector, claro y oscuro, pantalla angosta), `inspector.f7` (mensaje de rol; las rutas `/usuario` y `/admin` lo devuelven a él) y `admin.f7` (todos los proyectos, menú con «Miembros del proyecto»).
**Pendiente (Pasos 4 y 5):** Dashboard, módulos y miembros siguen leyendo la API de la demo, que no conoce los proyectos del modelo nuevo: muestran «Proyecto no encontrado» o ceros. Riesgo Arbóreo todavía ofrece «+ Nueva evaluación» al Usuario municipal (se quita en el Paso 4, CC-059 punto 6).

### Fase 7 · Paso 3 — Pantalla de acceso con fotografía
**Fecha:** 2026-10-26. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** diseño oficial de acceso de la maqueta (CC-057), solo correo y contraseña contra Supabase Auth.
**Archivos:** `src/pages/Login.tsx` reescrito, `src/styles/login.css` (nuevo), `src/assets/login-calle.jpg` (nuevo), ícono `pin` en `Icons.tsx`.
**Decisiones de la autora (2026-10-26):** textos de la maqueta; marcas ilustrativas con la zona en palabras simples («Tronco», «Acera», «Alcorque») en vez del formato de catálogo; fotografía recomprimida. Fuera: recuperación de contraseña, acceso a Conecta, insignia «MAQUETA».
**Fotografía:** la de la autora (CC-058), reducida de 2400 × 1800 px y 1,26 MB a 1600 × 1200 px y 524 KB (JPEG progresivo, calidad 72), guardada desde una imagen nueva: sin EXIF, GPS ni XMP (solo la cabecera JFIF).
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Navegador: vista ancha (1440 px) en claro; pantalla angosta (~800 px) en claro y oscuro; «Ingresar» con campos vacíos muestra el aviso sin llamar a Supabase. Contraseña equivocada (probada por la autora): muestra «No se pudo iniciar sesión. Revisa tu email y contraseña.».

### Fase 7 · Paso 4 (Dashboard) — composición de la maqueta con datos pendientes
**Fecha:** 2026-10-26. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** Dashboard de la maqueta (CC-057), sin mapa, solo con datos reales de la API de la Fase 6.
**Archivos:** `src/pages/ProjectDashboard.tsx` reescrito, `src/components/PendingNotice.tsx` (nuevo: estado «pendiente», sin botones inactivos), `src/styles/dashboard.css` (nuevo), `src/hooks/useCurrentProject.tsx` (expone el error real del proyecto) y `AppTopBar.tsx` («Proyecto no disponible» en vez de «Cargando…» si falla).
**Decisiones de la autora (2026-10-26):** hacerlo ahora aunque casi todo quede «pendiente»; el frontend **no cuenta ni clasifica** (los indicadores esperan el resumen B7); pedir al backend que planifique B1, B5 y B7 (`docs/propuestas-cc/mensaje-backend-paso4.md`).
**Datos reales:** estado, sector y nombre del proyecto (`GET /api/sivu/projects/:id`) y la grilla de módulos. Indicadores y paneles (riesgo, composición, operación, Agenda —antes «Próximas intervenciones», CC-037—, infraestructura) muestran qué falta. Se quitan el visor SIG y las llamadas a la API de la demo de esta pantalla.
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Navegador contra pruebas con `municipal.f7`: pantalla angosta en claro, vista ancha (1440 px) en oscuro con la misma composición que la maqueta, y proyecto sin acceso (403: solo el error real, sin paneles).

### Fase 7 · Paso 4 (Inventario) — tabla protagonista y alta municipal en la Fase 6
**Fecha:** 2026-10-26. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** Inventario de la maqueta (CC-057) y primera escritura real contra `/api/sivu`: el alta municipal mínima.
**Archivos:** `src/pages/InventoryPage.tsx` (nuevo, ruta `/mapa` sin cambios), `src/components/NewTreeModal.tsx`, `src/components/LocationPickerMap.tsx`, `src/api/treeAlta.ts`, `src/types/treeAlta.ts`, `src/styles/inventory.css` (nuevos). Se eliminan `ProjectInventoryMap.tsx`, `CreateTreeModal.tsx` (alta de la demo) y `TreeContextualPanel.tsx` (edición técnica, CC-059 punto 6). `/mapa` deja de ser pantalla de mapa a pantalla completa.
**Contrato consumido (leído de `feature/fase6-backend-api`):** `POST /api/sivu/projects/:id/trees` (solo `usuario_municipal`; `sector`, `ubicacion_descriptiva`, `utm_este`, `utm_norte` y especie o nombre común; 201 con `tree_code`; 422 fuera del sector, CC-046) y `GET /api/sivu/projects/:id/species?nombre=` (CC-053).
**Decisiones de la autora (2026-10-26):** incluir el alta ahora; marcar el punto en el mapa con la conversión EPSG:4326 → EPSG:32719 en el frontend (ADR-010 v3.0; las UTM siguen editables y se guardan las del formulario); tabla, especies y minimapa en «pendiente» hasta B1.
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Navegador contra pruebas con `municipal.f7`: alta del árbol real `AV_000007` de la autora (*Acer pseudoplatanus*, Falso plátano, Plaza Victoria; UTM 255466.61 / 6340499.86) → 201, `A-000346`, sector vinculado y `registrado_por` = el usuario; buscador de especies → 200 con catálogo vacío (se registra lo escrito, CC-053); marcador ubicado desde las UTM escritas; punto fuera del sector → 422 con el mensaje del backend y sin alta. Etiquetas de los campos asociadas para lectores de pantalla.

### Fase 7 · Capas base en los mapas
**Fecha:** 2026-10-26. Pedido de la autora.
**Qué:** selector de capa base sobre los mapas (formulario «Nuevo árbol» y módulos territoriales): **Satélite** (`arcgis/imagery/standard`, capa inicial y primera opción desde el 2026-10-27, decisión de la autora), **Mapa** (`arcgis/streets`), **Híbrido** (`arcgis/imagery`) y **Limpio** (`arcgis/light-gray`). Definidas una sola vez en `src/lib/arcgis.ts` (`BASEMAPS`) para reutilizarlas en los mapas que vengan; componente `src/components/BasemapSwitcher.tsx`. La elección se recuerda en este navegador (`localStorage`, con respaldo si no hay almacenamiento).
**Cartografía:** todas vienen del servicio Basemap Styles de ArcGIS con la API key existente y su atribución; no son imágenes descargadas ni se versionan (PR-016 v7.0). CC-057 excluye la imagen aérea fija de la maqueta, no la de ArcGIS.
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Navegador: las cuatro capas cargan con su atribución; el marcador se conserva al cambiar de capa; la elección se recuerda.

### Fase 7 · Paso 4 (Riesgo Arbóreo) — mapa protagonista, solo consulta
**Fecha:** 2026-10-27. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** pantalla Riesgo Arbóreo de la maqueta (CC-057, CC-060) con estructura común para los módulos con mapa.
**Archivos:** `src/pages/RiskPage.tsx` (ruta `/inspeccion` sin cambios), `src/components/TerritorialModule.tsx` (mapa a pantalla completa, encabezado y tarjeta flotantes; la reutilizará Infraestructura), `src/components/ProjectMapView.tsx` (mapa ArcGIS con selector de capas, zoom abajo a la izquierda), `src/styles/territory.css` (nuevos). `ModulePage` queda solo para Infraestructura hasta su paso; su rama de inspección (asistente `RiskAssessmentModal` de la demo) ya no tiene ruta.
**Decisiones de la autora (2026-10-27):** mapa protagonista con tarjeta «pendiente» (B1/B7) en vez de pantalla vacía; estructura común Riesgo/Infraestructura; pedir al backend la geometría del sector (B13). Sin «Nueva evaluación» para el Usuario municipal (CC-059 punto 6): las inspecciones son del Inspector (CC-061).
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Navegador contra pruebas con `municipal.f7`: pantalla angosta en claro (mapa bajo la barra sin desplazamiento, Territorio marcado, encabezado real, tarjeta pendiente, capas abajo) y vista ancha (1440 px) en oscuro con Satélite. Corregido: el encabezado flotante tapaba el zoom.

**Ajuste 2026-10-27:** con Satélite como capa inicial, el encabezado flotante de los módulos territoriales pasa a tener fondo de vidrio (como la tarjeta) para leerse sobre la imagen en claro y oscuro.

### Fase 7 · Paso 4 (Infraestructura) — misma estructura territorial; se retira la pantalla vieja
**Fecha:** 2026-10-27. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** Infraestructura de la maqueta (CC-057) con la estructura de Riesgo Arbóreo (`TerritorialModule`), solo consulta.
**Archivos:** `src/pages/InfrastructurePage.tsx` (nuevo, ruta `/infraestructura` sin cambios). Se eliminan la pantalla vieja `ModulePage.tsx` y lo que solo ella usaba, casi todo flujos de la demo que CC-059 (punto 6) saca del frontend nuevo: `RiskAssessmentModal`, `InfrastructureAssessmentModal` e `infrastructureFields` (catálogos escritos en el código), `TreeDetailModal`, `EditTreeModal`, `TreeModulesSummary`, `SpeciesCombobox`, `RiskComponentDiagram` y `MapPlaceholder`. Se conserva `InventoryMapView` como base para dibujar los árboles cuando exista B1.
**Decisiones de la autora (2026-10-27):** misma estructura con tarjeta «pendiente» (B8, B1); retirar la pantalla vieja y lo que queda sin uso. Leyenda y barras por componente llegarán con B8, con las categorías y etiquetas del backend.
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas; ninguna referencia a lo eliminado. Navegador contra pruebas con `municipal.f7`: mapa en Satélite bajo la barra sin desplazamiento, Territorio marcado, encabezado real, tarjeta pendiente, sin botón de registro.

### Fase 7 · Paso 4 (Mantención) — primer módulo con datos reales de lectura (B3)
**Fecha:** 2026-10-27. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** pantalla Mantención de la maqueta (CC-057) con las OT de Mantenimiento del proyecto.
**Contrato consumido (leído de `feature/fase6-backend-api`, `05ccd8d`; CC-065):** `GET /api/sivu/projects/:id/work-orders?tipo_ot=mantenimiento&estado=&limit=&offset=` → `{ data, total, limit, offset }`; cada OT con tipo, acción, subtipo, prioridad y estado como `{ codigo, etiqueta }`, fechas, árbol con ubicación (lng/lat), responsable con nombre y `acciones` calculadas por el backend.
**Archivos:** `src/pages/MaintenancePage.tsx` reescrito (calendario mensual por `fecha_accion_programada`, lista de OT sin fecha, detalle, minimapa con los árboles de las OT, filtro «Abiertas» / «Incluir completadas y canceladas» con los códigos del contrato, «Cargar más» con el total de la API), `src/api/workOrders.ts`, `src/types/workOrder.ts`, `src/styles/maintenance.css` (nuevos); `ProjectMapView` acepta puntos y selección. Se quitan el alta, el cambio de estado y el cálculo de «Vencida» de la demo.
**Decisiones de la autora (2026-10-27):** solo OT de Mantenimiento (las de Inspección van en su módulo, CC-061, que B3/B4 dejan habilitado); calendario, lista y minimapa aunque hoy estén vacíos; filtro sin conteos por estado (solo el `total` de la API).
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Backend: se levantó `origin/feature/fase6-backend-api` (`05ccd8d`) en un *worktree* temporal fuera del repositorio, con `.env.pruebas` y `MOTOR_COMMIT` = hash de ese commit (variable nueva obligatoria), sin tocar la copia local de la autora. Navegador con `municipal.f7`: B3 → 200 con 0 OT de Mantenimiento (aún no se pueden crear, #61): estado vacío real, Operación marcado; el filtro pide `estado=pendiente,programada,en_ejecucion,completada,cancelada` → 200. **No verificado con datos:** el calendario, la lista, el detalle y los puntos del minimapa con OT reales, porque no existe ninguna OT de Mantenimiento. Ajuste de la barra: en pantallas angostas el nombre del proyecto se acorta con «…».

### Fase 7 · Paso 4 (Inventario con B1) — tabla real del inventario
**Fecha:** 2026-10-27. Rama `feature/fase7-maqueta-lab`.
**Contrato consumido (leído de `origin/feature/fase6-consultas-frontend`, `0d0a837`, aún sin fusionar en `feature/fase6-backend-api`):** `GET /api/sivu/projects/:id/trees?limit=&offset=&estado_ciclo_vida=&busqueda=` → `{ data, total, limit, offset }`; por árbol: código, sector, ubicación descriptiva, UTM, `ubicacion {lng, lat}`, especie, nombre común, código del ciclo de vida y fecha de registro.
**Respuesta de la responsable (2026-10-27):** alcance funcional de B1 aprobado (identificación, especie, ubicación, ciclo de vida con código y etiqueta, DAP/multifustal/fustes/altura, riesgo efectivo calculado o ajustado, vigencia, registro), pero aún no expuesto: el frontend lo marca como «pendiente de integración» sin simularlo; paginación del backend (los mapas recorren todas las páginas); `null` de riesgo = «Sin evaluación»; etiquetas solo de contratos aprobados; PR-018 v6.0; ciclo de vida distinto de presencia.
**Archivos:** `src/pages/InventoryPage.tsx` (tabla, búsqueda, filtro por ciclo de vida con los códigos del contrato, paginación de 50, ficha lateral, minimapa con todas las páginas, recarga tras un alta), `src/api/inventory.ts`, `src/types/inventory.ts` (nuevos), `src/styles/inventory.css`. `src/lib/dates.ts`: `fechaChile` devuelve tal cual una fecha sin hora (antes mostraba el día anterior para columnas `date`, p. ej. `fecha_registro` y `fecha_creacion_ot`).
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Backend de pruebas: *worktree* temporal en `0d0a837`. Navegador con `municipal.f7`: B1 → 200, A-000346 en la tabla (1 de 1) y en el minimapa sobre Av. Pedro Montt; búsqueda «palmera» → 0 con mensaje, «plátano» → 1, «platano» → 0 (anotado para el backend); filtro `retirado` → 0; ficha con UTM y fecha correcta tras la corrección.

### Fase 7 · Paso 4 (módulo Inspección) — OT de Inspección e interfaz del Inspector
**Fecha:** 2026-10-27. Rama `feature/fase7-maqueta-lab`.
**Objetivo:** módulo Inspección (CC-061; grupo Operación, CC-059), habilitado por B3/B4 (CC-065), y la interfaz del Inspector (CC-064).
**Contratos consumidos (`feature/fase6-backend-api`, `05ccd8d`):** B3 `GET /api/sivu/projects/:id/work-orders?tipo_ot=inspeccion`; B4 `GET /api/sivu/work-orders/mine` (filtros `project_id`, `estado`); transición `PATCH /api/sivu/work-orders/:id/estado` (`programada` con `fecha_accion_programada`, `en_ejecucion`), solo para el Inspector responsable. `acciones` (`programar`, `iniciar`, `trabajar`) las calcula el backend.
**Archivos:** `src/components/WorkOrdersBoard.tsx` (tablero común: calendario, lista, detalle, minimapa y acciones habilitadas), `src/pages/InspectionOrdersPage.tsx` (ruta `/projects/:id/ot-inspeccion`, porque `/inspeccion` es Riesgo Arbóreo), `src/pages/MyOrdersPage.tsx` («Mis OT»), `src/layouts/InspectorLayout.tsx`, `src/lib/roles.ts` (nuevos); `MaintenancePage` usa el tablero común; `App.tsx` comparte las rutas de proyecto entre los tres roles y agrega `/inspector` (entrada a «Mis OT»); la barra muestra «Mis OT» al Inspector; `KnownRole` incluye `inspector`; el mensaje de rol queda solo para el Encargado de mantención (#61).
**Decisiones de la autora (2026-10-27):** módulo + Inspector con programar/iniciar en este paso; el formulario de inspección como paso propio; crear OT de Inspección espera B1, B14 y B15 (`mensaje-backend-inspeccion.md`).
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Municipal: el módulo lista las OT de Inspección (primero 0; después OT-I-000260) con el aviso de creación pendiente. Inspector: el equipo del backend probó con `inspector.f7` la OT-I-000260 (Evaluación inicial sobre A-000346): se visualiza, se inició y queda «En ejecución» con el aviso del formulario pendiente; desde la vista municipal se ve en el calendario y en el minimapa. No lo probé yo con la sesión del Inspector.

### Fase 7 · Paso 4 (Proyecto y Miembros) — ficha del proyecto en `/api/sivu`
**Fecha:** 2026-10-27. Rama `feature/fase7-maqueta-lab` (`e848c8a`, `b7ebfa7`, `06f4730` y el de verificación).
**Objetivo:** llevar la ficha del proyecto y sus miembros a la API de la Fase 6, con el estilo Lab. Incidencias (B9) e Indicadores biométricos (CC-016 sin cerrar, B10) quedan bloqueados por el backend.
**Contratos consumidos (`feature/fase6-consultas-frontend`, `0d0a837`), todos solo del Administrador:** `GET/POST /api/sivu/projects/:id/members`, `DELETE /api/sivu/projects/:id/members/:userId`, `PATCH /api/sivu/projects/:id` (solo `nombre_proyecto` y `sector.nombre_sector`; la delimitación no se edita aquí) y `PATCH /api/sivu/projects/:id/estado` (`activo`/`cerrado`, CC-042).
**Archivos:** `src/pages/ProjectMembersSection.tsx`, `src/components/ProjectEditForm.tsx` y `src/components/ProjectStateControl.tsx` (nuevos), `src/pages/ProjectDetail.tsx`, `src/api/projects.ts`, `src/api/projectMembers.ts`, `src/hooks/useCurrentProject.tsx` (`refresh()` para releer el nombre en la barra), `src/styles/project.css` (nueva), íconos `lock`/`unlock`, y en `shell.css` la barra en teléfono (bajo 560 px el proyecto pasa a una fila propia).
**Reglas aplicadas:** con el proyecto Cerrado no se ofrece editar nombres (el backend respondería 409) y los miembros se siguen gestionando; cerrar y reabrir siempre piden confirmación, con el resumen de CC-042. El `user_id` se escribe a mano (B11); la API no entrega el rol del miembro, así que no se muestra.
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Con `admin.f7` en la base de pruebas: lista (2 miembros), duplicado (409), identificador inválido (400, mensaje en palabras simples), agregar y quitar un miembro de prueba, editar y restaurar ambos nombres, cerrar y reabrir el proyecto QA (unos 30 s cerrado). Con `municipal.f7` la sección de miembros y los controles no aparecen. Proyecto inexistente: «Proyecto no encontrado». Claro, oscuro, 375 px y 1280 px. No se forzó un error del listado de miembros (el código de error es el mismo patrón de las demás pantallas).

### Fase 7 · Paso 4 (formulario de inspección) — Evaluación inicial del Inspector
**Fecha:** 2026-10-27. Rama `feature/fase7-maqueta-lab` (`d984e28`, `a647673`; publicada en `origin`).
**Objetivo:** que el Inspector complete una inspección técnica real desde la interfaz (pedido de la responsable; PR-010 v4.0), sin escribir reglas metodológicas en el frontend.
**Contratos consumidos (`feature/b16-inspection-form-schema`, `54fd44d`):** esquema `GET /api/sivu/projects/:id/inspection-form-schema?tipo=evaluacion_inicial` (B16); borrador `POST /api/sivu/work-orders/:id/inspections` y `PATCH /api/sivu/inspections/:id` (siempre el estado completo, nunca un delta); fotos `GET/POST /api/sivu/inspections/:id/photos` (multipart `foto` + `vista`); `POST /api/sivu/inspections/:id/calcular` y `POST /api/sivu/inspections/:id/finalizar {huella}` (CC-054).
**Archivos:** `src/types/inspection.ts`, `src/api/inspections.ts`, `src/lib/inspectionForm.ts` (orden por fila del Excel, condiciones de activación tal como las entrega el backend, conversión al body), `src/components/InspectionField.tsx` (control por `tipo_entrada`), `src/pages/InspectionFormPage.tsx` (ruta `/inspector/ot/:workOrderId/inspeccion`), `src/styles/inspection.css` (nueva); `client.ts` acepta `FormData`; en «Mis OT» la acción `trabajar` de una Evaluación inicial abre el formulario.
**Reglas aplicadas:** qué falta, el riesgo, las clasificaciones, la prioridad y las fechas los decide el backend en `/calcular`; el frontend solo muestra los faltantes en rojo y los códigos del resultado. Un campo oculto o vacío no se envía. Finalizar pide confirmación; un 409 (borrador cambiado) pide volver a calcular. Los nombres visibles de campos y resultados se muestran técnicos hasta B16/B18 (avisos «pendiente»). Sin B17, el borrador se recuerda solo en el navegador (`localStorage`).
**Validación:** `tsc -b`, `npm run build` y `npm run lint` sin errores ni advertencias nuevas. Con `inspector.f7` en la base de pruebas: OT-I-000260 sobre A-000346 (= AV_000007 del registro de terreno): 71 valores reales cargados, condiciones (multifustal oculta el DAP simple), borrador guardado, cuatro fotos reales subidas, `diametro_copa_eo_m` = 4,3 m entregado por la autora, cálculo sin faltantes y **inspección finalizada** (riesgo alto, prioridad media, próxima inspección 2026-11-27, próximo monitoreo 2026-11-10). Claro y oscuro, 375 px. Pendientes: B16 (etiquetas, `campos_arbol`, base sin B1), B17, B18 y completar la OT (CC-050); ver `docs/propuestas-cc/pendientes-backend.md`.

---

## 5. Limitaciones conocidas

- **No existe ningún endpoint para listar usuarios municipales disponibles** (`GET /api/users` o equivalente no existe en el backend — confirmado contra `valpo-verde-backend/src/routes/index.ts`, que solo monta `/auth` y `/projects`). Por eso, "Agregar miembro" en F7 pide el `user_id` (UUID) directamente en un campo de texto — es una **interfaz provisional**: cuando ese endpoint exista, se reemplaza por un selector real de usuarios.
- **No existe `DELETE /api/projects/:id`.** El proyecto de prueba creado en F6 ("QA F6 - Proyecto de prueba frontend", `bfd3dc89-c140-43f5-bbc6-3ea9c8ed1195") no pudo eliminarse por ningún medio soportado y permanece en el entorno de desarrollo/pruebas, claramente identificado como dato de QA.
- **El POST de creación de membresía no devuelve el nombre del usuario** (solo las columnas de `project_members`, sin el join a `user_profiles` que sí trae el GET) — no afecta la UI hoy porque se recarga la lista completa tras cada cambio.
- **Sidebar con navegación mínima:** solo el ítem "Proyectos" existe en ambos roles — no hay enlaces a Inventario/Dashboard/etc. porque esas rutas no existen todavía.
- **Sin framework de tests para frontend** — decisión diferida, no tomada todavía (igual estado que tuvo el backend hasta que se resolvió en su propia fase F1).

## 6. Pendiente / no implementado

Edición de árboles y de ubicación, filtros y capas temáticas del mapa,
dashboard real, inspección técnica, infraestructura, priorización,
mantención, incidencias, indicadores. Ninguno de estos módulos tiene
endpoints en el backend todavía — el frontend no puede construirlos sin
inventar un contrato que no existe. El mapa de inventario de solo
lectura existe desde SIG-1.

## 7. Endpoints consumidos hoy (8/8 de los disponibles)

| Endpoint | Consumido desde |
|---|---|
| `GET /api/auth/me` | `src/hooks/useAuth.tsx` (F4) |
| `GET /api/projects` | `src/api/projects.ts` (F6) |
| `POST /api/projects` | `src/api/projects.ts` (F6) |
| `GET /api/projects/:id` | `src/api/projects.ts` (F6) |
| `GET /api/sivu/projects/:id/members` | `src/api/projectMembers.ts` (Fase 7, Paso 4) |
| `POST /api/sivu/projects/:id/members` | `src/api/projectMembers.ts` (Fase 7, Paso 4) |
| `DELETE /api/sivu/projects/:id/members/:userId` | `src/api/projectMembers.ts` (Fase 7, Paso 4) |
| `PATCH /api/sivu/projects/:id` | `src/api/projects.ts` (Fase 7, Paso 4) |
| `PATCH /api/sivu/projects/:id/estado` | `src/api/projects.ts` (Fase 7, Paso 4) |
| `GET /api/projects/:id/trees` | `src/api/trees.ts` (SIG-1) |
| `GET /api/sivu/projects/:id/inspection-form-schema` | `src/api/inspections.ts` (Fase 7, formulario) |
| `POST /api/sivu/work-orders/:id/inspections` | `src/api/inspections.ts` (Fase 7, formulario) |
| `PATCH /api/sivu/inspections/:id` | `src/api/inspections.ts` (Fase 7, formulario) |
| `GET/POST /api/sivu/inspections/:id/photos` | `src/api/inspections.ts` (Fase 7, formulario) |
| `POST /api/sivu/inspections/:id/calcular` | `src/api/inspections.ts` (Fase 7, formulario) |
| `POST /api/sivu/inspections/:id/finalizar` | `src/api/inspections.ts` (Fase 7, formulario) |

## 8. Roadmap (F8 en adelante)

El alcance exacto de F8 todavía no está definido — este documento no lo
anticipa. Lo único que se sabe con certeza hoy:

- Cualquier módulo de inventario/árboles/inspección/etc. depende de que
  el backend implemente primero sus endpoints (ver §6) — no es una
  tarea que el frontend pueda adelantar por su cuenta sin inventar
  contrato.
- La interfaz provisional de "agregar miembro" (§5) se reemplaza cuando
  exista un endpoint de listado de usuarios — no antes.
- El proyecto QA de F6 sigue pendiente de una decisión sobre qué hacer
  con él (no hay forma soportada de eliminarlo hoy).
