# Borrador CC (sin número) — D2: reutilizar código de presentación de la maqueta

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 (borrador) |
| Origen | Fase 7 del frontend; depende de D1. |
| Tipo | Documental / referencia de producto (PR-016) |
| Estado | APROBADO METODOLÓGICAMENTE como **CC-058** (2026-10-26, backend `wip/cc057-frontend`, `57c4a7e`) |
| Regla afectada | PR-016 v6.0, «Reglas de integración del prototipo», regla 5 |
| Versión anterior | «El código del prototipo no se importa desde la aplicación productiva: se reescribe dentro de su arquitectura.» CC-025 lo resume como «sin copiar su código». |

## Problema

Reescribir desde cero colores, tipografía, espaciados y estilos que ya están
resueltos en la maqueta es lento y produce diferencias visuales que luego hay
que corregir a ojo. Pero copiar sin control trae el riesgo que la regla
quería evitar: que entren datos ficticios, catálogos viejos, permisos de
CC-022 o funciones no aprobadas escondidos en componentes.

## Qué tiene la maqueta, separado por riesgo

| Tipo | Ejemplos | Riesgo de arrastrar lógica o datos |
|---|---|---|
| Valores de diseño | variables CSS de color (claro/oscuro), radios, sombras, espaciado, fuentes Geist / Geist Mono (Google Fonts, licencia OFL) | Nulo |
| Recursos gráficos propios | `sivu-logo-light.png`, `sivu-logo-olive.png`, `login-calle.jpg` (foto de la autora, sin metadatos) | Nulo (verificar que la foto siga sin EXIF antes de versionarla) |
| CSS de presentación | `styles.css`, `lab.css`, `login.css`, `theme-light.css` (clases de tarjetas, insignias, tablas, pestañas, barra superior) | Bajo; `conecta.css` queda fuera (exclusión) |
| Íconos SVG | `Icon.tsx` | Bajo |
| Componentes TSX | `TopBar`, `Dashboard`, `Inventory`, `TreeSheet`… | **Alto**: mezclan presentación con `mock.ts`/`lab.ts`, catálogos del 2026-10-17 y acciones de `nav.ts` |
| Datos | `mock.ts`, `lab.ts`, `conecta.ts` | Prohibido siempre |

## Opciones

**A. Mantener la prohibición.** Todo se reescribe mirando la maqueta.
Más lento y con más diferencias visuales.

**B. Permitir solo lo visual sin datos (recomendada).** Se pueden copiar,
adaptándolos a la arquitectura productiva (`src/styles/`, `src/components/`):
valores de diseño, recursos gráficos propios, CSS de presentación e íconos
SVG. Los componentes TSX se **reescriben**, usando la maqueta como guía, para
que los datos lleguen solo por la API. Nunca se copian `mock.ts`, `lab.ts`,
`conecta.ts`, `conecta.css`, `Conecta.tsx`, `Citizen.tsx`, `nav.ts` ni la
imagen aérea. La aplicación productiva no importa nada desde `prototypes/`.

**C. Permitir también componentes TSX, quitando los datos.** Más rápido al
inicio, pero cada componente arrastra suposiciones de la maqueta difíciles
de revisar (estados, catálogos, acciones por rol).

## Versión nueva propuesta (opción B)

PR-016 v7.0, regla 5: «La aplicación productiva no importa código desde
`prototypes/`. Del prototipo de referencia pueden copiarse, adaptados a la
arquitectura productiva, solo elementos de presentación sin datos: valores de
diseño (colores, tipografía, espaciado, radios, sombras), recursos gráficos
propios de la autora, hojas de estilo de presentación e íconos SVG. Los
componentes con lógica o datos se reescriben. Los datos de ejemplo, los
catálogos, las acciones por rol y los módulos no aprobados nunca se copian.
Cada commit que incorpore material copiado lo indica en su mensaje.»

## Archivos afectados

Backend: `docs/project-rules.md`, `docs/registro-cambios.md`.
Frontend: `CLAUDE.md`.

## Impacto

Ninguno en metodología, datos, API ni permisos.
