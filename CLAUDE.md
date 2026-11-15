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
- **Variables de entorno** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) se leen en
  `database/src/env.ts`; si faltan, el sitio sigue funcionando sin base de datos. Local: `frontend/.env.local`.
- **Datos del negocio** (teléfonos, horarios, precio, FAQ, actividades, nav) viven en `frontend/src/content/site.ts`;
  no hardcodearlos en las páginas.
- Alias `@/*` → `frontend/src/*`. Estilos globales en `frontend/src/app/globals.css` (sin Tailwind/CSS modules).
- Componentes compartidos en `frontend/src/components/` (`SiteHeader`, `SiteFooter`, `PageHeader`, `ComingSoon`).
- Funciones aún no construidas usan `<ComingSoon feature="..." />` (book-appointment, my-bookings, cart, checkout, shop).
- TypeScript estricto con `noUncheckedIndexedAccess` (`tsconfig.base.json`).
- URLs viejas de WordPress se redirigen en `next.config.ts` (`redirects()`).

## Seguridad

- Nunca commitear `.env`, `.env*.local` ni `service-account*.json` (ya están en `.gitignore`).
- `subir_a_github.bat` es un script local ignorado por git.

## Plan de trabajo

Ver `ROADMAP.md`. Fase 0 (base) lista; **siguiente: Fase 1 – Reservas** (`/book-appointment`, `/thank-you`,
`/my-bookings`, colección `bookings`). Avanzar una fase a la vez: terminar, probar y desplegar antes de seguir.

La copia original de WordPress está en el historial de git (commit `14ef4ba`).
