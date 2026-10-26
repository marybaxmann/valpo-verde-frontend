# Borrador CC (sin número) — D4: los cuatro roles en la navegación

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 (borrador) |
| Origen | Diferencia entre la maqueta (CC-022: dos roles) y el modelo vigente (CC-026, CC-032). |
| Tipo | UX / navegación por rol (no cambia permisos) |
| Estado | APROBADO METODOLÓGICAMENTE dentro de **CC-059**, puntos 5 y 6 (2026-10-26, backend `wip/cc057-frontend`, `57c4a7e`) |
| Reglas relacionadas | PR-003 v8.0, PR-004 v7.0, PR-019 v1.2, PR-020 v1.1, PR-016 v6.0 «Roles» |
| Versión anterior | El frontend reconoce `admin` → `/admin` y `usuario_municipal` → `/usuario`. Cualquier otro rol, incluidos `inspector` y `encargado_mantencion`, ve «Rol no reconocido». |

## Problema

Los cuatro roles existen en la base y en el backend de la Fase 6
(identificadores de CC-032), y varios endpoints de la Fase 6 son solo para el
Inspector (transiciones de OT de Inspección, borrador, fotos, especies). Si
un Inspector inicia sesión, hoy no puede entrar. La maqueta no resuelve esto:
solo dibuja `admin` y `municipal`.

## Qué puede hacer cada rol, según lo vigente (resumen)

| Módulo | Administrador | Usuario municipal | Inspector | Encargado de mantención |
|---|---|---|---|---|
| Proyectos, ficha | Crea, edita, sector | Consulta su proyecto | Consulta su proyecto | Consulta su proyecto |
| Miembros | Gestiona | — | — | — |
| Dashboard, Índices | Consulta | Consulta | Consulta (a confirmar) | Consulta (a confirmar) |
| Inventario | Consulta | Consulta + alta mínima | Consulta; registra datos técnicos vía OT | Consulta (a confirmar) |
| Inspección y Riesgo | Consulta | Consulta | Inspecciones de sus OT, ajustes justificados | — (a confirmar) |
| Infraestructura | Consulta | Consulta | Registra vía inspección | — (a confirmar) |
| Mantención (OT) | Consulta | Crea, programa responsable, completa/cancela | Sus OT de Inspección; revisa mantenimiento | Sus OT de Mantenimiento |
| Incidencias | Consulta | Reporta y gestiona | Consulta (a confirmar) | Consulta (a confirmar) |

«(a confirmar)»: PR-019 y PR-020 dicen qué registran, pero no qué pueden
**ver** fuera de sus OT. Eso lo decide la autora o el backend, no el frontend.

## Opciones

**A. Dejar Inspector y Encargado para el Paso 5 (recomendada para el Paso 2).**
En el Paso 2 la navegación nueva se implementa para `admin` y
`usuario_municipal`, con la misma estructura de rutas. El mensaje para los
otros dos roles cambia de «Rol no reconocido» a uno claro: «Tu rol
(Inspector) todavía no tiene interfaz en SIVU». Cuando el backend tenga sus
endpoints de lectura (listar mis OT, ver árbol), se agregan sus rutas con este
mismo CC como base.

**B. Implementar ya las cuatro entradas.** Rutas `/inspector/...` y
`/mantencion/...` con la navegación filtrada por la tabla de arriba. Hoy
quedarían casi vacías: no hay endpoint para que el Inspector liste sus OT.

**C. Una sola ruta para todos los roles** (por ejemplo `/app/projects/...`) y
la navegación filtrada por rol. Simplifica a futuro, pero cambia rutas
existentes: fuera del alcance «mismas rutas» de la Fase 7.

## Versión nueva propuesta (opción A)

1. La navegación muestra a cada rol solo los módulos y acciones que le
   permiten las reglas vigentes; la tabla de arriba es la referencia y la
   seguridad la sigue decidiendo el backend.
2. En esta fase solo `admin` y `usuario_municipal` tienen interfaz;
   `inspector` y `encargado_mantencion` reciben un mensaje que nombra su rol y
   explica que su interfaz está pendiente. Nunca un shell operativo prestado
   de otro rol.
3. Las acciones de la maqueta (`nav.ts` › `ACTIONS`) no se usan: el Usuario
   municipal **no** recibe «Nueva evaluación de riesgo» ni «Nueva evaluación
   de infraestructura» (PR-003 v8.0).

## Decisión relacionada que no resuelve este CC

El frontend actual (demo) sí deja al Usuario municipal registrar
evaluaciones de riesgo e infraestructura y editar datos técnicos del árbol,
con la API de la demo. Eso contradice PR-003 v8.0, pero quitarlo choca con la
regla de la Fase 7 «conservar funciones y permisos actuales». Necesita una
decisión aparte (ver resumen del Paso 0).

## Archivos afectados

Frontend: `src/App.tsx` (`RootRoute`), `src/types/authProfile.ts`
(`KnownRole`), `src/layouts/`. Backend: `docs/registro-cambios.md`.

## Impacto

Ninguno en permisos del backend. Solo navegación.
