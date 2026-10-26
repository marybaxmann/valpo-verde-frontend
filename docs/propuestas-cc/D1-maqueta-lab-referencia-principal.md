# Borrador CC (sin número) — D1: maqueta Lab como referencia visual principal

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 (borrador) |
| Origen | Elección de la autora del 2026-10-18 (README de `prototypes/sivu-maqueta-lab`); Fase 7 del frontend. |
| Tipo | Documental / referencia de producto (PR-016) |
| Estado | BORRADOR — opción A elegida por la autora (2026-10-26); pendiente de número y registro |
| Regla afectada | PR-016 v6.0 (CC-025) |
| Versión anterior | PR-016 v6.0: la referencia visual principal es «SIVU Territorio» (`prototype/sivu-territorio-v1`, `c852104`, `prototypes/sivu-territorio-lab/`). |

## Problema

La autora eligió la maqueta Lab como diseño objetivo, pero la referencia
registrada sigue siendo SIVU Territorio. Sin un CC, el frontend no puede
tomar Lab como guía sin contradecir PR-016 v6.0.

El README de Lab pide registrar el cambio «después de sincronizar la base
de datos maestra». **Condición cumplida:** después de la maqueta
(2026-10-18) el Excel maestro se sincronizó y publicó como 2.0.0
(2026-10-20, AM-08; CC-026 en «FUENTE SINCRONIZADA») y 2.1.0 (2026-10-21,
AM-13). Por lo mismo, los catálogos de Lab (2026-10-17) son anteriores a la
versión vigente: de ahí el punto 4 de la versión nueva.

## Decisión

Opción A, elegida por la autora el 2026-10-26 (pantalla de referencia: login
de Lab).

## Opciones

**A. Lab reemplaza a Territorio (recomendada).** PR-016 v7.0: referencia
principal = `prototype/sivu-maqueta-lab`, línea base `6817fb2`, carpeta
`prototypes/sivu-maqueta-lab/`. Territorio pasa a antecedente (como pasó con
`03_CityDashboardsButton.jpg` en CC-025). Se mantiene todo lo demás de
PR-016 v6.0: nivel 6 de la jerarquía, solo UX/UI, aprobación de la dirección
visual y no de cada componente, reglas de integración, roles y cartografía.

**B. Conviven las dos, con Lab prevaleciendo en caso de diferencia.** Más
ambiguo: cada pantalla obliga a decidir cuál mirar.

**C. Se mantiene Territorio.** Contradice la elección de la autora.

## Versión nueva propuesta (opción A)

PR-016 v7.0. Cambios respecto de v6.0:

1. Referencia visual principal: maqueta «SIVU Lab» — rama
   `prototype/sivu-maqueta-lab`, carpeta `prototypes/sivu-maqueta-lab/`,
   línea base `6817fb2`. Define composición, navegación, tipografía, color,
   densidad, estados visuales y el diseño de la pantalla de acceso.
2. «SIVU Territorio» (`c852104`) pasa a antecedente visual.
3. Lo que Lab propone y no está aprobado queda fuera hasta su propio CC:
   módulo Valpo Verde Conecta y vista ciudadana; nombre «Riesgo Arbóreo» y
   módulo de Inspección separado; «¿Olvidaste tu contraseña?» y acceso a
   Conecta en el login; reorganización de la navegación (ver D3).
4. Los catálogos, estados, acciones por rol y textos de Lab corresponden a la
   base maestra del 2026-10-17 y a CC-022: nunca prevalecen sobre la API ni
   sobre la base vigente (por ejemplo: «Vencida» no es un estado de OT;
   «Coordenadas WGS84» no es lo vigente; el Usuario municipal no registra
   evaluaciones, PR-003 v8.0).
5. Datos ficticios (`mock.ts`, `lab.ts`, `conecta.ts`): nunca pasan al código
   productivo. Imagen aérea Esri/Maxar: igual que en v6.0 (no se versiona; el
   mapa productivo es ArcGIS).
6. La regla sobre reutilizar su código la define D2.

## Motivo

Alinear la referencia registrada con la elección de la autora, sin ampliar
su alcance: solo lo visual.

## Archivos afectados

Backend: `docs/project-rules.md` (PR-016 v7.0), `docs/registro-cambios.md`.
Frontend: `CLAUDE.md` (tabla «Referencias de producto»),
`docs/frontend-architecture.md` (bitácora).

## Impacto

Ninguno en metodología, datos, API ni permisos.
