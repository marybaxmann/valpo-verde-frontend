# Propuesta — Interfaz del Inspector y del Encargado de mantención

Fecha: 2026-10-26. Documento de trabajo del frontend (no es un CC).
**No se implementa hasta que CC-064 esté aprobado** (lo redacta el backend).
Base: resumen de la responsable del 2026-10-26, CC-059, CC-061, PR-019 v1.2,
PR-020 v1.1 y la maqueta SIVU Lab (CC-057; reutilización según CC-058).

## 1. Qué endpoints de consulta aceptan hoy a esos dos roles

Leído del código de `origin/feature/fase6-backend-api` (`dd6949b`):
`src/services/authorization.service.ts`, los servicios de cada ruta y las
políticas RLS de `database/migrations/017_rls_cc033.sql`.

**Regla general.** `assertProjectAccess` deja pasar a cualquier rol que sea
miembro del proyecto (el Administrador, siempre). Las lecturas se hacen con el
JWT del usuario, y las políticas de lectura de la 017 incluyen a
`usuario_municipal`, `inspector` y `encargado_mantencion` en `projects`,
`sectors`, `trees`, `tree_data_versions`, `work_orders`, `inspections`,
`evaluations`, `classification_adjustments`, `tree_assessments`,
`maintenance_records`, `incidents` y `photos`. La excepción es
`incident_reporters` (nombre y RUT): solo `usuario_municipal` (PR-022).

| Endpoint (GET) | Inspector / Encargado (miembros) | Comentario |
|---|---|---|
| `/api/auth/me` | Sí | Perfil y rol. |
| `/api/sivu/projects` | Sí | Solo sus proyectos (membresía + RLS). Leído del código; no probado en vivo con `inspector.f7` (hoy el frontend no le muestra la barra ni la lista). |
| `/api/sivu/projects/:id` | Sí | `assertProjectAccess`; incluye el sector. |
| `/api/sivu/projects/:id/members` | **No** | `assertAdmin`: solo Administrador. |
| `/api/sivu/projects/:id/species?nombre=` | Sí | Cualquier rol con acceso al proyecto (CC-053). |
| `/api/sivu/inspections/:id/photos` | Sí | Cualquier rol con acceso; pero sin listado de OT/inspecciones no hay cómo llegar a un `inspectionId`. |
| `/api/species`, `/api/catalogs/modules` | Sí | Solo exigen sesión. |
| Lecturas de la demo (`/api/projects/...`, `/api/trees/...`) | El servicio los dejaría pasar (`assertProjectAccess`) | **No sirven contra la base de pruebas para ningún rol**: leen columnas y tablas del modelo anterior (por ejemplo `projects.name`) y responden 500 o «Proyecto no encontrado». |

**Lo que no existe todavía para ningún rol** (ver `pendientes-backend.md`):
listado de árboles con datos vigentes (B1), ficha del árbol (B2), OT del
proyecto (B3), **OT del usuario (B4)**, próximas inspecciones (B5), resumen
del proyecto (B7), infraestructura (B8), incidencias (B9), índices (B10), y
todo el #61 (OT de Mantenimiento, registro de ejecución, revisión del
Inspector). Escrituras que sí existen para el Inspector: transición de estado
de su OT, crear y guardar el borrador, subir fotos, y (en revisión, sin
aprobar) calcular y finalizar.

**Consecuencia práctica:** hoy el Inspector y el Encargado solo podrían ver la
lista de sus proyectos y la ficha de cada uno. Todo lo demás se mostraría como
«pendiente».

## 2. Navegación propuesta (sobre CC-059)

Mismo armazón que el Usuario municipal (barra superior, proyecto junto al
logo, grupos), con módulos según el rol. Rutas nuevas con el mismo patrón que
las actuales: `/inspector/...` y `/mantencion/...`, con su `RequireRole`.

| Grupo | Inspector | Encargado de mantención |
|---|---|---|
| (entrada) | **Mis OT de Inspección** | **Mis OT de Mantenimiento** |
| Análisis | Dashboard · Indicadores biométricos (consulta) | Dashboard · Indicadores biométricos (consulta) |
| Operación | **Mis OT de Inspección** · **Revisiones de mantenimiento** · Incidencias (consulta, sin nombre ni RUT) | **Mis OT de Mantenimiento** · Incidencias (consulta, sin nombre ni RUT) |
| Territorio | Inventario · Riesgo Arbóreo · Infraestructura (consulta) | Inventario · Riesgo Arbóreo · Infraestructura (consulta) |

- El Encargado **no ve** el módulo Inspección (CC-061).
- **Entrada directa:** al iniciar sesión, cada rol llega a su espacio de
  trabajo. Propuesta: una vista **«Mis OT» de todos sus proyectos** (B4 es
  justamente «OT asignadas al usuario», sin proyecto), con un filtro por
  proyecto; al abrir una OT se entra al proyecto correspondiente. Alternativa:
  pedir primero el proyecto y luego mostrar sus OT. *(Decisión para CC-064.)*
- Consulta = mismas pantallas que el Usuario municipal **sin ningún botón de
  registro** (CC-059: nada de botones inactivos).

## 3. Diseño de las pantallas (lenguaje de la maqueta Lab)

### 3.1 «Mis OT de Inspección» (Inspector) — necesita B4

Composición de la pantalla **Mantención** de la maqueta (agenda protagonista,
lista lateral, minimapa), adaptada a las OT del Inspector:

- **Encabezado** (`phead` de la maqueta): título «Mis OT de Inspección»,
  subtítulo con el proyecto o «todos tus proyectos»; chips de resumen con
  conteos que **entrega la API** por estado (CC-050: Pendiente, Programada,
  En ejecución). Sin «Vencida» (no es un estado de CC-050).
- **Columna principal — agenda:** calendario mensual con las OT que tienen
  `fecha_accion_programada` (CC-050: la ingresa el Inspector al pasar a
  Programada). Las Pendientes no tienen fecha: van solo en la lista.
- **Columna lateral — lista:** tarjetas por OT (código, árbol o
  «Levantamiento», acción y subtipo, prioridad, estado, fecha), con filtro
  segmentado por estado (control `seg` de la maqueta). Etiquetas de catálogo
  desde la API.
- **Minimapa** con los árboles de sus OT (requiere coordenadas en B4 o B1).
- **Ficha de la OT** (hoja lateral `TreeSheet` de la maqueta, con pestañas):
  *Resumen* (datos de la OT y del árbol) · *Inspección* (borrador por tipo,
  CC-040) · *Fotos* (4 vistas, CC-049) · *Resultado* (calcular y finalizar,
  CC-054, cuando esté aprobado). Las acciones que ya tienen endpoint
  (pasar a Programada/En ejecución, guardar borrador, subir foto) aparecen
  solo cuando la OT está en el estado que las permite (CC-050).

### 3.2 «Revisiones de mantenimiento» (Inspector) — necesita el #61

Lista de ejecuciones de OT de Mantenimiento que requieren su revisión
(PR-020 v1.1: siempre en Tala y Retiro_tocón). Tarjeta con la evidencia
fotográfica y el resultado registrado por el Encargado; acciones Aprobar /
Rechazar (con motivo). Misma composición: lista + hoja lateral.

### 3.3 «Mis OT de Mantenimiento» (Encargado) — necesita el #61

Igual que 3.1 (agenda + lista + minimapa), con sus OT de Mantenimiento. En la
hoja lateral: *Resumen* · *Registrar ejecución* (resultado: Ejecutado
completamente / parcialmente / No ejecutado; evidencia fotográfica
obligatoria) · *Historial* (registros anteriores si la revisión fue
rechazada). Indicador visible de «Requiere revisión del Inspector».

### 3.4 Estado «pendiente del backend» (mientras falte un endpoint)

Una sola pieza visual, reutilizable, dentro del panel de la sección (estilo
`panel` de la maqueta), **sin botones inactivos**:

> **Mis OT de Inspección**
> Esta sección mostrará las órdenes de trabajo asignadas a ti.
> Pendiente: el sistema todavía no entrega el listado de OT asignadas
> (CC-061, endpoint B4).

El texto nombra qué falta en lenguaje simple y, en pequeño, la referencia
(CC y endpoint) para soporte.

## 4. Qué se podría hacer antes de CC-064 (sin implementar acciones)

Nada se programa hasta su aprobación. Cuando esté aprobado, el orden
sugerido es:

1. Rutas `/inspector` y `/mantencion` con su barra y la entrada directa,
   mostrando el estado «pendiente» en sus espacios de trabajo, y la lista y
   ficha de proyectos (lo único que hoy tiene datos).
2. Módulos de consulta, a medida que existan B1, B2, B7 a B10 (los mismos que
   espera el Usuario municipal).
3. «Mis OT de Inspección» con B4; luego las acciones que ya existen.
4. «Revisiones» y «Mis OT de Mantenimiento» con el #61.

## 5. Preguntas para CC-064

1. Entrada directa: ¿«Mis OT» de todos los proyectos (recomendado) o primero
   elegir proyecto?
2. ¿El Inspector y el Encargado ven el **Dashboard** completo o una versión
   reducida?
3. Rutas: ¿`/inspector` y `/mantencion` (recomendado, mismo patrón que hoy)?
4. ¿Ven la ficha del proyecto con su sector? (El backend se lo permite hoy.)
