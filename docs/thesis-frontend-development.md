# Desarrollo del frontend de Valpo Verde — resumen para tesis

## Sobre este documento

Este documento explica, en lenguaje claro y sin asumir conocimientos
previos de programación, cómo se construyó el frontend productivo del
sistema de gestión de arbolado urbano de Valparaíso (repositorio
`valpo-verde-frontend`), qué decisiones se tomaron y por qué, y cómo se
comprobó que cada parte realmente funciona.

Todo lo descrito aquí está respaldado por el historial real de cambios
del repositorio (`git log`), por el código tal como existe hoy, y por
pruebas ejecutadas contra el backend y la base de datos reales del
proyecto — no contra datos simulados. En cada sección se distingue
explícitamente entre tres estados, para que quede claro qué se puede
afirmar como terminado y qué no:

- **[Implementado y validado]** — existe en el código y se comprobó
  funcionando contra los sistemas reales (backend real, base de datos
  real), no contra una simulación.
- **[Limitado / provisional]** — existe y funciona, pero de forma
  incompleta o con una solución temporal que se reemplazará cuando se
  cumpla una condición conocida (por ejemplo, que exista un endpoint
  del backend que hoy no existe).
- **[Pendiente / planificado]** — todavía no existe. Se menciona solo
  para dar contexto de hacia dónde va el proyecto, nunca como si ya
  estuviera hecho.

## 1. Qué es este frontend y cómo se conecta con el resto del sistema

El sistema de Valpo Verde se compone de tres partes independientes:

1. Un **backend** (`valpo-verde-backend`), que expone una API y es la
   única parte del sistema que decide qué puede hacer cada persona
   usuaria (autorización) y que aplica las reglas de negocio.
2. Una **base de datos** (Supabase/PostgreSQL), que guarda la
   información y aplica una segunda capa de seguridad a nivel de fila
   (Row Level Security).
3. Este **frontend**, la interfaz web con la que interactúan las
   personas usuarias. Es un proyecto independiente del backend, con su
   propio repositorio y su propio ciclo de despliegue.

El principio de diseño central, mantenido en todo el desarrollo, es que
**el frontend nunca decide seguridad por sí mismo**. Solo adapta lo que
muestra en pantalla según lo que el backend confirma. Toda decisión de
"¿puede esta persona ver o hacer esto?" ocurre en el backend (y, como
segunda barrera, en la base de datos). Esto se explica con más detalle
en la sección 3.

**[Implementado y validado]**

## 2. Cómo inició el proyecto

Antes de escribir el frontend productivo, se auditó un prototipo previo
(`Valpo-Verde-Conecta`) que existía como referencia visual y de
navegación, construido con datos ficticios y sin conexión a ningún
backend real. La auditoría concluyó que su capa visual (componentes,
estilos, estructura de pantallas) era reutilizable, pero que toda su
lógica —autenticación simulada, datos inventados, ausencia de
conexión real— debía reescribirse por completo. Se decidió entonces no
evolucionar ese prototipo en el mismo repositorio, sino crear
`valpo-verde-frontend` como proyecto nuevo, trasladando únicamente los
componentes visuales evaluados como reutilizables.

**[Implementado y validado]**

## 3. Cómo funciona la seguridad

El flujo de autenticación real es el siguiente:

```
Persona usuaria → inicia sesión → Supabase Auth
                → Supabase entrega un token de sesión (JWT)
                → el frontend envía ese token al backend en cada solicitud
                → el backend valida el token y decide qué permite
                → el backend consulta la base de datos con los permisos de esa persona
```

Puntos importantes de este diseño, todos verificados en el código y en
pruebas reales:

- El frontend **nunca** contiene la clave maestra del proyecto
  (`service_role`), que permitiría saltarse todas las reglas de
  seguridad. Esa clave existe únicamente en el backend.
- La sesión de la persona usuaria la administra por completo la
  librería oficial de Supabase — el frontend no guarda el token por su
  cuenta ni lo escribe en ningún registro (consola, archivo, etc.).
- Cada solicitud al backend lleva el token de sesión vigente, obtenido
  en el momento, nunca guardado de antemano en una variable que
  pudiera quedar desactualizada.
- Si el backend rechaza una solicitud (por ejemplo, con un error
  403 "no autorizado"), el frontend muestra ese rechazo tal cual —
  nunca inventa una respuesta de reemplazo ni oculta el error.

Esto se comprobó de una forma especialmente concluyente durante el
desarrollo de la gestión de miembros de proyecto: se llamó al endpoint
de miembros directamente desde la consola del navegador, con la sesión
real de una persona usuaria sin permisos de administrador — es decir,
sin pasar por ninguna pantalla ni botón del frontend. El backend
respondió con un rechazo real (403, "Requiere rol administrador"),
confirmando que la seguridad no depende de que el frontend oculte
botones, sino de que el backend la aplica de verdad.

**[Implementado y validado]**

## 4. Los dos roles del sistema

El sistema reconoce hoy dos tipos de cuenta:

- **Administrador** (`admin`): gestiona proyectos y sus equipos de
  trabajo.
- **Usuario municipal** (`usuario_municipal`): consulta únicamente los
  proyectos a los que fue asignado, sin permisos de gestión.

El frontend nunca decide por sí mismo a qué rol pertenece una persona
usuaria — siempre se lo pregunta al backend después de iniciar sesión,
y solo entonces adapta lo que muestra. No existe ningún mecanismo que
infiera el rol a partir del correo electrónico ni que lo guarde en el
navegador como fuente de verdad.

**[Implementado y validado]**

## 5. El desarrollo por fases

El frontend se construyó en fases incrementales, cada una validada
antes de avanzar a la siguiente. A diferencia de un desarrollo con
datos simulados, **cada fase desde la autenticación en adelante se
comprobó contra el proyecto real de Supabase y contra el backend real
corriendo en el entorno de desarrollo/pruebas** (nunca contra mocks),
usando cuentas de prueba creadas específicamente para esto.

### Fase 0 — Base visual
Se creó el proyecto desde cero (React + Vite + TypeScript) y se
trasladaron los componentes visuales reutilizables del prototipo
(botones, tarjetas, tablas, formularios genéricos), sin ninguna lógica
de datos ni de negocio todavía. **[Implementado y validado]**

### Fase 1 — Base estructural
Se dejó lista la organización del repositorio (convenciones de
carpetas, variables de entorno de ejemplo) antes de empezar a
implementar funcionalidad real. **[Implementado y validado]**

### Fase 2 — Inicio de sesión real
Se reemplazó por completo el inicio de sesión simulado del prototipo
por uno real contra Supabase Auth. Se probó con dos cuentas de prueba
reales (una administradora, una municipal): credenciales incorrectas
fueron rechazadas, credenciales correctas iniciaron sesión, la sesión
se mantuvo al recargar la página, y el cierre de sesión funcionó
correctamente. **[Implementado y validado]**

### Fase 3 — Comunicación con el backend
Se construyó el mecanismo que permite al frontend hacer solicitudes
autenticadas al backend, adjuntando el token de sesión en cada una. Se
comprobó contra el backend real, corriendo localmente, que las
solicitudes efectivamente llegan con el token correcto y que el
backend responde. **[Implementado y validado]**

### Fase 4 — Perfil real de la persona usuaria
Tras iniciar sesión, el frontend ahora le pregunta al backend "¿quién
eres y qué rol tienes?" y usa esa respuesta real — nunca un valor
supuesto. Se comprobó con ambas cuentas de prueba que el rol mostrado
coincide exactamente con lo que el backend informa.
**[Implementado y validado]**

### Fase 5 — Navegación según el rol real
Se implementó que cada persona usuaria solo pueda navegar dentro de la
sección correspondiente a su rol real, y que un intento de acceder
manualmente a la sección del otro rol (escribiendo la dirección web
directamente) la redirija de vuelta a su propia sección — nunca a una
pantalla vacía ni a la del rol equivocado. Se comprobó con ambas
cuentas de prueba, incluyendo el caso de una cuenta sin rol reconocido,
para el cual el sistema no otorga ningún acceso por defecto.
**[Implementado y validado]**

### Fase 6 — Gestión de proyectos
Se implementó el listado, la creación y el detalle de proyectos reales,
consumidos directamente desde la base de datos a través del backend. Se
comprobó que un administrador ve todos los proyectos y puede crear
nuevos, mientras que una persona usuaria municipal solo ve los
proyectos a los que fue asignada — esta restricción la aplica el
backend, no un filtro del frontend.

Durante esta fase se encontró y corrigió un error real de
sincronización: al recargar la página estando en el detalle de un
proyecto específico, la aplicación a veces "perdía" esa dirección y
volvía al listado general. La causa fue que, justo después de iniciar
sesión, había un instante muy breve en el que el sistema todavía no
sabía si el perfil de la persona usuaria se estaba cargando o no, y
interpretaba erróneamente esa ambigüedad como "el rol no coincide".
Se corrigió ajustando ese estado inicial, y se comprobó que el problema
desaparecía. Este hallazgo se documenta como parte de la trazabilidad
técnica del proyecto, ya que refleja precisamente el valor de validar
contra un entorno real en vez de solo contra una simulación: un mock no
habría reproducido esta condición de tiempos.

**[Implementado y validado]**

### Fase 7 — Gestión de miembros de proyecto
Se implementó que una persona administradora pueda ver, agregar y
eliminar miembros de un proyecto. Se comprobó contra el backend y la
base de datos reales, incluyendo el caso de intentar agregar dos veces
a la misma persona (el backend lo rechaza correctamente como
duplicado) y el caso descrito en la sección 3 (rechazo real cuando
quien no tiene permisos intenta la operación de todas formas).

Para agregar una persona a un proyecto, hoy es necesario escribir
directamente su identificador interno (un código único), porque el
backend **todavía no ofrece ninguna forma de buscar o listar personas
usuarias municipales disponibles**. Es, por lo tanto, una solución de
interfaz provisional y funcional, no la experiencia final prevista —
cuando exista esa función en el backend, este campo se reemplazará por
un buscador real de personas.

**[Implementado y validado, con una interfaz de agregado provisional — ver arriba]**

## 6. Qué queda pendiente

Los módulos de inventario de árboles, evaluación técnica,
infraestructura, mantenimiento, incidencias e indicadores **no existen
todavía en el frontend**, y tampoco existen sus endpoints
correspondientes en el backend — por lo tanto no pueden construirse sin
inventar un contrato de datos que aún no ha sido definido. Tampoco
existe todavía un mapa geográfico, un panel de indicadores, ni un
mecanismo para eliminar proyectos.

El alcance de las próximas etapas de desarrollo del frontend depende de
que esos módulos existan primero en el backend. Este documento no
anticipa un calendario ni un diseño para ellos, porque hacerlo sería
describir como planificado algo que todavía no ha sido decidido.

**[Pendiente / planificado]**

## 7. Síntesis

| Aspecto | Estado |
|---|---|
| Autenticación real (Supabase Auth) | Implementado y validado |
| Comunicación segura con el backend (JWT) | Implementado y validado |
| Resolución de rol real (sin mocks) | Implementado y validado |
| Navegación protegida por rol | Implementado y validado |
| Gestión de proyectos (listar/crear/ver) | Implementado y validado |
| Gestión de miembros de proyecto | Implementado y validado |
| Selección amigable de usuarios al agregar miembro | Limitado / provisional (campo de identificador manual) |
| Eliminación de proyectos | Pendiente (sin endpoint disponible) |
| Inventario, evaluación técnica, mapa, indicadores | Pendiente |
