# Arcadia WMS

Un Warehouse Management System (WMS) moderno para PYMEs: entradas, salidas, movimientos internos, regularizaciones, trazabilidad de stock y un dashboard operativo. Construido como proyecto de portfolio Full Stack con React + TypeScript en el frontend y Node.js + TypeScript sobre Vercel Functions en el backend, con Neon PostgreSQL como base de datos.

## Demo

- URL de producción: _pendiente de desplegar (ver sección Deployment on Vercel)_
- Usuarios de demostración: ver [Demo users](#demo-users)

## Screenshots

_Pendiente: añadir capturas del dashboard, ubicaciones, recepción y histórico una vez desplegado._

## Features

- **Dashboard**: artículos activos, stock total, ocupación de ubicaciones, entradas/salidas pendientes, movimientos de los últimos 7 días y stock por categoría.
- **Artículos**: catálogo maestro con SKU único, categoría, stock mínimo, alta/baja lógica (nunca se borran físicamente).
- **Ubicaciones**: mapa visual del almacén por zonas con estado calculado (`AVAILABLE` / `PARTIAL` / `OCCUPIED` / `BLOCKED`) y ocupación en tiempo real.
- **Stock**: consulta de existencias por artículo + ubicación, siempre de solo lectura — el stock solo cambia a través de operaciones transaccionales.
- **Entradas (recepciones)**: cabecera + líneas, recepción parcial o completa, actualización automática de estado (`PENDING` → `RECEIVING` → `COMPLETED`).
- **Salidas (pedidos)**: cabecera + líneas, preparación (picking) con selección de ubicación origen y validación de stock disponible.
- **Movimientos internos**: transferencias entre ubicaciones en un único formulario guiado.
- **Regularizaciones**: incrementos/decrementos de inventario con motivo (recuento, daño, pérdida, error, otro), sin permitir stock negativo.
- **Histórico**: trazabilidad completa de todos los movimientos de stock, con filtros por tipo, artículo, ubicación y fecha.
- **Autenticación y autorización**: JWT con roles `ADMIN` / `OPERATOR`, validado en el backend en cada petición (no solo ocultando botones).

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router
- TanStack Query (fetching, caching, mutaciones)
- Recharts (gráficos del dashboard)
- Zod (validación de formularios donde aporta valor)
- Lucide Icons

**Backend**
- Node.js + TypeScript
- Vercel Functions (runtime Node.js oficial, sin Express permanente)
- Drizzle ORM
- Zod (validación de request body/query)
- JWT (`jsonwebtoken`) + `bcryptjs`

**Database**
- Neon PostgreSQL (serverless, gestionado)

## Architecture

```
React + TypeScript (Vite)
        │  fetch a rutas relativas /api/*
        ▼
api/[...path].ts        (única Vercel Function: catch-all)
        │  despacha con la tabla de rutas de
        ▼
server/routes/*.ts      (handlers HTTP finos)
        │  llaman a
        ▼
server/services/*.ts    (lógica de negocio, transacciones)
        │  usa
        ▼
Drizzle ORM  (server/db/schema.ts)
        │
        ▼
Neon PostgreSQL
```

- El frontend **nunca** habla directamente con Neon. Todo pasa por `/api/*`.
- Frontend y API se despliegan **en el mismo proyecto de Vercel**: el frontend es un build estático de Vite y `api/[...path].ts` se despliega como Vercel Function con el runtime Node.js oficial.
- **Una sola función para toda la API.** Vercel convierte cada archivo bajo `api/` en su propia Serverless Function, y el plan Hobby limita un proyecto que no sea Next.js/SvelteKit a **12 funciones por despliegue**; esta API tiene 21 rutas. Por eso los handlers viven en `server/routes/` (fuera de `api/`, donde Vercel no los ve) y un único `api/index.ts` los despacha con una tabla de rutas explícita. Como efecto secundario deseable, hay una sola instancia caliente y **un solo pool de conexiones a Neon** en lugar de 21.
- El enrutado hacia esa función se hace con un **rewrite explícito** en `vercel.json` (`/api/(.*)` → `/api?path=$1`), no con un nombre de archivo catch-all `[...path].ts`: en la práctica el catch-all solo capturaba un segmento, así que `/api/auth/login` ni llegaba a la función. El rewrite es inequívoco e independiente del framework.
- Cada handler (`server/routes/**/*.ts`) es delgado: valida método y query/params, delega en `server/services/*.ts` para la lógica de negocio y usa `server/utils/http.ts` para dar una respuesta consistente. El router les pasa los parámetros de ruta (`:id`) como tercer argumento.
- La tabla de rutas de `server/routes/router.ts` **es** la superficie de la API, legible de un vistazo, y está cubierta por tests unitarios.
- La conexión a Neon usa `@neondatabase/serverless` (`Pool` sobre WebSocket) + `drizzle-orm/neon-serverless`, centralizada en `server/db/index.ts`. Esto permite transacciones interactivas reales (`db.transaction`) en un entorno serverless, y el pool se reutiliza entre invocaciones cuando la instancia de la función sigue "caliente".
- **Integridad de stock**: toda operación que cambia stock (recepción, picking, transferencia, regularización) ocurre dentro de una transacción de PostgreSQL, con dos niveles de bloqueo:
  - la resta de stock hace `SELECT ... FOR UPDATE` sobre la fila de `stock` antes de comprobar y descontar, así que dos peticiones concurrentes nunca pueden dejar stock negativo;
  - recibir o preparar una línea bloquea además la **cabecera del documento** (`SELECT ... FOR UPDATE` sobre `receipts` / `outbound_orders`), de modo que un doble clic o un reintento del navegador no puede aplicar la misma operación dos veces ni descuadrar `received_quantity` / `picked_quantity` respecto al stock real.

## Project structure

```
ArcadiaWMS/
├── api/
│   └── index.ts            # La única Vercel Function: reexporta el router
│
├── server/                  # Lógica de negocio y acceso a datos
│   ├── routes/                 router.ts (tabla de rutas) + un handler por endpoint
│   │   ├── auth/                  login, me
│   │   ├── items/                 listado + detalle/edición
│   │   ├── categories/            listado + edición
│   │   ├── warehouses/            listado de almacenes
│   │   ├── locations/             listado + detalle/edición
│   │   ├── stock/                 consulta de stock y stock por artículo
│   │   ├── receipts/              recepciones + recibir línea
│   │   ├── outbound-orders/       salidas + preparar línea
│   │   ├── transfers/             transferencias
│   │   ├── adjustments/           regularizaciones
│   │   ├── movements/             histórico
│   │   └── dashboard/             resumen del dashboard
│   ├── db/                     schema.ts (Drizzle) + index.ts (conexión Neon)
│   ├── auth/                   jwt.ts, password.ts, middleware.ts
│   ├── services/                un archivo por dominio (items, stock, receipts…)
│   ├── validators/              esquemas Zod por dominio
│   └── utils/                   errores, respuestas HTTP, códigos de documento
│
├── src/                      # Frontend React
│   ├── components/              ui/ (genéricos), layout/, domain/ (específicos WMS)
│   ├── pages/                    una carpeta por módulo
│   ├── hooks/                    TanStack Query por dominio
│   ├── services/                  cliente fetch + funciones por recurso
│   ├── context/                   Auth, Toast, Confirm
│   ├── layouts/                   AppLayout (sidebar + header)
│   └── types/                     tipos compartidos con el backend
│
├── database/
│   └── schema.sql            # Fuente de verdad del esquema + datos demo
│
├── .env.example
├── vercel.json
└── package.json
```

## Database setup

La base de datos se crea **manualmente ejecutando SQL**, no con migraciones de Drizzle.

1. Crea un proyecto en [Neon](https://neon.tech).
2. Abre el **SQL Editor** del proyecto.
3. Copia y ejecuta el contenido completo de [`database/schema.sql`](database/schema.sql).
   - Crea todas las tablas, enums, índices, checks y secuencias.
   - Inserta datos demo coherentes: 1 almacén, 24 ubicaciones, 5 categorías, 15 artículos, 4 recepciones, 4 pedidos de salida y ~23 movimientos históricos, todos derivados de un único ledger de movimientos (así que los números siempre cuadran).
   - Crea 2 usuarios demo (ver [Demo users](#demo-users)).
   - El script empieza con `DROP ... IF EXISTS`, así que es seguro volver a ejecutarlo para resetear la base de datos.
4. Copia la **connection string** (la "pooled connection") desde el dashboard de Neon.
5. Pégala como `DATABASE_URL` en tu `.env` (ver siguiente sección).

> El esquema Drizzle en `server/db/schema.ts` refleja exactamente `database/schema.sql` y se usa solo para construir queries tipadas desde la API — no para crear la base de datos.

## Environment variables

Copia `.env.example` a `.env` y rellena:

```bash
DATABASE_URL=       # connection string de Neon (pooled connection)
JWT_SECRET=          # cadena aleatoria larga, p.ej. `openssl rand -base64 48`
JWT_EXPIRES_IN=8h    # opcional, duración de la sesión
```

Todas son variables **solo de servidor** (ninguna lleva el prefijo `VITE_`, así que nunca se incluyen en el bundle del frontend). El frontend llama a la API mediante rutas relativas `/api/*`, por lo que no hace falta configurar ninguna URL pública de API.

## Local development

```bash
npm install
npm run dev
```

`npm run dev` ejecuta `vercel dev`, que sirve el frontend (Vite) y las funciones de `api/` juntos en `http://localhost:3000`, igual que en producción. La primera vez te pedirá vincular el proyecto a tu cuenta de Vercel (`vercel login`) — puedes aceptar la configuración por defecto.

Si prefieres iterar solo en el frontend sin las funciones serverless, `npm run dev:vite` levanta únicamente Vite en `http://localhost:5173` (las llamadas a `/api/*` fallarán salvo que apuntes el proxy de `vite.config.ts` a una instancia de `vercel dev` ya corriendo en el puerto 3000).

Otros comandos:

```bash
npm run build       # check:imports + tsc --noEmit + build de producción de Vite
npm run check:imports # verifica que los imports del backend funcionarán en Vercel
npm run typecheck   # solo comprobación de tipos
npm run lint         # ESLint
npm run test         # vitest (lógica de negocio sensible)
```

El proyecto fija `engines.node` a **22.x** (Node 20 queda deprecado en Vercel el 1 de octubre de 2026).

> **Imports del backend: la extensión `.js` es obligatoria.** Vercel compila `api/` y `server/` a JavaScript y lo ejecuta como ESM, y el resolvedor de Node **no adivina extensiones ni resuelve imports de directorio**. Un `from "../utils/http"` compila sin problema con TypeScript y luego revienta en producción con `ERR_MODULE_NOT_FOUND`, tumbando la función entera. Por eso todos los imports relativos de `api/` y `server/` llevan `.js` explícito (`from "../utils/http.js"`, `from "../db/index.js"`), apuntando al archivo `.ts` correspondiente. `npm run build` lo comprueba antes de compilar, porque ni `tsc --noEmit` ni vitest detectan el problema: cada uno resuelve los imports a su manera.

## Demo users

| Rol       | Usuario    | Contraseña     |
|-----------|------------|----------------|
| ADMIN     | `admin`    | `Admin123!`    |
| OPERATOR  | `operator` | `Operator123!` |

Puedes iniciar sesión con el **usuario o el email** (`admin@arcadiawms.com` / `operator@arcadiawms.com`).

- **ADMIN**: acceso completo, incluyendo maestros (artículos, categorías, ubicaciones) y Configuración.
- **OPERATOR**: operaciones habituales de almacén (recepciones, salidas, transferencias, regularizaciones) y consulta. No ve el menú de Configuración ni puede crear/editar maestros — el backend rechaza esas peticiones con 403 aunque se llamen directamente a la API.

## Deployment on Vercel

1. Sube este repositorio a GitHub (ya está conectado a `https://github.com/JoseAQuinto/ArcadiaWMS`).
2. En [vercel.com](https://vercel.com), **Add New Project** → importa el repositorio. Vercel detecta Vite automáticamente.
3. En **Project Settings → Environment Variables**, añade `DATABASE_URL` y `JWT_SECRET` (los mismos valores que en tu `.env`, o unos de producción independientes).
4. Despliega. El frontend se sirve como estático desde `dist/` y `api/[...path].ts` se despliega como una única Vercel Function (Node.js runtime) que atiende toda la API.
   - Si añades endpoints, hazlo en `server/routes/` y regístralos en la tabla de `server/routes/router.ts`. **No** crees archivos nuevos dentro de `api/`: cada uno sería una función más y el plan Hobby corta en 12.
5. Verifica que `database/schema.sql` ya se ejecutó contra tu base de Neon de producción antes de probar el login.

## Security notes

- Contraseñas hasheadas con `bcryptjs` (nunca en texto plano).
- Sesión basada en JWT sin estado en el servidor (nada de sesiones en memoria — compatible con serverless).
- Autorización por rol comprobada en cada endpoint del backend, no solo ocultando botones en el frontend.
- Toda entrada (body, query, params) se valida con Zod antes de tocar la base de datos.
- Queries parametrizadas vía Drizzle (sin concatenación de SQL).
- Los errores nunca exponen stack traces ni detalles internos al cliente.
- `DATABASE_URL` y `JWT_SECRET` existen únicamente en el servidor.
- Un 401 del backend (token caducado o `JWT_SECRET` rotado) cierra la sesión en el frontend y devuelve al login, en lugar de dejar la aplicación en un estado "logueado" que falla en cada pantalla.

Compromisos asumidos conscientemente (documentados, no olvidados):

- El JWT se guarda en `localStorage`, no en una cookie `httpOnly`. Es lo que permite que el frontend sea 100% estático y la API sin estado; a cambio, un XSS podría leer el token. Para un despliegue con datos reales, el siguiente paso sería mover la sesión a cookie `httpOnly` + `SameSite=Strict`.
- El endpoint de login no tiene rate limiting. En Vercel lo natural sería resolverlo con Vercel Firewall / rate limiting de plataforma antes que en el propio handler.

## Pending / known limitations

- **La capacidad de una ubicación es informativa, no se aplica.** Se usa para calcular el estado (`AVAILABLE` / `PARTIAL` / `OCCUPIED`) y el porcentaje de ocupación, pero una recepción, transferencia o regularización puede dejar una ubicación por encima de su capacidad (el porcentaje se muestra topado al 100%). Es una decisión deliberada para no bloquear operaciones en almacenes cuyos datos de capacidad no estén afinados; si algún día se quiere aplicar de verdad, el sitio es `increaseStock` en `server/services/stock.service.ts`.
- **No hay pantalla de detalle de artículo.** El endpoint `GET /api/items/:id` y su cliente tipado (`fetchItem` / `useItem`) existen y están probados, pero todavía no hay una vista que los consuma; el listado y el modal de edición cubren el flujo actual.
- **Filtros de fecha del histórico en UTC.** `dateFrom` / `dateTo` se interpretan como días UTC, no en la zona horaria del navegador. Con un almacén en un único huso es irrelevante; conviene tenerlo en cuenta si algún día hay operación en varias zonas.
- Sin desplegar todavía: falta la URL de demo pública en Vercel y las capturas del README.

Ver [`PROGRESS.md`](PROGRESS.md) para el estado detallado y cómo se ha verificado cada flujo.
