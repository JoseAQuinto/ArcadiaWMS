# Estado del proyecto — punto de retomada

Última actualización: 2026-09-03. Escrito porque el usuario tuvo que cortar la sesión antes de la revisión final en navegador. Léeme primero si continúas este trabajo.

## Resumen rápido

El proyecto está **funcionalmente completo en código** y en un **punto estable**:

- `npm run build` pasa (TypeScript estricto + Vite build) sin errores.
- `npx eslint .` está limpio (solo 4 warnings menores de `react-refresh/only-export-components` en los contexts, que son un patrón aceptado a propósito — exportan el hook `useX` junto al `XProvider` en el mismo archivo).
- `npx vitest run` pasa: 19 tests (validadores Zod, `computeLocationStatus`/`computeOccupancyPercent`, hash de contraseñas, JWT).
- `database/schema.sql` se ejecutó y verificó contra un **Postgres 16 real** (contenedor Docker desechable, ya eliminado) — la carga de datos demo es 100% coherente (todas las cantidades de stock están derivadas del ledger de movimientos, no tecleadas a mano).
- La capa de servicios (`server/services/*.ts`) se probó con un script temporal contra ese mismo Postgres real: login (correcto/incorrecto), recepción (recibir línea parcial, cambio de estado, bloqueo de ubicación bloqueada), transferencia (resta/suma correctas, stock insuficiente rechazado), salida/picking (descuento correcto, cambio de estado, cantidad excedente rechazada), regularización (incremento/decremento, no permite negativo), dashboard (agregados correctos). 24/25 aserciones pasaron; la única "fallada" era un error en el propio script de test (mensaje esperado incorrecto), no un bug del producto. Ese script (`scripts/_verify_flows.ts`) era desechable y **ya se borró** — no forma parte del repo.

## Lo que falta (en orden de prioridad)

1. **Probar en el navegador de verdad.** Nunca se ejecutó `npm run dev` / `vercel dev` ni se abrió la app en un browser en esta sesión, porque no había una `DATABASE_URL` de Neon real disponible en el entorno de desarrollo (sandbox sin acceso a Neon ni a `vercel login`). Es el paso más importante pendiente:
   - Crear un proyecto en Neon, ejecutar `database/schema.sql`, configurar `.env` con `DATABASE_URL` y `JWT_SECRET`.
   - `npm run dev` (usa `vercel dev`, pedirá vincular el proyecto la primera vez).
   - Probar el flujo end-to-end descrito en el README: login → dashboard → artículos → ubicaciones → stock → crear/recibir una recepción → transferencia → preparar una salida → regularización → histórico.
   - Probar responsive en móvil/tablet (el CSS está escrito para ser responsive pero nunca se verificó visualmente).
2. **Screenshots del README.** La sección "Screenshots" está marcada como pendiente — hacer capturas reales una vez la app esté corriendo.
3. **URL de demo pública.** Desplegar en Vercel (pasos en el README) y pegar la URL en la sección "Demo" del README.
4. Revisión opcional de UX fina (nada bloqueante): comprobar que los toasts/confirmaciones se ven bien, que el drawer móvil se comporta bien en pantallas muy pequeñas, etc.

## Lo que SÍ está terminado

- **Base de datos**: `database/schema.sql` completo (tablas, enums, checks, índices, secuencias para códigos de documento, datos demo coherentes) + `server/db/schema.ts` (Drizzle) sincronizado.
- **Backend completo**: `server/db`, `server/auth` (JWT + bcrypt), `server/validators` (Zod, uno por dominio), `server/services` (auth, categories, items, locations, warehouses, stock, receipts, outbound, movements, dashboard) y todos los endpoints en `api/*` (auth, items, categories, warehouses, locations, stock, receipts + receive, outbound-orders + pick, transfers, adjustments, movements, dashboard).
- **Integridad transaccional**: toda operación que toca stock usa `db.transaction` + `SELECT ... FOR UPDATE` antes de descontar (ver `server/services/stock.service.ts` → `decreaseStock`/`increaseStock`/`lockStockQuantity`). Verificado contra Postgres real que no deja stock negativo.
- **Frontend completo**: layout (sidebar + drawer móvil + header), todas las páginas del menú (Dashboard, Entradas, Salidas, Movimientos/transferencias, Regularizaciones, Stock, Artículos, Ubicaciones con grid visual, Histórico, Configuración), componentes UI reutilizables (Button, Field, Modal, Badge, States, Pagination…), hooks TanStack Query por dominio, contexto de Auth/Toast/Confirm (sin `window.alert`/`confirm`).
- **Autenticación/autorización**: JWT sin estado en servidor, roles ADMIN/OPERATOR aplicados en backend (no solo en UI).
- **README.md** completo con instrucciones de setup, arquitectura, variables de entorno, despliegue y usuarios demo.

## Dónde mirar si algo no compila

- El módulo de conexión a DB es `server/db/index.ts` — usa `@neondatabase/serverless` + `drizzle-orm/neon-serverless` (requiere `ws` para WebSocket en Node). **No lo cambies a `pg`/`node-postgres` de forma permanente** — esa fue solo la versión temporal usada para las pruebas locales de esta sesión contra el Postgres de Docker, y ya se restauró a la versión Neon correcta antes de terminar.
- Si necesitas volver a probar la capa de servicios contra un Postgres local sin Neon: puedes levantar un contenedor desechable (`docker run --rm -d -p 5544:5432 -e POSTGRES_PASSWORD=verify -e POSTGRES_USER=verify -e POSTGRES_DB=arcadia_verify postgres:16-alpine`), cargar `database/schema.sql` contra él, y sustituir temporalmente `server/db/index.ts` por una versión con `drizzle-orm/node-postgres` + `pg` (instalado con `npm install --no-save pg @types/pg`). Recuerda restaurar el archivo original al terminar.
- `npm run build` = `tsc --noEmit && vite build`. Si falla el tsc, casi siempre es por `noUncheckedIndexedAccess` (activado a propósito en `tsconfig.json`) — usa el helper `firstRow()` de `server/utils/db.ts` para desempaquetar resultados de `.returning()` o de agregados `COUNT`/`SUM` que sabes que devuelven exactamente una fila.

## Decisiones de diseño ya tomadas (no las reabras sin razón)

- Local dev vía `vercel dev` (no un servidor Express paralelo) para que el comportamiento serverless sea idéntico a producción.
- Códigos de documento (`REC-000001`, `SAL-000001`) generados con secuencias de Postgres (`nextval`) dentro de la misma transacción — evita colisiones bajo concurrencia sin lógica extra.
- Estado de ubicación (`AVAILABLE`/`PARTIAL`/`OCCUPIED`/`BLOCKED`) se **calcula**, no se guarda (excepto el flag `blocked`, que sí es manual).
- Una ubicación bloqueada no admite *entradas* de stock (recepción, transferencia destino, ajuste positivo) pero sí permite *sacar* stock de ella (picking, transferencia origen, ajuste negativo) — para poder vaciarla.
- `stock` nunca se edita directamente: solo a través de recepción/salida/transferencia/regularización, todas atómicas.
