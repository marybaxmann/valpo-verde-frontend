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

---

## 3. Routing y guards (`src/App.tsx`)

```
/                              RootRoute — resuelve destino según sesión/perfil/rol
/admin/projects                ProjectsList (crear proyecto visible solo si profile.role === "admin")
/admin/projects/:projectId     ProjectDetail (+ sección de miembros si es admin)
/usuario/projects              ProjectsList (sin creación)
/usuario/projects/:projectId   ProjectDetail
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

---

## 5. Limitaciones conocidas

- **No existe ningún endpoint para listar usuarios municipales disponibles** (`GET /api/users` o equivalente no existe en el backend — confirmado contra `valpo-verde-backend/src/routes/index.ts`, que solo monta `/auth` y `/projects`). Por eso, "Agregar miembro" en F7 pide el `user_id` (UUID) directamente en un campo de texto — es una **interfaz provisional**: cuando ese endpoint exista, se reemplaza por un selector real de usuarios.
- **No existe `DELETE /api/projects/:id`.** El proyecto de prueba creado en F6 ("QA F6 - Proyecto de prueba frontend", `bfd3dc89-c140-43f5-bbc6-3ea9c8ed1195") no pudo eliminarse por ningún medio soportado y permanece en el entorno de desarrollo/pruebas, claramente identificado como dato de QA.
- **El POST de creación de membresía no devuelve el nombre del usuario** (solo las columnas de `project_members`, sin el join a `user_profiles` que sí trae el GET) — no afecta la UI hoy porque se recarga la lista completa tras cada cambio.
- **Sidebar con navegación mínima:** solo el ítem "Proyectos" existe en ambos roles — no hay enlaces a Inventario/Dashboard/etc. porque esas rutas no existen todavía.
- **Sin framework de tests para frontend** — decisión diferida, no tomada todavía (igual estado que tuvo el backend hasta que se resolvió en su propia fase F1).

## 6. Pendiente / no implementado

Árboles, inventario, mapa SIG, dashboard real, inspección técnica,
infraestructura, priorización, mantención, incidencias, indicadores.
Ninguno de estos módulos tiene endpoints en el backend todavía
(`valpo-verde-backend/src/routes/index.ts` los deja comentados como
"próximas rutas, no implementadas aún") — el frontend no puede
construirlos sin inventar un contrato que no existe.

## 7. Endpoints consumidos hoy (7/7 de los disponibles)

| Endpoint | Consumido desde |
|---|---|
| `GET /api/auth/me` | `src/hooks/useAuth.tsx` (F4) |
| `GET /api/projects` | `src/api/projects.ts` (F6) |
| `POST /api/projects` | `src/api/projects.ts` (F6) |
| `GET /api/projects/:id` | `src/api/projects.ts` (F6) |
| `GET /api/projects/:id/members` | `src/api/projectMembers.ts` (F7) |
| `POST /api/projects/:id/members` | `src/api/projectMembers.ts` (F7) |
| `DELETE /api/projects/:id/members/:userId` | `src/api/projectMembers.ts` (F7) |

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
