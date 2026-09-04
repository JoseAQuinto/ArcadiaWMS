# Estado del proyecto — punto de retomada

Última actualización: 2026-09-04 (sesión de revisión y estabilización). Léeme primero si continúas este trabajo.

## Resumen rápido

El proyecto está **funcionalmente completo, revisado de arriba abajo y verificado contra Postgres real y en navegador real**. Esta sesión no ha añadido módulos nuevos: ha sido una pasada de revisión, corrección de bugs y endurecimiento.

Estado de las comprobaciones:

- `npm run build` (tsc estricto + Vite): **OK**.
- `npx eslint .`: **0 errores**, 4 warnings de `react-refresh/only-export-components` en los contexts (patrón aceptado a propósito).
- `npx vitest run`: **63 tests OK** (7 archivos).
- Batería E2E contra Neon real (y antes contra Postgres 16 local), a través del router de producción: **128 comprobaciones OK, 0 fallos**.
- Prueba de concurrencia (10–12 peticiones simultáneas): **OK**, sin duplicados y sin stock negativo.
- `database/schema.sql` y `server/db/schema.ts`: **paridad verificada automáticamente** (mismos CHECK con los mismos nombres, mismos índices, mismas columnas/tipos/defaults).

## Bugs encontrados y corregidos en esta sesión

1. **Doble ejecución en recepción y picking (crítico).** `receiveLine` y `pickLine` leían la línea del documento sin bloqueo. Dos peticiones simultáneas (doble clic, reintento del navegador) leían la misma `receivedQuantity` / `pickedQuantity`, ambas movían stock, y el documento solo contabilizaba una → **el stock se descontaba dos veces y el pedido decía que solo se había preparado una**. Reproducido de forma determinista: dos picks simultáneos de 3 uds dejaban el stock en −6 con `picked_quantity = 3`.
   **Corregido** bloqueando la cabecera del documento con `SELECT ... FOR UPDATE` al inicio de la transacción. Verificado con 10 peticiones simultáneas: exactamente 3 respuestas 200, 3 movimientos, stock −3.
2. **Transiciones de estado sin control en recepciones y pedidos.** Se podía forzar por API el estado de un documento (reabrir uno `COMPLETED`/`CANCELLED`, volver a `PENDING` uno ya recibido, editar un documento cerrado). **Corregido**: el estado se calcula siempre a partir de las líneas y el único estado que un cliente puede fijar a mano es `CANCELLED`; un documento cerrado ya no admite cambios.
3. **Indicador "bajo mínimo" incorrecto en la pantalla de Stock.** Comparaba la cantidad de **una ubicación** contra el stock mínimo **global del artículo**, mientras que el filtro "Bajo mínimo" del backend comparaba el total. Un artículo con 220 uds repartidas (10 + 60 + 150) y mínimo 20 marcaba la fila de 10 uds como "bajo mínimo". **Corregido**: la API devuelve `itemTotalStock` y frontend y filtro usan el mismo criterio.
4. **La sesión caducada dejaba la aplicación colgada.** Ante un 401 se borraba el token pero el estado seguía siendo "autenticado", así que todas las pantallas fallaban sin explicación. **Corregido**: el cliente HTTP notifica al `AuthContext` y se cierra sesión con redirección al login.
5. **Regresión de UNIQUE → 500 tras actualizar Drizzle.** Drizzle 0.44+ envuelve los errores del driver en `DrizzleQueryError` y deja el error de Postgres en `cause`, así que `mapUniqueViolation` dejaba de reconocer el código `23505` y un SKU duplicado devolvía 500 en vez de 409. **Corregido** recorriendo la cadena de `cause` (funciona con ambos drivers y con versiones anteriores). Con test unitario que fija el comportamiento.
6. **PUT con payload vacío → 500.** `updateLocation` / `updateCategory` / `updateItem` generaban un `UPDATE` sin `SET`. **Corregido**: 400 con mensaje claro.
7. **`engines.node: 20.x`.** Node 20 queda deprecado en Vercel el 1 de octubre de 2026. **Subido a 22.x.**
8. **`drizzle-orm` con aviso de seguridad alto** (inyección SQL vía identificadores mal escapados). **Actualizado** 0.36.4 → 0.45.2 (y `drizzle-kit` 0.28 → 0.31). El proyecto no construía identificadores a partir de entrada de usuario, así que no era explotable aquí, pero el aviso desaparece.
9. **Desalineación entre `database/schema.sql` y el esquema Drizzle.** A Drizzle le faltaban el CHECK de `locations.capacity`, los cuatro CHECK de coherencia de `stock_movements`, el índice `idx_items_name_trgm`, los índices por ubicación origen/destino y el `DESC` de `idx_movements_created_at`; y los CHECK del SQL eran anónimos. **Corregido**: todos los CHECK del SQL tienen nombre explícito y ambos ficheros generan exactamente los mismos objetos (comprobado por diff automático contra la BD real).

## Retoques (no eran bugs, mejoran el producto)

- Columna **"Nivel"** en la tabla de Stock: la cantidad ya no se pinta en ámbar; el aviso "Bajo mínimo" es explícito y con tooltip que indica el total del artículo y su mínimo.
- **Drawer móvil**: se cierra con `Escape`, bloquea el scroll del fondo y declara `role="dialog"` (mismo comportamiento que los modales).
- **Buscador de ubicaciones con debounce**, como el resto de listados (antes lanzaba una petición por tecla).
- **Datos demo**: `FUE-ALIM-650W` pasa a stock mínimo 20 (tiene 15 uds) para que el indicador "bajo mínimo" también se vea en un artículo *con* stock, no solo en artículos a cero.
- **Código muerto eliminado**: endpoint `GET /api/stock/location/:id` y su servicio (nadie lo llamaba y duplicaba lo que ya devuelve `GET /api/locations/:id`), y el helper `formatRelativeShort` sin uso.

## Cómo se ha verificado (reproducible)

```bash
# 1. Postgres 16 desechable
docker run --rm -d --name arcadia-verify-db -p 5546:5432 \
  -e POSTGRES_PASSWORD=verify -e POSTGRES_USER=verify -e POSTGRES_DB=arcadia_verify \
  postgres:16-alpine

# 2. Cargar esquema + datos demo
MSYS_NO_PATHCONV=1 docker exec -e PGPASSWORD=verify -i arcadia-verify-db \
  psql -U verify -d arcadia_verify -v ON_ERROR_STOP=1 < database/schema.sql

# 3. server/db/index.ts usa @neondatabase/serverless, que no habla con un Postgres
#    normal. Para probar en local, sustituye TEMPORALMENTE ese archivo por una
#    versión con drizzle-orm/node-postgres + pg (`npm install --no-save pg @types/pg`)
#    y RESTAURA el original al terminar. No lo dejes así commiteado.

# 4. npm run build, y luego un servidor Node que sirva dist/ como estático y monte
#    cada api/**/*.ts como si fuera una Vercel Function (resolviendo [id] y
#    [id]/sub). Con eso, la aplicación real corre en http://localhost:3311.
```

Lo que se probó de verdad, no "por inspección":

- **API (128 comprobaciones)**: login correcto/incorrecto, login por email, JWT manipulado / `alg=none` / firma alterada; ADMIN vs OPERATOR en cada endpoint mutador; acceso anónimo a todos los GET; recepción parcial/total, exceso, ubicación bloqueada, línea de otro documento; picking, exceso, ubicación sin stock; transferencias (válida, mismo origen/destino, sin stock, destino bloqueado, cantidad 0/negativa); regularizaciones (+/−, sin motivo, sin stock, ubicación bloqueada); artículos y ubicaciones (duplicados, SKU inválido, capacidad 0, id no numérico); paginación; métodos no permitidos; transiciones de estado; payloads vacíos.
- **Invariantes en base de datos** tras toda la batería: 0 filas con stock negativo; el stock cuadra **exactamente** con la suma del ledger de movimientos; `received_quantity` y `picked_quantity` cuadran con los movimientos de su documento; el estado de cada recepción es coherente con sus líneas.
- **Concurrencia**: 10 recepciones simultáneas sobre una línea de 4 → 4 aplicadas; 10 picks simultáneos sobre una línea de 3 → 3 aplicados; 12 salidas simultáneas contra 6 uds de stock → 6 OK, 6 rechazadas con 409, stock final 0 y nunca negativo.
- **Navegador real** (1440×900, tablet 768×1024, móvil 375×812): login, dashboard, stock (indicador y filtro "bajo mínimo"), transferencia completa con comprobación de que el stock y "Últimas transferencias" se actualizan al instante, recepción parcial con **doble clic real** en "Confirmar recepción" (un solo movimiento en BD), histórico, mapa de ubicaciones, rol OPERATOR (sin "Configuración" ni botones de maestros, y `/settings` redirige), **drawer móvil** (abre, cierra con Escape, bloquea scroll, se cierra al navegar) y **cierre de sesión automático** al invalidar el token.

## Despliegue: una sola función para toda la API

Al desplegar por primera vez en Vercel, el build compilaba bien pero fallaba en
`Deploying outputs`. Causa: **Vercel convierte cada archivo bajo `api/` en su
propia Serverless Function, y el plan Hobby limita a 12 por despliegue** en
proyectos que no son Next.js/SvelteKit. Esta API tenía 21 rutas.

Solución adoptada: los handlers se movieron a `server/routes/` (fuera de `api/`,
donde Vercel no los ve) y `api/[...path].ts` quedó como único punto de entrada,
despachando con la tabla de rutas explícita de `server/routes/router.ts`. Como
efecto secundario deseable, ahora hay una sola instancia caliente y un solo pool
de conexiones a Neon en lugar de 21.

La lógica de negocio (`server/services/`) no se tocó. Los handlers solo cambiaron
en que reciben los parámetros de ruta (`:id`) como tercer argumento en vez de
leerlos de `req.query`.

Si añades endpoints: van en `server/routes/` y se registran en la tabla del
router. Nunca archivos nuevos dentro de `api/`.

## Verificado contra Neon real

Tras el refactor, la cadena completa se probó contra el Neon de producción
(PostgreSQL 18.6, endpoint pooled, ~300 ms de latencia desde local):

- Conexión con `@neondatabase/serverless` sobre WebSocket, transacciones
  interactivas con `BEGIN` + `SELECT ... FOR UPDATE`, `ROLLBACK` deshaciendo el
  cambio y el CHECK de la base rechazando stock negativo (23514).
- Batería E2E completa a través del router: **128 comprobaciones, 0 fallos**.
- Concurrencia: 10 picks simultáneos sobre una línea de 3 → 3 aplicados, 3
  movimientos, stock -3; 10 recepciones simultáneas sobre una línea de 4 → 4
  aplicadas; 12 salidas simultáneas sobre 6 uds → 6 OK, 6 rechazadas con 409,
  stock final 0 y nunca negativo.
- Datos demo restaurados después reejecutando `database/schema.sql`.

## Lo que queda

1. **URL de demo pública** en Vercel + **capturas para el README**.
2. Decidir si la capacidad de ubicación debe aplicarse de verdad (hoy es
   informativa; ver *Pending / known limitations* en el README).

## Decisiones de diseño ya tomadas (no las reabras sin razón)

- Local dev vía `vercel dev` (no un servidor Express paralelo).
- Códigos de documento generados con secuencias de Postgres (`nextval`).
- Estado de ubicación calculado, no guardado (excepto `blocked`).
- Ubicación bloqueada: no admite entradas, sí permite sacar stock.
- `stock` nunca se edita directamente, solo vía recepción/salida/transferencia/regularización.
- El estado de recepciones y pedidos se **deriva** de las líneas; por API solo se puede fijar `CANCELLED`.
- `pageSize` máximo de la API es 500 (no 100) porque los selectores de artículo en formularios cargan el catálogo completo de una vez.
- La sesión es un JWT en `localStorage` (frontend estático + API sin estado). Compromiso consciente, documentado en el README.

## Dónde mirar si algo no compila o falla

- `server/db/index.ts` debe usar siempre `@neondatabase/serverless` + `drizzle-orm/neon-serverless` en el código commiteado. Si lo ves usando `pg`/`node-postgres`, quedó a medias de una sesión de pruebas locales — restaura la versión Neon.
- `npm run build` = `tsc --noEmit && vite build`. Si falla el tsc, casi siempre es por `noUncheckedIndexedAccess` — usa `firstRow()` de `server/utils/db.ts`.
- Si un selector de artículo falla con 400, revisa `paginationSchema.pageSize` en `server/validators/common.ts` (máximo 500).
- Si un duplicado (SKU, código de ubicación, categoría) empieza a devolver 500 en vez de 409 tras actualizar Drizzle, es la forma del error: mira `server/utils/db-errors.ts` y su test.
