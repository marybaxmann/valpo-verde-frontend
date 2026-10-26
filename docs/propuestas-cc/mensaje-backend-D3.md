# Mensaje para el equipo del backend — decisiones de navegación del 2026-10-26

Copia el bloque de abajo tal cual en la sesión de Claude del backend.

---

Hola. Soy la sesión de frontend de SIVU (Fase 7). La responsable
metodológica (marybaxmann) tomó el 2026-10-26 estas decisiones de producto.
Algunas cambian reglas vigentes del backend, así que necesitan que las
registres tú. **Antes de registrar nada, muéstrale a ella cada CC y espera su
aprobación**, como siempre. No hace falta tocar código todavía: primero los
CC.

**1. Referencia visual principal (borrador D1).** La maqueta Lab
(`valpo-verde-frontend`, rama `prototype/sivu-maqueta-lab`, commit `6817fb2`,
carpeta `prototypes/sivu-maqueta-lab/`) reemplaza a SIVU Territorio (CC-025)
como referencia visual principal: PR-016 v7.0. Territorio pasa a antecedente.
Se cumplió la condición del README de Lab: el Excel se sincronizó después de
la maqueta (2.0.0, 2.1.0). Borrador completo en el repo del frontend:
`docs/propuestas-cc/D1-maqueta-lab-referencia-principal.md`.

**2. Reutilizar código de la maqueta (borrador D2).** Se modifica la regla 5
de las reglas de integración de PR-016. Se permite copiar solo elementos de
presentación sin datos (colores, tipografía, CSS de presentación, íconos SVG,
logo y foto de la autora). Los componentes con lógica o datos se reescriben, y
nunca se copian datos, catálogos, acciones por rol ni módulos no aprobados.
Borrador: `docs/propuestas-cc/D2-reutilizacion-codigo-maqueta.md`.

**3. Navegación y nombres de módulos (borrador D3).** Orden: Análisis
(Dashboard, primero; «Indicadores biométricos», antes «Índices») → Operación
(Mantención, Incidencias, **Valpo Verde Conecta** (nuevo), **Inspección**
(nuevo)) → Territorio (Inventario, «Riesgo Arbóreo», antes «Inspección y
Riesgo», Infraestructura) → Proyecto. Las rutas actuales no cambian. Borrador:
`docs/propuestas-cc/D3-navegacion-agrupada.md`.

Lo que necesito que revises y registres como CC (uno por tema, como
corresponda):

a) **Cambio de nombre visible** de «Índices» → «Indicadores biométricos» y de
   «Inspección y Riesgo» → «Riesgo Arbóreo» (PR-016 regla de integración 2).
   Ojo: «Indicadores biométricos» muestra los mismos agregados descriptivos de
   hoy (`GET /api/projects/:id/indices`). No adopta la hoja INDICES (CC-016
   sigue en DETECTADO). Confirma con ella si el nombre no se presta a
   confusión con REGLAS_INDICADORES.

b) **Módulo Inspección (nuevo).** Es el espacio donde el Inspector trabaja
   sus OT de Inspección (borrador, fotos, calcular y finalizar, #58/#59/#72).
   Necesito saber qué ve cada rol ahí y que exista un endpoint para listar las
   OT asignadas al usuario y las OT del proyecto (en
   `docs/propuestas-cc/pendientes-backend.md` del frontend, B3 y B4).

c) **Módulo Valpo Verde Conecta (nuevo) — choca con una regla vigente.** La
   maqueta propone una vista ciudadana con **cuenta**, reporte, seguimiento,
   placas QR y ficha pública con contenido editorial («Sobre esta especie»).
   CC-036 / PR-022 v1.0 dice: **formulario público sin cuenta**, nombre y RUT
   visibles solo para el Usuario municipal y borrados al resolver, sin datos
   de contacto. Hay que decidir con ella si Conecta: (i) se ajusta a CC-036
   (sin cuentas: solo formulario, ficha pública y placas), o (ii) modifica
   CC-036 (rol o cuenta ciudadana, nuevo tratamiento de datos personales).
   Esto afecta roles, RLS, Storage (fotos ciudadanas, CC-049) y el #62.

Cuando registres los CC, por favor anota en el HANDOFF los números asignados
a D1, D2 y D3 para que el frontend los cite.

Gracias.
