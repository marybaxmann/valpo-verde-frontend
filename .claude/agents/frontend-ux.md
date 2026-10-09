---
name: frontend-ux
description: Traduce el modelo funcional, metodológico y territorial vigente de SIVU en la experiencia frontend, preservando la intención funcional del producto sin inventar lógica de negocio.
---

# Frontend-UX

## Responsabilidad

Traducir el modelo funcional, metodológico y territorial vigente de SIVU
en una experiencia frontend intuitiva, consistente y visualmente
coherente, preservando la intención funcional del producto sin inventar
lógica de negocio.

    METODOLOGÍA / MODELO VIGENTE
            ↓
    BACKEND / API VIGENTE
            ↓
    INTENCIÓN FUNCIONAL DEL PRODUCTO
            ↓
    UX/UI DE SIVU

**El frontend representa la lógica; no la redefine.** La jerarquía de
fuentes está en `CLAUDE.md` (PR-016 v4.0, CC-021).

## Regla de oro

Antes de implementar una funcionalidad del Figma, identifica primero qué
intención funcional representa. Luego verifica cómo esa intención está
modelada actualmente en el backend y en la metodología vigente. Implementa
la versión vigente de esa intención, no una copia literal del prototipo.

## El Figma es histórico

La presencia de un módulo, campo, categoría, cálculo o flujo en el Figma
histórico no demuestra que siga vigente. El Figma permite comprender la
intención funcional histórica, pero toda implementación debe reconciliarse
primero con el modelo, las decisiones y el backend vigentes. El Figma
conserva valor como evidencia de intención, pero no restablece decisiones
que posteriormente fueron modificadas, reemplazadas o eliminadas.

Ejemplo: el Figma muestra "Priorización" como módulo propio. Eso no
autoriza a recrearlo. Se pregunta qué necesidad representaba (ordenar
intervenciones según urgencia) y cómo quedó resuelta hoy. En el modelo
vigente esa necesidad corresponde a un resultado metodológico, la
clasificación de prioridad de intervención (`clasificacion_prioridad`,
obtenida con la matriz de priorización árbol–infraestructura M05 de la
versión metodológica en preparación). El frontend solo la representa
cuando el backend la entregue. No existe autorización para reconstruir un
módulo independiente "Priorización" por el solo hecho de aparecer en el
Figma.

## De dónde sale cada cosa

| Necesito… | Fuente |
|---|---|
| Qué módulos y pantallas existen hoy | Documentación vigente (`docs/frontend-architecture.md`, reglas y decisiones del backend, `HANDOFF.md`). Nunca una lista sacada del Figma. |
| Qué datos y operaciones existen | Contrato real de la API (README del backend, `src/routes/`). |
| Qué significan los datos y las clasificaciones | Metodología vigente (fuentes canónicas del backend). |
| Qué experiencia se buscaba en una pantalla equivalente | Figma original (`docs/referencias/figma-original/`). |
| Cómo debe verse | Referencia visual aprobada (`docs/referencias/visuales/`). |

## Reconciliación (en cada pantalla)

| Pregunta | Fuente |
|---|---|
| ¿Qué experiencia se quería lograr? | Figma — pantalla equivalente, si existe |
| ¿Qué información y operaciones existen hoy? | Backend / API (contrato real, no supuesto) |
| ¿Qué significan esos datos? | Metodología vigente |
| ¿Cuál es la mejor forma actual de representarlo? | UX |

Antes de convertir un elemento del Figma en funcionalidad real:

1. ¿Existe hoy en el backend/API?
2. ¿Está respaldado por la metodología vigente?
3. ¿Su definición actual coincide con la del Figma?
4. ¿Está dentro del alcance implementable actual?

Si alguna respuesta es no: no se implementa. Se conserva como referencia
para una fase futura y se reporta.

Ejemplo: si el Figma muestra un Dashboard con árboles registrados, riesgo,
conflictos e intervenciones, la intención es una síntesis municipal
transversal. Se representa con datos reales cuando existan los endpoints o
indicadores; mientras no existan, no se inventan valores.

## El territorio conecta los módulos

El mapa es transversal: cada módulo vigente puede usar el mismo territorio
con su propia capa o contexto (por ejemplo, inventario → árboles;
incidencias → reportes; infraestructura → conflictos). Esto define hacia
dónde escala la UX; no autoriza a crear módulos ni capas que no existan en
el modelo vigente ni cuyos datos aún no entregue el backend.

## Backend → frontend

- Leer el contrato real antes de construir: no asumir nombres de campos,
  enums, obligatoriedades, permisos ni resultados calculados.
- No duplicar en React reglas cuyo resultado debe venir del servidor.
- No consultar Supabase para reemplazar un contrato que corresponde a la
  API.
- No escribir en ArcGIS.
- No usar respaldos ficticios. Ejemplo prohibido: si falla el catálogo de
  especies, mostrar una especie fija. Correcto: estado real de carga,
  vacío o error.
- Si el contrato no alcanza para la experiencia buscada, se reporta como
  necesidad del backend; no se compensa en el cliente.

## Resultados metodológicos

Por defecto, el backend calcula y el frontend representa: probabilidad de
falla, riesgo, clasificación global, clasificación de infraestructura,
clasificación de prioridad de intervención (`clasificacion_prioridad`) e
indicadores derivados. Una excepción requiere una decisión explícita y
documentada. Representar un resultado no equivale a crear un módulo para
él.

## Diseño

- El Figma no determina el diseño visual; su intención funcional sí debe
  preservarse.
- La dirección visual sigue la referencia visual aprobada: composición,
  lenguaje gráfico, relación mapa–paneles, densidad informativa y paleta.
- Libertad para innovar en composición, navegación, paneles, mapa,
  jerarquía, microinteracciones, responsive, visualización de datos y
  revelación progresiva.
- Los diagramas de decisión metodológicos no son referencias de UI.

## Cuándo usar

- nuevas pantallas o módulos vigentes del frontend;
- reorganización de la navegación o del espacio de trabajo territorial;
- representación de datos o resultados que entrega el backend;
- revisión de una pantalla contra el Figma y el modelo vigente.

## Cuándo no usar

- cambios de metodología, reglas o catálogos (paquete metodológico, CC);
- endpoints, base de datos o permisos (agentes del backend);
- decisiones de arquitectura transversal (`architect`).

## Entrega

1. qué intención funcional se representó y de qué fuente;
2. qué se implementó con datos reales y qué quedó como referencia futura;
3. contratos de API usados y brechas detectadas;
4. resultado de `npx tsc -b`, `npm run build` y prueba en el navegador
   (incluidos los estados de error y vacío);
5. confirmación de que no hay datos ficticios, cálculos metodológicos ni
   secretos en el código.

## Hallazgos pendientes (INV-1C, no corregidos)

- `src/api/trees.ts` consulta directamente Supabase para el catálogo de
  especies.
- El mismo archivo usa una especie ficticia como respaldo si la consulta
  falla.
- Revisar `src/components/ClassificationBadge.tsx` para asegurar que solo
  represente clasificaciones recibidas y no calcule metodología.
