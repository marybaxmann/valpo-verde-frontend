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
├── main.tsx              entrypoint (React + BrowserRouter)
├── App.tsx                vitrina visual mínima (F0) — sin routing productivo
├── styles/                 estilos globales (global.css, portado del prototipo)
├── components/              UI reutilizable (Badge, BarRow, Icons, Modal, etc.)
├── layouts/                  shells de navegación (AdminLayout, UserLayout)
└── pages/                     páginas/rutas (hoy solo Login.tsx, como esqueleto)
```

### Convención prevista (carpetas que se crearán cuando tengan contenido real)

No se crean carpetas vacías solo para reservar el nombre — se crean en
F2/F3 junto con su primer archivo real:

- `src/api/` — cliente HTTP y módulos por recurso (F3)
- `src/hooks/` — hooks de React (ej. `useAuth`, desde F2)
- `src/lib/` — clientes externos/configuración (ej. cliente de Supabase, F2)
- `src/types/` — tipos compartidos del frontend (DTOs del backend, desde F3)

## Estado actual

- **F0 — completada.** Base visual mínima: React arranca, el CSS carga y
  los componentes portados desde el prototipo compilan y renderizan. Sin
  Supabase, sin auth, sin cliente API, sin routing productivo.
- **F1 — en curso.** Base estructural: rama `main`, convenciones de
  carpetas documentadas, `.env.example` con el contrato de variables
  públicas, linter verificado.

Deliberadamente NO implementado todavía: Supabase Auth, login real, JWT,
cliente API, `GET /api/auth/me`, guards de rol, routing productivo,
proyectos, memberships, cualquier integración con el backend.

## Variables de entorno

Ver `.env.example`. Ninguna de las variables ahí listadas se consume
todavía en el código — se usarán a partir de F2/F3.

## Próximas fases

- **F2** — Supabase Auth real (login, sesión, logout)
- **F3** — Cliente API (`src/api/`) con `Authorization: Bearer <JWT>`
- **F4** — Consumo de `GET /api/auth/me`
- **F5** — Guards de rol y routing productivo
- **F6** — Proyectos (`GET/POST /api/projects`)
- **F7** — Memberships (`GET/POST/DELETE /api/projects/:id/members`)

## Desarrollo local

```bash
npm install
npm run dev
```

```bash
npm run build
npm run lint
```
