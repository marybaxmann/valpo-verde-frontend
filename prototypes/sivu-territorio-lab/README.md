# SIVU Territorio — prototipo visual v1

**Estado:** prototipo visual aprobado por la autora como **dirección visual de
referencia** para el futuro frontend de SIVU (2026-10-16).
**No es una implementación funcional terminada.**

- Usa datos ficticios (`src/data/mock.ts`). No se conecta al backend, a la API
  ni a Supabase.
- Es un proyecto Vite independiente y aislado: la aplicación productiva
  (`/src` en la raíz del repositorio) no lo importa ni lo compila.
- Tiene detalles por corregir. Algunos campos que muestra (coordenadas WGS84,
  altura total, clase de edad) siguen en revisión en la propuesta estructural
  y no implican decisiones aprobadas.
- La integración al frontend funcional se hará más adelante, de forma progresiva
  y módulo por módulo, conservando todas las funcionalidades existentes y
  respetando las decisiones de permisos en revisión.

## Ejecutar

```bash
cd prototypes/sivu-territorio-lab
npm ci
npm run dev      # o: npm run build && npm run preview
```

## Imagen de fondo del mapa (no versionada)

El fondo usa `src/assets/valparaiso-z19.jpg`, una imagen aérea de Esri/Maxar.
Es material de terceros sin autorización para versionarse en un repositorio
público, así que se excluye por `.gitignore` (CC-023). Sin ella, el prototipo
compila y funciona igual, solo con el fondo del mapa vacío.

Para sustituirla por cartografía autorizada:

1. Obtén una imagen de licencia compatible (por ejemplo, ortofoto del municipio
   o de IDE Chile, o teselas de OpenStreetMap respetando su política de uso y
   atribución), de unos 2880 × 1800 px centrada en el Plan de Valparaíso.
2. Guárdala localmente como `src/assets/valparaiso-z19.jpg`, o bien cambia la
   ruta en `.map__imagery` (`src/styles.css`).
3. Actualiza el texto de atribución en `src/components/MapChrome.tsx`.
4. Si la licencia permite versionarla, quita la línea correspondiente de
   `.gitignore`.
