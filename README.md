# valpo-verde-frontend

Frontend productivo del sistema de gestión del arbolado urbano de Valparaíso.

**Este es el repositorio productivo.** El repositorio
`marybaxmann/Valpo-Verde-Conecta` es únicamente una referencia visual/UX
(prototipo navegable con datos mock) y **no se convierte en este
repositorio ni en producción** — solo se portan de ahí componentes
visuales puntuales, evaluados caso a caso.

## Stack

React + TypeScript + Vite + react-router-dom. CSS propio (sin Tailwind),
reutilizado del prototipo (`src/styles/global.css`). Linter: `oxlint`
(incluido por el scaffold de Vite).

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
- A partir de F3, este frontend enviará `Authorization: Bearer <JWT>` al
  backend en cada request.
- El backend decide identidad y permisos (`GET /api/auth/me`,
  autorización por rol/membership) — este frontend nunca decide
  seguridad, solo adapta la UI según lo que el backend confirme.

## Estructura

```
src/
├── main.tsx           entrypoint (React + BrowserRouter + AuthProvider)
├── App.tsx              loading -> Login -> shell autenticado temporal (sin rol/routing aún)
├── lib/supabase.ts        cliente único de Supabase (anon key)
├── hooks/useAuth.tsx        AuthProvider + useAuth (sesión real, sin rol todavía)
├── styles/                    estilos globales (global.css, portado del prototipo)
├── components/                  UI reutilizable (Badge, BarRow, Icons, Modal, etc.)
├── layouts/                      shells de navegación (AdminLayout, UserLayout — pendientes de F5)
└── pages/Login.tsx                 formulario real (email/password vía Supabase Auth)
```

### Convención prevista (carpetas que se crearán cuando tengan contenido real)

- `src/api/` — cliente HTTP y módulos por recurso (F3)
- `src/types/` — tipos compartidos del frontend (DTOs del backend, desde F3)

## Estado actual

- **F0 — completada.** Base visual mínima.
- **F1 — completada.** Base estructural: rama `main`, convenciones de
  carpetas documentadas, `.env.example`, linter verificado.
- **F2 — completada.** Autenticación real vía Supabase Auth: cliente
  único (`src/lib/supabase.ts`), `AuthProvider`/`useAuth`
  (`src/hooks/useAuth.tsx`) con `getSession()` +
  `onAuthStateChange()`, login real con email/contraseña
  (`signInWithPassword`), logout real (`signOut`). Sesión administrada
  íntegramente por `supabase-js` (sin `localStorage` propio, sin JWT
  logueado). Todavía **sin** rol resuelto, sin cliente API, sin guards,
  sin routing productivo — la vista autenticada es un placeholder
  temporal solo para confirmar que la sesión real funciona.

Deliberadamente NO implementado todavía: cliente API REST,
`GET /api/auth/me`, guards de rol, routing productivo, proyectos,
memberships, cualquier integración con el backend, `service_role` en
frontend.

## Variables de entorno

Ver `.env.example`. Desde F2, `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` se consumen en `src/lib/supabase.ts`.
`VITE_API_BASE_URL` sigue sin usarse hasta F3. El `.env` local con
valores reales del proyecto de desarrollo/pruebas está gitignored y
nunca se commitea.

## Próximas fases

- **F3** — Cliente API (`src/api/`) con `Authorization: Bearer <JWT>`
- **F4** — Consumo de `GET /api/auth/me`
- **F5** — Guards de rol y routing productivo
- **F6** — Proyectos (`GET/POST /api/projects`)
- **F7** — Memberships (`GET/POST/DELETE /api/projects/:id/members`)

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
