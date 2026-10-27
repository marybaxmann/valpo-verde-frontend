# B1 — Listado de árboles del proyecto: lo que necesita el frontend

Fecha: 2026-10-27. Documento de trabajo del frontend para el equipo del
backend (no es un CC; el contrato final lo definen ustedes y lo aprueba la
responsable). Leído de `origin/feature/fase6-backend-api` (`05ccd8d`).

## Para qué

Inventario (tabla protagonista, especies, minimapa), los mapas de Riesgo
Arbóreo e Infraestructura, el buscador (Ctrl K) y, después, la ficha del
árbol y el alta de OT (elegir el árbol).

## Decisiones de la responsable (2026-10-27)

| Columna | Qué es | Fuente en la base (lectura) |
|---|---|---|
| **Estado** | `estado_ciclo_vida` (Activo / Retirado / Tocón). La presencia (`v_tree_presence`) queda para la ficha. | `trees.estado_ciclo_vida` |
| **Riesgo** | Clasificación **efectiva**: la ajustada por el Inspector si existe; si no, la calculada (mismo criterio que `nivel_riesgo` en `v_inspections`). Con una marca cuando es ajustada. | `v_tree_current_assessment`: `clasificacion_riesgo_ajustada` / `clasificacion_riesgo_calculada` |
| **DAP** | `dap_cm`. En un multifustal es el **DAP equivalente que calcula la plataforma** con la fórmula del Excel (`calcularDapEquivalenteCm`, motor de reglas; diccionario: «para árboles multifustales, corresponde al diámetro equivalente calculado»). El frontend no calcula: lo muestra como «DAP equivalente» cuando `multifustal` es verdadero. | `trees.dap_cm`, `trees.multifustal`, `trees.numero_fustes` |
| **Datos vigentes desde** | Fecha en que los datos pasaron a ser vigentes: `fecha_completada_ot` de la OT de la inspección que los aportó. | `trees.vigente_desde_inspection_id` → inspección → OT |

## Lo que necesita por árbol (necesidad, no formato)

- `id`, `tree_code`.
- `especie_cientifica`, `nombre_comun`.
- `estado_ciclo_vida` como `{ codigo, etiqueta }`.
- Ubicación: `utm_este`, `utm_norte` y `lng`/`lat` derivadas (ADR-010 v3.0), `sector` (D-7), `ubicacion_descriptiva` (D-8).
- `dap_cm`, `multifustal`, `numero_fustes`, `altura_total_m`.
- Riesgo efectivo como `{ codigo, etiqueta }` (con «No determinado» y su etiqueta, CC-024/CC-029), `ajustada: boolean`, y `null` si el árbol no tiene evaluación vigente (el frontend lo muestra como «Sin evaluación»).
- `vigente_desde` (fecha, según la decisión de arriba) y `fecha_registro`.

## Comportamiento

- Lectura con el JWT del usuario (PR-018 v5.0; CC-064 g). Todos los miembros
  del proyecto y el Administrador (CC-064 a; RLS de la 017 ya lo permite).
- **Todos los árboles del proyecto en una respuesta** (como el GeoJSON de
  SIG-1, que leía por cursor hasta terminar), porque los mapas necesitan
  todos los puntos. Si el volumen lo exige, paginación con `total`.
- Los árboles sin coordenadas cuentan en el total y vienen sin `lng`/`lat`.
- Catálogos con `codigo` y `etiqueta` (PR-021): el frontend no escribe
  etiquetas.
- El frontend no cuenta ni clasifica: los conteos del Dashboard siguen
  esperando B7. Filtrar o buscar sobre los campos recibidos (por especie,
  por ciclo de vida, por texto) sí lo hace la pantalla.

## Qué hace el frontend cuando exista

Inventario: tabla con estas columnas, filtro por especie y por ciclo de
vida, búsqueda por código / especie / dirección, minimapa con los puntos.
Riesgo Arbóreo: puntos con la paleta oficial de riesgo (PR-016) según la
clasificación efectiva. Buscador: árboles por código y especie.
