# D6 — Ficha pública editable por árbol (Valpo Verde Conecta)

> **Borrador para la responsable (2026-11-02).** No es un CC aprobado. Propone cómo el Usuario municipal administra la ficha pública de cada árbol. Se registra en `valpo-verde-backend/docs/registro-cambios.md` solo si ella lo aprueba, con el procedimiento de `docs/workflow.md` §14. Parte de la auditoría de Conecta del 2026-11-02 (decisiones D07, D09 y D15) y de la indicación de la responsable del mismo día: «que en ficha pública el usuario municipal tenga la forma de editar la ficha por árbol».

## Qué existe hoy

- La ficha pública (`GET /api/sivu/conecta/arboles/:qrToken`, `fn_ficha_publica_arbol`, migración 028) entrega solo lo que autoriza CC-062: especie científica (D-13), nombre común (D-14), ubicación descriptiva (D-8) y «Sobre esta especie» (D-257 a D-262).
- No existe ningún campo, tabla ni endpoint para contenido público por árbol, ni para elegir qué se publica. CC-062: «un texto editorial nuevo requiere otro CC»; excluye fotos y resultados técnicos.
- El frontend tiene la pantalla «Ficha pública» en Conecta con la vista previa del teléfono y la edición **deshabilitada**, marcada como pendiente de este CC.

## Propuesta

### 1. Quién edita

El **Usuario municipal** del proyecto (indicación de la responsable, 2026-11-02). Sin roles nuevos. El Inspector sigue siendo el único que mantiene el inventario y el catálogo de especies (CC-053): editar la ficha pública **nunca** modifica `trees`, mediciones, inspecciones ni evaluaciones.

### 2. Qué se edita, por árbol

| Contenido | Origen | Propuesta |
|---|---|---|
| Nombre común, especie, ubicación descriptiva | Inventario (D-14, D-13, D-8) | Siempre visibles (CC-062). Se muestran tal como están en el inventario; no se editan desde aquí. |
| «Sobre esta especie» | Catálogo (D-257 a D-262) | Siempre visible (CC-062). |
| Clase de edad (D-25), altura total (D-19), DAP (D-18), diámetro de copa (D-22) | Inventario, medición vigente | **Interruptor por árbol** «mostrar a la ciudadanía». El valor sale del inventario; no se escribe a mano. Apagado por defecto. |
| Texto «Mi historia» del ejemplar | Nuevo, editorial | Texto libre por árbol (hasta 1 000 caracteres), solo con antecedentes verificables y su fuente (borrador del catálogo, §4.2). |
| Fotografía pública | Nueva | Una foto subida para la ficha, separada de la evidencia de inspección (D-27 conserva EXIF y GPS y no se reutiliza). Se guarda sin metadatos, como las fotos ciudadanas (CC-049 punto 6). Sin foto: «Fotografía no disponible» con el marcador de SIVU (D15). |
| Código del árbol | Inventario | No se publica (CC-062). |

**Nunca se publica:** riesgo, evaluaciones y diagnósticos; OT e incidencias; datos de usuarios y reportantes; coordenadas UTM.

### 3. Publicación

Dos estados por ficha: **borrador** y **publicada**. La ciudadanía ve solo la última versión publicada; guardar no publica. Queda registro de quién publicó y cuándo. (Alternativa: publicar al guardar; más simple, sin revisión.)

### 4. Modelo de datos (propuesta para el backend; no se crea sin aprobación)

- Tabla nueva `tree_public_content` (1 fila por árbol): `tree_id`, interruptores `mostrar_clase_edad`, `mostrar_altura`, `mostrar_dap`, `mostrar_copa`, `historia`, `historia_fuente`, `foto_path`, `estado` (`borrador` | `publicada`), `publicado_por`, `publicado_en`, `updated_by`, `updated_at`. Más la copia publicada (o una tabla de versiones) para que el borrador no se vea.
- `fn_ficha_publica_arbol` agrega solo lo publicado y encendido.
- Endpoints con sesión (Usuario municipal): `GET` y `PUT /api/sivu/projects/:id/trees/:treeId/ficha-publica`, `POST …/ficha-publica/publicar`, `POST`/`DELETE …/ficha-publica/foto`.
- Excel: hoja nueva o filas nuevas en DICCIONARIO_CAMPOS para estos campos (lo actualiza la responsable).

## Impacto

- **BD / backend / API:** migración, función pública ampliada, 4 endpoints, bucket o carpeta de fotos públicas.
- **Frontend:** habilitar la pantalla ya construida (interruptores, texto, foto, publicar) y mostrar en la experiencia ciudadana lo publicado.
- **Privacidad:** la foto pública se revisa antes de publicar (sin personas identificables ni patentes).

## Decisiones que necesita la responsable

1. ¿Se aprueba el contenido por árbol de la tabla del punto 2 (interruptores de clase de edad, altura, DAP y copa; historia; foto)?
2. ¿Borrador y publicada, o publicar al guardar?
3. ¿El contenido editorial **por especie** (quién soy, beneficios, cuidados; borrador «SIVU Catálogo público de especies») va en este mismo CC o en uno aparte? Recomendación: aparte, porque lo mantiene otro rol y aplica a todas las fichas de la especie.
