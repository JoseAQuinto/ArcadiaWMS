# Estado del proyecto — punto de retomada

Última actualización: 2026-09-04. Léeme primero si continúas este trabajo.

## Resumen rápido

El proyecto está **funcionalmente completo y probado de extremo a extremo en navegador real**, contra Postgres real (no solo a nivel de servicios). Es el punto más maduro alcanzado hasta ahora:

- `npm run build` pasa (TypeScript estricto + Vite build) sin errores.
- `npx eslint .` limpio (solo 4 warnings menores de `react-refresh/only-export-components` en los contexts, patrón aceptado a propósito).
- `npx vitest run` pasa: 19 tests.
- `database/schema.sql` verificado contra Postgres 16 real (dos veces, en dos sesiones distintas, contenedores Docker desechables ya eliminados) — datos demo 100% coherentes.
- **Sesión 2 (esta)**: se montó un entorno completo de prueba real — Postgres 16 desechable + un servidor Node temporal (`scripts/_dev-server.ts`, ya borrado) que imitaba el enrutado de Vercel Functions sirviendo `api/*.ts` de verdad + el build de `dist/` — y se abrió la aplicación en un navegador real para probar visualmente **todos** los módulos como un usuario real, con ambos roles.

### Qué se probó en el navegador (todo funcionó correctamente)

- Login con usuario y con las cuentas demo (botones de relleno rápido), logout.
- Dashboard: estadísticas y gráficos con datos reales y coherentes.
- Artículos: listado, filtro, indicador de "bajo mínimo", **creación de un artículo nuevo** (formulario completo, aparece en la lista al instante).
- Ubicaciones: grid visual por zonas exactamente como se pidió (código + porcentaje/LIBRE/BLOQUEADA, colores por estado), modal de detalle con contenido y edición de capacidad/bloqueo.
- Stock: listado filtrable, confirmado de solo lectura.
- Entradas: recepción parcial real (recibir 20 de 50 uds. en una ubicación), la línea se actualiza, el estado pasa a RECIBIENDO, aparece en el histórico.
- Movimientos (transferencias): formulario guiado artículo → origen (con stock disponible) → destino → cantidad; matemática verificada exacta en la pantalla de Stock tras la operación (origen -15, destino +15).
- Salidas: preparación parcial de una línea, la línea se actualiza, el pedido pasa a PREPARANDO.
- Regularizaciones: se probó el rechazo por stock insuficiente (mensaje correcto en rojo) y luego un decremento válido, ambos con motivo.
- Histórico: verificado que cada operación anterior aparece con todos sus datos (fecha, tipo, artículo, cantidad, origen/destino, referencia, usuario).
- Autorización en la UI: con el usuario OPERATOR no aparece "Configuración" en el menú, ni los botones de crear/editar artículos — confirmando que el rol se respeta también visualmente (el backend ya lo garantizaba, verificado en la sesión anterior).
- Responsive: el dashboard se probó a 375px (móvil) y el layout se adapta correctamente (grid de 2 columnas, gráficos apilados). El menú hamburguesa/drawer móvil no se pudo verificar por clic debido a una limitación puntual de la herramienta de navegador en esta sesión (el panel quedó "oculto" y los clics colgaban; las lecturas de página sí funcionaban) — el componente (`src/components/layout/MobileDrawer.tsx`) reutiliza el mismo `SidebarContent` ya validado en escritorio, así que el riesgo es bajo, pero merece una verificación visual rápida si tienes ocasión.

### Bug real encontrado y corregido en esta sesión

Los selectores de artículo en los formularios de recepción, salida, transferencia y regularización piden `pageSize=200` para cargar el catálogo completo en el desplegable, pero el validador Zod (`server/validators/common.ts`) limitaba `pageSize` a un máximo de 100 → esas peticiones devolvían `400 Bad Request` y los desplegables aparecían vacíos. **Corregido**: el límite ahora es 500, con un comentario explicando por qué. Verificado en el navegador que los cuatro formularios cargan el catálogo completo tras el fix.

## Lo que falta (en orden de prioridad)

1. **Verificar el drawer móvil con un clic real.** El código sigue el mismo patrón que el sidebar de escritorio (ya validado), pero no se pudo confirmar visualmente por la limitación de la herramienta mencionada arriba. Abrir en un móvil real o `npm run dev` + DevTools y tocar el icono de hamburguesa.
2. **Desplegar contra un Neon real** y repetir una pasada rápida (los flujos ya están probados contra Postgres real, así que esto es más sobre confirmar que Neon específicamente — pooling, latencia — no cambia nada).
3. **Screenshots del README.** Se hicieron capturas de todas las pantallas durante esta sesión (visualmente confirmadas como profesionales y correctas) pero no había forma de exportarlas a archivos `.png` en este entorno — quedan pendientes de hacer una vez desplegado.
4. **URL de demo pública** en Vercel (pasos en el README).

## Cómo volver a montar el entorno de prueba local (si lo necesitas)

No queda nada de esto en el repo (todo se limpió), pero así es como se hizo, por si hace falta repetirlo:

```bash
# 1. Postgres desechable
docker run --rm -d --name arcadia-test-db -p 5545:5432 \
  -e POSTGRES_PASSWORD=verify -e POSTGRES_USER=verify -e POSTGRES_DB=arcadia_verify \
  postgres:16-alpine

# 2. Cargar el esquema + datos demo
MSYS_NO_PATHCONV=1 docker exec -e PGPASSWORD=verify -i arcadia-test-db \
  psql -U verify -d arcadia_verify < database/schema.sql

# 3. server/db/index.ts usa @neondatabase/serverless, que no habla directamente
#    con un Postgres normal. Para probar localmente sin Neon, sustituye
#    TEMPORALMENTE ese archivo por una versión con drizzle-orm/node-postgres + pg
#    (instalar con `npm install --no-save pg @types/pg`), y RESTAURA el original
#    al terminar — no lo dejes así commiteado.

# 4. npm run build (genera dist/), luego un servidor Node que sirva dist/ como
#    estático y monte cada api/*.ts como si fuera una Vercel Function (mismo
#    patrón que scripts/_dev-server.ts, que se borró — recréalo si hace falta,
#    la estructura de rutas está documentada en api/).
```

## Lo que SÍ está terminado

- **Base de datos**: `database/schema.sql` completo (tablas, enums, checks, índices, secuencias) + `server/db/schema.ts` (Drizzle) sincronizado. Verificado dos veces contra Postgres real.
- **Backend completo**: `server/db`, `server/auth`, `server/validators`, `server/services`, y todos los endpoints en `api/*`. Probado tanto a nivel de servicio (sesión anterior) como end-to-end vía HTTP + navegador (esta sesión).
- **Integridad transaccional**: verificada en el navegador, no solo en teoría — las cantidades cuadran exactamente tras cada operación.
- **Frontend completo**: todas las páginas navegadas y probadas visualmente con datos reales.
- **Autenticación/autorización**: probada con ambos roles en el navegador.
- **README.md** y este `PROGRESS.md`.

## Dónde mirar si algo no compila

- `server/db/index.ts` debe usar siempre `@neondatabase/serverless` + `drizzle-orm/neon-serverless` en el código que se commitea. Si lo ves usando `pg`/`node-postgres`, es que quedó a medias de una sesión de pruebas locales — restaura la versión Neon (está en el historial de git, o en la sección de arriba).
- `npm run build` = `tsc --noEmit && vite build`. Si falla el tsc, casi siempre es por `noUncheckedIndexedAccess` — usa `firstRow()` de `server/utils/db.ts`.
- Si algún selector de artículo/formulario vuelve a fallar con 400, revisa `server/validators/common.ts` → `paginationSchema.pageSize` (máximo 500) antes de tocar el frontend.

## Decisiones de diseño ya tomadas (no las reabras sin razón)

- Local dev vía `vercel dev` (no un servidor Express paralelo).
- Códigos de documento generados con secuencias de Postgres (`nextval`).
- Estado de ubicación calculado, no guardado (excepto `blocked`).
- Ubicación bloqueada: no admite entradas, sí permite sacar stock.
- `stock` nunca se edita directamente, solo vía recepción/salida/transferencia/regularización.
- `pageSize` máximo de la API es 500 (no 100) porque los selectores de artículo en formularios cargan el catálogo completo de una vez.
