# D5 — Ficha ciudadana de Valpo Verde Conecta: ampliación de CC-062

> **Borrador para la responsable (2026-11-01).** No es un CC aprobado. Propone qué ampliar de CC-062 (PR-022 v2.0) para que la experiencia ciudadana del árbol muestre lo que pidió la responsable. Se registra en `valpo-verde-backend/docs/registro-cambios.md` solo si ella lo aprueba, con el procedimiento de `docs/workflow.md` §14.

## Qué ya está construido (frontend, sin cambios de backend)

- Ruta pública **`/arbol/:qrToken`**, sin iniciar sesión (`src/pages/ArbolPublicoPage.tsx`). Pide la ficha a `GET /api/public/conecta/arboles/:qrToken`; mientras no exista, muestra «Esta ficha está en preparación».
- Experiencia en cuatro secciones (`src/components/conecta/ExperienciaArbol.tsx`): ¿Quién soy?, ¿Qué aporto a Valparaíso?, ¿Cómo es mi vida?, ¿Cómo puedes cuidarme?, con el acceso destacado «Reportar un problema».
- Cada dato distingue **«Este árbol»** (el ejemplar) de **«Su especie»** (catálogo). Lo que no está autorizado o no tiene fuente aparece como «Próximamente», sin valores.
- Formulario de reporte (`ReporteCiudadano.tsx`) con los campos de PR-022 (nombre, RUT con dígito verificador, tipo, descripción y al menos una foto); sin datos de contacto. Envío deshabilitado hasta tener el endpoint y el catálogo de tipos.
- Vista previa interna en Conecta → «Ficha pública», con datos reales del inventario y del catálogo, limitada a los campos de CC-062.

## Lo que CC-062 hoy permite y lo que habría que ampliar

| Contenido pedido | CC-062 vigente | Propuesta |
|---|---|---|
| Nombre común y científico, ubicación descriptiva | Permitido (D-14, D-13, D-8) | Sin cambio |
| Género, familia, origen, follaje, tipo de hoja | Permitido («Sobre esta especie», D-257 a D-262) | Sin cambio |
| **Fotografías del árbol** | Excluidas | Publicar **una** foto «árbol completo» (vista D-27) de la evaluación vigente, sin EXIF ni GPS, elegida por el Usuario municipal. Nunca fotos de incidencias ni de detalle de defectos. |
| **Altura total y clase de edad** | Excluidas («ningún otro resultado técnico») | Publicar altura total (D-?) y clase de edad (D-?) de la medición vigente, como datos «Este árbol». No son clasificaciones de riesgo. |
| **Curiosidades, floración, cambios estacionales, consejos de cuidado** | «Un texto editorial nuevo requiere otro CC» | Nuevos campos editoriales **por especie** en CATALOGO_ESPECIES (texto, con su fuente), cargados y revisados por el equipo. Nunca por árbol. |
| **Beneficios ambientales** (sombra, carbono, aire, agua) | No contemplados | Mostrar solo indicadores **resueltos y adoptados** (CC-016) por árbol, con unidad y fecha de referencia. Carbono y servicios, cuando su método esté definido (INDICES 14 a 31). |
| **«Mi historia»** (mantenciones y fotos históricas) | No contemplado | Lista de intervenciones **completadas** (tipo y año), sin responsables, motivos ni costos; requiere el módulo de mantención (#61). Fotos históricas: mismo criterio que la foto principal. |

> Los D-n marcados «D-?» se completan con la fila real del `.xlsx` (`scripts/metodologia/fila_diccionario.py`) al redactar el CC.

## Dependencias de backend (no se tocaron)

1. **Ficha pública por `qr_token`** (`GET /api/public/conecta/arboles/:qrToken`), con la forma de `src/types/fichaPublica.ts`, y lo que el CC amplíe. Detalle de seguridad en `valpo-verde-backend/docs/plan/conecta-62-backend.md`.
2. **Formulario público** (`POST /api/public/conecta/arboles/:qrToken/reportes`, multipart), que devuelve el código de seguimiento una sola vez.
3. **Catálogos públicos con etiqueta:** tipo de incidencia (D-180), origen biogeográfico, persistencia del follaje y tipo de hoja. Hoy no existen en la API (B20); el frontend no puede escribirlos.
4. **`qr_token` de cada árbol** para el Usuario municipal (placas imprimibles); B1 no lo entrega.
5. Si se aprueba la ampliación: medición vigente (B2), foto principal publicable, indicadores por árbol (B19) e historial de mantenciones (#61).

## Decisiones que necesita la responsable

1. ¿Se aprueba ampliar CC-062 con foto principal, altura y clase de edad?
2. ¿Quién redacta y revisa los textos por especie, y con qué fuente?
3. ¿Qué indicadores ambientales se mostrarán a la comunidad cuando estén validados?
4. ¿«Mi historia» muestra solo intervenciones completadas, y con qué nivel de detalle?
