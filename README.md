# valpo-verde-frontend

Frontend productivo del sistema de gestión del arbolado urbano de Valparaíso.

**Este es el repositorio productivo.** El repositorio
`marybaxmann/Valpo-Verde-Conecta` es únicamente una referencia visual/UX
(prototipo navegable con datos mock) y **no se convierte en este
repositorio ni en producción** — solo se portan de ahí componentes
visuales puntuales, evaluados caso a caso.

## Stack

React 19 + TypeScript + Vite 8 + react-router-dom 7. CSS propio (sin
Tailwind), reutilizado del prototipo (`src/styles/global.css`). Cliente
de Supabase: `@supabase/supabase-js`. Linter: `oxlint` (incluido por el
scaffold de Vite). Sin librerías de estado/fetching adicionales (sin
Redux, Zustand, React Query ni Axios).

## Relación con el backend

`valpo-verde-backend` (repositorio separado) es la API REST y la fuente
de verdad de reglas de negocio y cálculos. Frontend y backend son
proyectos independientes, con despliegue y configuración propios.

### Contrato de seguridad (fijado en el backend — PR-018 v2.0 / ADR-014)

- Este frontend obtiene su sesión directamente de Supabase Auth y usa
  únicamente la clave pública `anon`/publishable — **nunca**
  `SUPABASE_SERVICE_ROLE_KEY`, que es exclusiva del backend.
- Solo las variables de entorno prefijadas con `VITE_` se exponen al
  bundle del navegador (ver `.env.example`); cualquier secreto real no
  debe llevar ese prefijo ni vivir en este repositorio.
- Este frontend envía `Authorization: Bearer <JWT>` al backend en cada
  request autenticada (`src/api/client.ts`).
- El backend decide identidad y permisos (`GET /api/auth/me`,
  autorización por rol/membership) — este frontend nunca decide
  seguridad, solo adapta la UI según lo que el backend confirme.

Detalle completo de arquitectura, fases y decisiones técnicas en
[`docs/frontend-architecture.md`](docs/frontend-architecture.md).
Versión narrativa orientada a tesis en
[`docs/thesis-frontend-development.md`](docs/thesis-frontend-development.md).

## Estructura

```
src/
├── main.tsx                     entrypoint (React + BrowserRouter + AuthProvider)
├── App.tsx                       routing protegido por sesión + rol real
├── lib/supabase.ts                cliente único de Supabase (anon key)
├── hooks/useAuth.tsx                sesión + perfil real (GET /api/auth/me)
├── api/
│   ├── client.ts                     cliente HTTP con Authorization: Bearer <JWT>
│   ├── projects.ts                    listProjects / getProject / createProject
│   └── projectMembers.ts               listProjectMembers / addProjectMember / removeProjectMember
├── types/
│   ├── authProfile.ts                   AuthProfile, KnownRole
│   ├── project.ts                        Project, CreateProjectInput
│   └── projectMember.ts                   ProjectMember, AddProjectMemberInput
├── layouts/                                AdminLayout, UserLayout (shells por rol)
├── pages/
│   ├── Login.tsx                             formulario real (email/password)
│   ├── ProjectsList.tsx                       listado + creación (solo admin)
│   ├── ProjectDetail.tsx                       detalle de proyecto
│   └── ProjectMembersSection.tsx                gestión de miembros (solo admin)
├── components/                                    UI reutilizable (Badge, Sidebar, Modal, etc.)
└── styles/global.css                                estilos globales (portado del prototipo)
```

## Estado actual

**F0 a F6 committeados; F7 implementada y validada, pendiente de
aprobación final para commit.** Resumen:

| Fase | Qué agrega |
|---|---|
| F0 | Base visual mínima (React + CSS + componentes portados) |
| F1 | Base estructural (rama `main`, convenciones, `.env.example`) |
| F2 | Autenticación real (Supabase Auth: login/logout/sesión) |
| F3 | Cliente API con `Authorization: Bearer <JWT>` |
| F4 | Perfil real vía `GET /api/auth/me` |
| F5 | Routing protegido por sesión + rol real |
| F6 | Gestión de proyectos (`GET/POST /api/projects`, detalle) |
| F7 | Gestión de miembros de proyecto (admin-only) |
| SIG-1 | Mapa de inventario de árboles por proyecto (ArcGIS, solo lectura) — en revisión, sin commit |

Detalle completo (objetivo, archivos, decisiones, validaciones y
endpoints por fase) en
[`docs/frontend-architecture.md`](docs/frontend-architecture.md).

## Variables de entorno

Ver `.env.example`. `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se
consumen en `src/lib/supabase.ts`; `VITE_API_BASE_URL` en
`src/api/client.ts`. `VITE_ARCGIS_API_KEY` (SIG-1) en `src/lib/arcgis.ts`:
API key de aplicación pública de ArcGIS Location Platform (solo Basemap
Styles, restringida por origen); Vite la incorpora al bundle, pero el
valor real nunca se versiona. Si falta, el mapa muestra un error
controlado. El `.env` local con valores reales del proyecto de
desarrollo/pruebas está gitignored y nunca se commitea.

## Próximas fases

F8 en adelante todavía no tiene alcance definido en detalle — ver
`docs/frontend-architecture.md` § Roadmap para lo que sí se sabe hoy
(y lo que depende de módulos que el backend aún no implementa).

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar con los valores del proyecto Supabase de desarrollo/pruebas
npm run dev
```

```bash
npm run build
npm run lint
```
