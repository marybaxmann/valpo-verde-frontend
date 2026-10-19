# SIVU Maqueta Lab — prototipo visual v2

**Estado:** maqueta visual que la autora eligió el 2026-10-18 como **diseño objetivo
del frontend de SIVU**. Se guarda aquí como respaldo.
**No es una implementación funcional.** Aún no reemplaza a la referencia registrada
en CC-025 (`prototypes/sivu-territorio-lab`). Ese cambio debe registrarse en un CC
propio, después de sincronizar la base de datos maestra.

- Usa datos ficticios (`src/data/mock.ts`, `lab.ts` y `conecta.ts`). No se conecta
  al backend, a la API ni a Supabase.
- Es un proyecto Vite independiente y aislado: la aplicación productiva (`/src` en
  la raíz del repositorio) no lo importa ni lo compila.
- Los catálogos que muestra corresponden a la base maestra al 2026-10-17 (estados y
  acciones de OT, componentes de infraestructura, tipo, prioridad y estado de
  incidencia, y clase de edad). Hay que revisarlos contra la nueva versión de la base.

## Qué contiene

- **Nuevo logotipo SIVU** y modo claro/oscuro.
- **Login** (`#login`): **diseño oficial de la pantalla de acceso, definido por la
  autora el 2026-10-18.**
  - Usa una fotografía propia de un árbol callejero de Valparaíso
    (`src/assets/login-calle.jpg`), con la patente y un teléfono difuminados y sin
    metadatos.
  - Sobre la foto aparecen marcas animadas de observación: cavidad en el fuste,
    acera levantada y alcorque. Son ilustrativas y no constituyen una evaluación.
  - Los campos son los del login real (correo y contraseña).
  - Propone además "¿Olvidaste tu contraseña?" y un acceso a Valpo Verde Conecta,
    que no existen en el sistema actual.
- **Dashboard** solo con información, sin mapa.
- **Inventario**: la tabla es la protagonista. Al lado tiene un filtro por especie y
  un minimapa.
- **Riesgo Arbóreo**: es el nombre propuesto para "Inspección y Riesgo". Inspección
  tendría su propio módulo más adelante.
- **Infraestructura** con el mapa como protagonista.
- **Mantención**: calendario como protagonista, órdenes pendientes y mapa.
- **Valpo Verde Conecta**: módulo propuesto de participación ciudadana.
  - Vista ciudadana: placa QR → ficha pública → cuenta → reporte → seguimiento.
  - Vista municipal: reportes, placas QR y ficha pública.

## Lo que la maqueta propone y aún no está aprobado

Ninguno de estos puntos es una decisión aprobada. Cada uno requiere su CC.

- Cambiar el nombre visible de "Inspección y Riesgo" a "Riesgo Arbóreo" y crear un
  módulo independiente de Inspección.
- El módulo Valpo Verde Conecta. Implica cuentas o un rol ciudadano, que no existe
  en el modelo actual, y contenido editorial nuevo ("Sobre esta especie").
- La reorganización visual de la navegación (Territorio / Operación / Análisis /
  Proyecto). Mantiene los nombres y rutas de los módulos actuales.

## Ejecutar

```bash
cd prototypes/sivu-maqueta-lab
npm ci
npm run dev      # o: npm run build && npm run preview
```

Enlaces directos: `#dashboard`, `#inventario`, `#riesgo`, `#infraestructura`,
`#mantencion`, `#conecta` (más `-placas` o `-publica`) y `#ciudadano` (más
`-ficha`, `-reporte` o `-mis`).

Sufijos opcionales: `-municipal` (rol) y `-claro` (tema).

## Imagen de fondo del mapa (no versionada)

El fondo usa `src/assets/valparaiso-z19.jpg`, una imagen aérea de Esri/Maxar. Es
material de terceros sin autorización para versionarse en un repositorio público,
así que se excluye por `.gitignore` (CC-023). Sin ella, la maqueta compila y funciona
igual, solo con el fondo de los mapas vacío.

Para sustituirla por cartografía autorizada:

1. Obtén una imagen de licencia compatible, de unos 2880 × 1800 px y centrada en el
   Plan de Valparaíso. Sirve, por ejemplo, una ortofoto del municipio o de IDE Chile,
   o teselas de OpenStreetMap respetando su política de uso y atribución.
2. Guárdala localmente como `src/assets/valparaiso-z19.jpg`, o cambia la ruta en
   `.map__imagery` (`src/styles.css`).
3. Actualiza el texto de atribución en `MapAttribution` (`src/App.tsx`).
