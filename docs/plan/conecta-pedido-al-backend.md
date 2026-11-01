# Valpo Verde Conecta e Incidencias — lo que el frontend necesita del backend

> **Para el equipo de backend (y su Claude).** Escrito por el frontend el 2026-11-01, a pedido de la responsable. Complementa, sin reemplazarlo, `valpo-verde-backend/docs/plan/conecta-62-backend.md` (rama `feature/conecta-62`, commit `83ec25c`), que tiene el diagnóstico, la migración 028, las pruebas y las decisiones pendientes. **La fuente que manda es CC-062 (PR-022 v2.0)**, con CC-036, CC-049 y PR-018 v6.0; ante cualquier diferencia, manda el CC.
>
> **Cuándo:** después del congelamiento del lunes 2 de noviembre a las 12:00. Nada de esto se aplica en la base de pruebas antes, porque la presentación la usa.

## 1. Qué ya está construido en el frontend

Rama `feature/fase7-maqueta-lab`, publicada en `valpo-verde-frontend.vercel.app` y `sivu-plataforma.vercel.app`.

| Pieza | Archivo | Estado hoy |
|---|---|---|
| Página pública del árbol, sin sesión: **`/arbol/:qrToken`** | `src/pages/ArbolPublicoPage.tsx` | Llama a la ficha pública; como el endpoint no existe, muestra «Esta ficha está en preparación». |
| Experiencia ciudadana: portada, cuatro tarjetas (Quién soy, Mis beneficios, Mi historia, Cómo cuidarme) y «Reportar un problema» | `src/components/conecta/ExperienciaArbol.tsx` | Lista. Distingue «Este árbol» de «Su especie». |
| Formulario de reporte (PR-022): nombre, RUT con dígito verificador, tipo, descripción, fotos | `src/components/conecta/ReporteCiudadano.tsx` | Envío deshabilitado: faltan el endpoint y el catálogo de tipos. |
| Tipos y llamadas | `src/types/fichaPublica.ts`, `src/api/publico.ts` | Con el contrato de la sección 3. |
| Vista previa interna (Conecta → Ficha pública) | `src/components/conecta/VistaPreviaCiudadana.tsx` | Funciona con B1 y el catálogo de especies. |
| Módulo **Incidencias** | `src/pages/IncidentsPage.tsx` | «En desarrollo»: espera B9. Ahí llegan los reportes de la comunidad. |
| Pestañas «Reportes ciudadanos» y «Código QR» de Conecta | `src/pages/ConectaPage.tsx` | «En desarrollo». |

El cliente público (`publicApi` en `src/api/client.ts`) **no envía `Authorization`** y usa `cache: no-store`. Con `FormData` no fija `Content-Type`, para que el navegador ponga el `boundary` del multipart.

## 2. Lo que se pide, en orden de prioridad

### P1 — Ficha pública por `qr_token` (sin sesión)

Es lo que hace funcionar el QR. Sin esto, la página pública solo dice «en preparación».

- `GET /api/public/conecta/arboles/:qrToken`.
- Solo los campos de CC-062: D-13, D-14, D-8 y «Sobre esta especie» (D-257 a D-262).
- Nunca `tree_code`, `id`, coordenadas, proyecto, riesgo, inspecciones, fotos ni incidencias.
- Token inexistente o mal formado: **misma** respuesta `404`.
- CORS para los dos dominios del frontend (sección 4).

### P2 — Catálogos públicos con etiqueta

El frontend no puede escribir catálogos en el código (regla del proyecto), así que necesita estos:

- **Tipo de incidencia (D-180)** para el selector del formulario: `GET /api/public/conecta/catalogos` → `{ data: { tipo_incidencia: [{ codigo, etiqueta }] } }`.
- **Origen, follaje y tipo de hoja** con etiqueta **dentro de la ficha**, como `{ codigo, etiqueta }`. Hoy la API solo entrega códigos (B20).

### P3 — Formulario de reporte (sin sesión)

Crea la incidencia con `origen_reporte` Comunidad. Es lo que hace llegar el reporte al módulo Incidencias.

- `POST /api/public/conecta/arboles/:qrToken/reportes`, `multipart/form-data`.
- Campos: `nombre`, `rut`, `tipo_incidencia`, `descripcion`, `fotos` (repetido, uno por archivo).
- Devuelve el código de seguimiento **una sola vez**.
- Reglas de CC-062, CC-036 y CC-049:
  - ≥ 1 foto, sin EXIF ni GPS;
  - 10 reportes por hora por IP;
  - código de seguimiento ≥ 128 bits, sin guardarlo en claro;
  - sin ningún dato de contacto.

### P4 — Incidencias internas (B9 y revisión, con sesión)

Es lo que alimenta el módulo Incidencias. El frontend necesita:

- **Listado del proyecto:** `GET /api/sivu/projects/:id/incidents`, con filtros opcionales `?estado=&origen=&tipo=`. Cada fila trae:
  - `id` y `codigo_incidencia`;
  - `tipo_incidencia`, `estado_incidencia` y `origen_reporte`, cada uno como `{ codigo, etiqueta }`;
  - `descripcion`, `fecha_reporte` y `fecha_actualizacion_estado`;
  - `arbol: { id, tree_code, nombre_comun, especie_cientifica }` (aquí sí, porque es interno);
  - `resultado_revision`, `prioridad_municipal` y `cantidad_fotos`.
- **Detalle:** `GET /api/sivu/incidents/:incidentId`.
  - Lo mismo que el listado, más `observaciones_revision`, `fecha_revision`, `revisado_por: { nombre }` y las `fotos` con URL firmada (como las de inspección).
  - `reportante: { nombre, rut }` **solo** para el Usuario municipal miembro; para los demás roles, el campo no viene.
  - `ot_derivada: { id, codigo }` si la incidencia se derivó a una OT.
- **Revisión** (solo Usuario municipal): `PATCH /api/sivu/incidents/:incidentId/revision` con `{ estado_incidencia?, resultado_revision?, observaciones_revision?, prioridad_municipal? }`. Con Descartada se borran las fotos ciudadanas (CC-049).
- **Derivar a OT de Inspección:** documentar en `coordinacion.md` el uso de `POST /projects/:id/work-orders` con `incident_id` (la base ya lo acepta, 018h).
- **Catálogos con sesión:** estado (D-184), resultado de revisión, prioridad municipal (D-189) y origen del reporte, como `{ codigo, etiqueta }`.

### P5 — Seguimiento del reporte (sin sesión)

- `POST /api/public/conecta/seguimiento` con `{ codigo }`, que devuelve `{ data: { estado: { codigo, etiqueta } } }`.
- El código va en el cuerpo, nunca en la URL.
- 30 consultas por hora por IP.
- Inexistente, vencido o mal formado: misma respuesta `404`.

El frontend construirá la pantalla de seguimiento cuando exista este endpoint.

### P6 — Código QR de cada árbol (con sesión)

- `qr_token` en B1 (`GET /api/sivu/projects/:id/trees`), **solo** para el Usuario municipal. Con él, la pestaña «Código QR» muestra el QR y su dirección.
- Archivo imprimible de placas: `GET /api/sivu/projects/:id/placas-qr` (PDF), solo Usuario municipal.

### P7 — Datos del catálogo de especies (sin código)

Hoy la ficha del piloto muestra género y familia «Aún sin registrar». Hay dos causas:

- El catálogo solo tiene *Acer pseudoplatanus*. Por ejemplo, falta *Lagerstroemia indica* (Crespón, A-000417).
- Los 22 árboles tienen `species_id` vacío.

Hay que cargar las especies del piloto con sus campos D-257 a D-262 y resolver la decisión 7 de `conecta-62-backend.md`.

## 3. Contrato que espera el frontend

Todas las respuestas usan la envoltura de siempre: `{ data }` si salen bien y `{ error: "mensaje para la persona" }` si fallan.

> **Diferencia con el borrador del backend:** `conecta-62-backend.md` propone campos en camelCase (`especieCientifica`, `sobreEstaEspecie`…). El resto de la API usa snake_case (por ejemplo, B1 entrega `especie_cientifica`), y el frontend ya está escrito así. **Pedimos snake_case**, como abajo. Si el backend prefiere otra forma, que la deje en `coordinacion.md` y el frontend se adapta. El prefijo `/api/public/conecta` sí es el del borrador: el frontend ya lo usa.

**Ficha** — `GET /api/public/conecta/arboles/:qrToken` → `200`

```json
{
  "data": {
    "especie_cientifica": "Lagerstroemia indica",
    "nombre_comun": "Crespón",
    "ubicacion_descriptiva": "Av. Pedro Montt, sector Plaza Victoria; …",
    "especie": {
      "especie_cientifica": "Lagerstroemia indica",
      "genero": "Lagerstroemia",
      "familia": "Lythraceae",
      "origen_biogeografico": { "codigo": "exotica", "etiqueta": "Exótica" },
      "persistencia_follaje": { "codigo": "caduca", "etiqueta": "Caduca" },
      "tipo_hoja": { "codigo": "simple", "etiqueta": "Simple" }
    }
  }
}
```

Los valores del ejemplo solo ilustran la forma. Los códigos y etiquetas reales salen del catálogo.

- `especie` puede ser `null`.
- Si el árbol no tiene especie vigente: `origen_biogeografico` es «Origen no determinado» y `persistencia_follaje` y `tipo_hoja` son `null` (CC-062, punto 3).
- `404` → `{ "error": "No encontramos este árbol." }`.

**Reporte** — `POST /api/public/conecta/arboles/:qrToken/reportes` → `201`

```json
{ "data": { "codigo_seguimiento": "ABCD-EFGH-…" } }
```

| Respuesta | Cuándo | Cuerpo |
|---|---|---|
| `400` | Validación | `{ "error": "…", "campos": { "rut": "…", "fotos": "…" } }` (mensaje por campo, para mostrarlo junto a cada uno) |
| `404` | El árbol no existe | Igual que la ficha |
| `413` | Fotos demasiado grandes | `{ "error": "…" }` |
| `429` | Más de 10 reportes por hora | `{ "error": "…" }` |

Se pide confirmar el máximo de fotos y el tamaño máximo por foto (decisión 6 del backend), para validarlos también en pantalla.

## 4. Configuración

- **CORS** de la API (`CORS_ORIGIN`): `https://valpo-verde-frontend.vercel.app` y `https://sivu-plataforma.vercel.app`, además de `http://localhost:5173` en desarrollo.
- **Dirección del QR** (decisión 4 del backend): el frontend propone `https://sivu-plataforma.vercel.app/arbol/<qr_token>`, o el dominio definitivo que elija la responsable. La ruta `/arbol/:qrToken` ya existe y está publicada.

## 5. Cómo avisar al frontend

Cuando cada endpoint esté publicado en `sivu-api.vercel.app`, agréguenlo a `docs/plan/coordinacion.md` con su forma real, como en B-6. El frontend conecta solo lo que esté publicado ahí. Para la ficha y el formulario, el cambio en el frontend es pequeño: las llamadas ya existen en `src/api/publico.ts`.

## 6. Lo que necesita una decisión de la responsable (no lo implementen sin ella)

**Lo que espera un CC nuevo.** La propuesta está en `valpo-verde-frontend/docs/propuestas-cc/D5-ficha-ciudadana-conecta.md`. Hasta que la responsable la apruebe, la ficha muestra estas partes como «Próximamente», sin valores:

- foto del árbol;
- altura y clase de edad;
- textos por especie (curiosidades, floración, consejos de cuidado);
- beneficios ambientales;
- «Mi historia».

**Lo que sigue abierto en `conecta-62-backend.md`.** Las decisiones 1 a 8 de ese archivo siguen pendientes. Entre ellas, los límites por IP en Vercel, la programación del borrado de huellas y qué pasa con el QR de un proyecto cerrado.
