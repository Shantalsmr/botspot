# The Bot Spot 🤖 – It's Battle Time

Sitio web de **The Bot Spot**, arcade de batallas de robots en el centro de Provo, Utah.

Reconstruido desde WordPress a **TypeScript** con **Next.js**, listo para desplegarse en **Vercel**, y con **Firebase (Firestore)** como base de datos.

---

## Estructura del proyecto

```
thebotspot/
├── frontend/              → Sitio web (Next.js + React + TypeScript). Es lo que Vercel despliega.
│   ├── public/images/     → Imágenes del sitio
│   └── src/
│       ├── app/           → Páginas (.tsx) y rutas de la API
│       │   ├── page.tsx           → Inicio  (/)
│       │   ├── parties/           → /parties
│       │   ├── shop/              → /shop
│       │   ├── gallery/           → /gallery
│       │   ├── faq/               → /faq
│       │   ├── location/          → /location
│       │   ├── contact/           → /contact
│       │   ├── book-appointment/  → /book-appointment   (próximamente)
│       │   ├── my-bookings/       → /my-bookings        (próximamente)
│       │   ├── cart/, checkout/   → /cart, /checkout    (próximamente)
│       │   ├── thank-you/         → /thank-you
│       │   └── api/health/        → GET /api/health  (prueba de conexión)
│       ├── components/    → Piezas reutilizables (header, footer, etc.)
│       ├── content/       → Datos del negocio: teléfonos, horarios, FAQ, actividades
│       └── fonts/         → Fuente Figtree
│
├── backend/               → Lógica del servidor (TypeScript). Las rutas /api solo llaman aquí.
│   └── src/
│       ├── lib/           → Utilidades (formato de respuestas de la API)
│       └── services/      → Servicios (por ahora: health)
│
├── database/              → Conexión a Firebase / Firestore (TypeScript)
│   ├── src/
│   │   ├── client.ts      → Inicializa Firebase Admin una sola vez
│   │   ├── env.ts         → Lee las variables de entorno
│   │   ├── collections.ts → Nombres de las colecciones
│   │   └── health.ts      → Prueba de conexión
│   ├── firestore.rules    → Reglas de seguridad (todo bloqueado; solo el backend accede)
│   └── firebase.json      → Config para la Firebase CLI
│
├── .env.example           → Variables de entorno necesarias
├── ROADMAP.md             → Plan de trabajo (siguiente paso: reservas)
└── package.json           → Monorepo (npm workspaces)
```

**Cómo se conectan:** `frontend` (página o ruta `/api`) → `backend` (lógica) → `database` (Firestore).
El navegador nunca habla directo con Firestore; todo pasa por el servidor.

---

## Correr el proyecto en tu computadora

Necesitas **Node.js 20.9 o más nuevo** (recomendado 22).

```bash
npm install          # instala todo (frontend, backend y database)
npm run dev          # abre http://localhost:3000
```

Otros comandos:

```bash
npm run build        # compila el sitio como en Vercel
npm run typecheck    # revisa los tipos de TypeScript en los 3 paquetes
```

---

## Configurar Firebase (base de datos)

1. Entra a <https://console.firebase.google.com> y crea un proyecto (o usa uno de Google Cloud).
2. **Build → Firestore Database → Create database** (modo producción).
3. **Project settings → Service accounts → Generate new private key**. Se descarga un `.json`.
4. Copia `.env.example` como `frontend/.env.local` y llena con los datos del `.json`:
   - `FIREBASE_PROJECT_ID` → `project_id`
   - `FIREBASE_CLIENT_EMAIL` → `client_email`
   - `FIREBASE_PRIVATE_KEY` → `private_key` (entre comillas)
5. Abre <http://localhost:3000/api/health>. Si ves `"status": "connected"`, ¡ya está conectado!

> ⚠️ Nunca subas el `.json` ni el `.env.local` a GitHub (ya están en `.gitignore`).

Opcional, para publicar las reglas de seguridad con la Firebase CLI:

```bash
cd database
cp .firebaserc.example .firebaserc   # pon tu project id
npx firebase-tools deploy --only firestore:rules
```

---

## Desplegar en Vercel

1. En <https://vercel.com/new> importa el repositorio `Shantalsmr/thebotspot`.
2. En **Root Directory** elige **`frontend`** (Vercel detecta Next.js solo).
3. En **Environment Variables** agrega `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.
4. **Deploy**. Cada `git push` a `main` vuelve a desplegar automáticamente.
5. Revisa `https://TU-DOMINIO/api/health` para confirmar la conexión con Firebase.

Para usar `thebotspot.org`: en Vercel → **Settings → Domains** agrega el dominio y sigue las instrucciones de DNS.

---

## Sitio anterior (WordPress)

La copia original del sitio de WordPress se quitó de la carpeta para dejar el proyecto limpio,
pero sigue guardada en el historial de Git (commit `14ef4ba`). Para verla:

```bash
git checkout 14ef4ba -- thebotspot.org
```
