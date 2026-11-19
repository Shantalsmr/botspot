# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Proyecto

Sitio web de **The Bot Spot** (arcade de batallas de robots en Provo, Utah). Migrado de WordPress a
**Next.js 16 + React 19 + TypeScript**, desplegado en **Vercel**, con **Firebase/Firestore** como base de datos.

- Repositorio: `https://github.com/Shantalsmr/botspot` (rama principal: `main`)
- Cada push a `main` despliega en Vercel (Root Directory: `frontend`).
- Idioma: la documentación, comentarios y commits van en **español**; el contenido visible del sitio va en **inglés**.

## Comandos

Node >= 20.9 (ver `.nvmrc`: 22). Todo se corre desde la raíz (npm workspaces):

```bash
npm install          # instala los 3 paquetes
npm run dev          # http://localhost:3000
npm run build        # build de producción (como Vercel)
npm run typecheck    # tsc --noEmit en frontend, backend y database
```

No hay tests ni linter configurados todavía. Antes de terminar un cambio, correr `npm run typecheck` y `npm run build`.

## Arquitectura (monorepo, 3 paquetes)

```
frontend/   @botspot/frontend  → Next.js App Router (páginas .tsx y rutas /api). Lo que Vercel despliega.
backend/    @botspot/backend   → Lógica de la API (servicios). Solo servidor.
database/   @botspot/database  → Conexión Firebase Admin / Firestore. Solo servidor.
```

Flujo obligatorio: **`frontend` (página o `app/api/*/route.ts`) → `backend` (servicio) → `database` (Firestore)**.

- El navegador **nunca** habla directo con Firestore. `database/firestore.rules` bloquea todo; solo el Admin SDK accede.
- `backend` y `database` se publican como TypeScript sin compilar (`exports: ./src/index.ts`); Next los transpila vía
  `transpilePackages` en `frontend/next.config.ts`. Todo lo público se exporta desde su `src/index.ts`.
- `backend` y `database` importan `"server-only"` — no usarlos desde componentes cliente.
- `firebase-admin` está en `serverExternalPackages`; las rutas que lo usan deben declarar
  `export const runtime = "nodejs"` (y `dynamic = "force-dynamic"` si no deben cachearse).

### Convenciones

- **Rutas /api delgadas**: solo llaman a un servicio del backend y responden con `ok(data)` / `fail(code, message, status)`
  de `backend/src/lib/api-response.ts` (forma `{ ok: true, data }` | `{ ok: false, error: { code, message } }`).
- **Servicios** en `backend/src/services/<nombre>.service.ts`.
- **Colecciones** de Firestore declaradas solo en `database/src/collections.ts` (`COLLECTIONS`).
- **Firestore**: usar `getDb()` (singleton, reutilizado entre invocaciones serverless).
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Cliente en
  `backend/src/lib/stripe.ts`. Precios, horario y capacidad de reservas en `backend/src/catalog.ts` (módulo puro,
  importable desde el cliente como `@botspot/backend/catalog`); el precio siempre se calcula en el servidor.
- **Panel `/admin`**: una contraseña (`ADMIN_PASSWORD`) y cookie firmada (`backend/src/services/admin.service.ts`);
  bloqueo tras 10 intentos fallidos. Formularios de eventos/STEM en `inquiry.service.ts` (colección `inquiries`).
  Plantillas y precios de cotización de eventos por tipo de cliente en `backend/src/event-quotes.ts` (módulo puro,
  `@botspot/backend/event-quotes`); el armador está en `components/QuoteBuilder.tsx`. Las cotizaciones enviadas y su
  conversación con el cliente viven en `event-quote.service.ts` (colección `eventQuotes`, ligada por correo) y se
  muestran con `components/QuoteThread.tsx` en `/admin` y `/account`. Millas por carretera desde la arena en
  `distance.service.ts` (Google Maps si hay `GOOGLE_MAPS_API_KEY`; si no, OpenStreetMap Nominatim + OSRM).
- **Cuentas de clientes** (`customer.service.ts`): correo + contraseña (scrypt), cookie firmada (`lib/session.ts`),
  id del documento = hash del correo. Solicitudes de cambio en `booking-request.service.ts`. Correos en `lib/email.ts`
  (Resend; si falta `RESEND_API_KEY` no se envía nada). Helpers de sesión para rutas: `frontend/src/lib/server.ts`.
- **Tienda** (`backend/src/shop.ts`, importable como `@botspot/backend/shop`): carrito en el navegador (`components/Cart.tsx`),
  pedidos en `order.service.ts` (coleccion `orders`). Gift cards y tickets en `giftcard.service.ts` (coleccion `giftCards`,
  id = codigo `BOT-XXXX-XXXX`); se canjean en `/admin` o al reservar. Ventas de la terminal en
  `terminal.service.ts`; las de Clover / Stripe Terminal se traen solas con `terminal-sync.service.ts`
  (`CLOVER_API_TOKEN`, `CLOVER_MERCHANT_ID`, opcional `CLOVER_ENV=sandbox` y `TERMINAL_LOCATION`; cron diario en
  `frontend/vercel.json` protegido con `CRON_SECRET`). El webhook de Stripe atiende reservas (`metadata.bookingId`) y pedidos (`metadata.orderId`).
- **Variables de entorno** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) se leen en
  `database/src/env.ts`; si faltan, el sitio sigue funcionando sin base de datos. Local: `frontend/.env.local`.
- **Datos del negocio** (teléfonos, horarios, precio, FAQ, actividades, nav) viven en `frontend/src/content/site.ts`;
  no hardcodearlos en las páginas.
- Alias `@/*` → `frontend/src/*`. Estilos globales en `frontend/src/app/globals.css` (sin Tailwind/CSS modules).
- Componentes compartidos en `frontend/src/components/` (`SiteHeader`, `SiteFooter`, `PageHeader`, `ComingSoon`).
- Funciones aún no construidas pueden usar `<ComingSoon feature="..." />` (hoy ninguna página lo usa).
- TypeScript estricto con `noUncheckedIndexedAccess` (`tsconfig.base.json`).
- URLs viejas de WordPress se redirigen en `next.config.ts` (`redirects()`).

## Seguridad

- Nunca commitear `.env`, `.env*.local` ni `service-account*.json` (ya están en `.gitignore`).
- `subir_a_github.bat` es un script local ignorado por git.

## Plan de trabajo

Ver `ROADMAP.md`. Fases 0–3 listas (base, reservas con Stripe, contacto, tienda y gift cards) y rediseño del inicio en `main`.
Reservas probadas de punta a punta (nov. 2026). El sitio se presentó al cliente (David Sopetti) el 18 nov. 2026 y le gustó;
**en curso: aplicar su feedback** (y el de Jerome y otro ingeniero). Falta la configuración de producción (variables en Vercel,
webhook de Stripe, Resend, claves live de Stripe, dominio). Avanzar un cambio a la vez: terminar, probar y desplegar antes de seguir.

La copia original de WordPress está en el historial de git (commit `14ef4ba`).
