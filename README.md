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
REST API propia (api/*.ts)
        │  llama a
        ▼
server/services/*.ts  (lógica de negocio, transacciones)
        │  usa
        ▼
Drizzle ORM  (server/db/schema.ts)
        │
        ▼
Neon PostgreSQL
```

- El frontend **nunca** habla directamente con Neon. Todo pasa por `/api/*`.
- Frontend y API se despliegan **en el mismo proyecto de Vercel**: el frontend es un build estático de Vite y cada archivo bajo `api/` se convierte automáticamente en una Vercel Function con el runtime Node.js oficial.
- Cada función es un handler HTTP delgado (`api/**/*.ts`): valida método y query/params, delega en `server/services/*.ts` para la lógica de negocio y usa `server/utils/http.ts` para dar una respuesta consistente.
- La conexión a Neon usa `@neondatabase/serverless` (`Pool` sobre WebSocket) + `drizzle-orm/neon-serverless`, centralizada en `server/db/index.ts`. Esto permite transacciones interactivas reales (`db.transaction`) en un entorno serverless, y el pool se reutiliza entre invocaciones cuando la instancia de la función sigue "caliente".
- **Integridad de stock**: toda operación que cambia stock (recepción, picking, transferencia, regularización) ocurre dentro de una transacción de PostgreSQL. Para evitar condiciones de carrera, la resta de stock usa `SELECT ... FOR UPDATE` para bloquear la fila antes de comprobar y descontar cantidad — así dos peticiones concurrentes nunca pueden dejar stock negativo.

## Project structure

```
ArcadiaWMS/
├── api/                    # Vercel Functions (handlers HTTP finos)
│   ├── auth/                  login, me
│   ├── items/                 CRUD de artículos
│   ├── categories/            CRUD de categorías
│   ├── warehouses/            listado de almacenes
│   ├── locations/              CRUD de ubicaciones
│   ├── stock/                  consulta de stock
│   ├── receipts/                recepciones + recibir línea
│   ├── outbound-orders/         salidas + preparar línea
│   ├── transfers/                transferencias
│   ├── adjustments/              regularizaciones
│   ├── movements/                histórico
│   └── dashboard/                resumen del dashboard
│
├── server/                  # Lógica de negocio y acceso a datos
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
npm run build       # tsc --noEmit + build de producción de Vite
npm run typecheck   # solo comprobación de tipos
npm run lint         # ESLint
npm run test         # vitest (lógica de negocio sensible)
```

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
4. Despliega. El frontend se sirve como estático desde `dist/` y cada archivo de `api/` se despliega como una Vercel Function (Node.js runtime).
5. Verifica que `database/schema.sql` ya se ejecutó contra tu base de Neon de producción antes de probar el login.

## Security notes

- Contraseñas hasheadas con `bcryptjs` (nunca en texto plano).
- Sesión basada en JWT sin estado en el servidor (nada de sesiones en memoria — compatible con serverless).
- Autorización por rol comprobada en cada endpoint del backend, no solo ocultando botones en el frontend.
- Toda entrada (body, query, params) se valida con Zod antes de tocar la base de datos.
- Queries parametrizadas vía Drizzle (sin concatenación de SQL).
- Los errores nunca exponen stack traces ni detalles internos al cliente.
- `DATABASE_URL` y `JWT_SECRET` existen únicamente en el servidor.

## Pending / known limitations

Ver [`PROGRESS.md`](PROGRESS.md) para el estado detallado de la sesión de construcción y qué queda por hacer antes de considerar el proyecto 100% cerrado (principalmente: probar el flujo completo contra un Neon real y en el navegador, ya que en el entorno de desarrollo no había credenciales de Neon disponibles).
