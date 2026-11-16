# Plan de trabajo – The Bot Spot

Vamos a avanzar **poco a poco**, una función a la vez. Cada fase se termina, se prueba y se despliega en Vercel antes de empezar la siguiente.

## ✅ Fase 0 – Base del proyecto (lista)

- [x] Migrar el sitio de WordPress a **Next.js + TypeScript** (todas las páginas en `.tsx`)
- [x] Separar el proyecto en **frontend**, **backend** y **database**
- [x] Conexión básica a **Firebase / Firestore** (`database/src/client.ts`)
- [x] Ruta de prueba `GET /api/health` que confirma la conexión
- [x] Reglas de Firestore cerradas por defecto (solo el backend accede)
- [x] Redirecciones de las URLs viejas de WordPress (`/check-out`, `/index.php/...`)
- [x] Listo para desplegar en Vercel (Root Directory: `frontend`)

**Para cerrar la fase 0:** crear el proyecto en Firebase, poner las variables en Vercel y ver `"connected"` en `/api/health`.

---

## 🚧 Fase 1 – Reservas (en curso)

Reemplaza el plugin BookingPress de WordPress. Datos del negocio confirmados (Notion, nov. 2026):
precios en `backend/src/catalog.ts`, horario L–J 5–9:30 PM, V 5–10:30 PM, S 12–10:30 PM, domingo cerrado.

**Hecho:**

- [x] Catálogo: batalla 30 min ($15/persona), 1 hora ($25/persona o grupos 4=$90, 8=$150, 16=$280), evento privado 2 h ($400)
- [x] Capacidad 16 personas a la vez; bloques de 30 min; el cupo se aparta 30 min mientras se paga (transacción Firestore)
- [x] `GET /api/bookings/availability`, `POST /api/bookings/checkout` (Stripe Checkout), `POST /api/stripe/webhook`
- [x] `/book-appointment`, `/thank-you` (confirma el pago con Stripe), `/cancellation-policy` (propuesta)
- [x] Probado en local con tarjeta de test 4242

**Pendiente:**

- [ ] Variables en Vercel (Stripe + Firebase) y webhook en Stripe → `/api/stripe/webhook`
- [ ] Aprobar con el negocio: política de cancelación y precio de grupos intermedios (p. ej. 6 personas = $140)
- [ ] Limitar reservas pendientes por visitante (evitar que alguien aparte cupos sin pagar)
- [ ] Aviso al negocio por correo (info@thebotspot.org) en cada reserva
- [ ] `/my-bookings` y panel para ver las reservas del día
- [ ] Pasar a claves live de Stripe (cuenta activada con EIN y banco de The Bot Spot)
- [ ] Formularios: eventos corporativos (correo, teléfono, dirección, tipo) y lista de espera STEAM


---

## Fases siguientes (sin fecha todavía)

### Fase 2 – Formulario de contacto
- [ ] Formulario en `/contact` que guarde el mensaje en Firestore y avise por correo

### Fase 3 – Tienda y carrito
- [ ] Productos y paquetes guardados en Firestore (gorras, snacks, paquetes de fiesta)
- [ ] Carrito en `/cart` y pedido en `/checkout`
- [ ] Pagos en línea (por definir: Stripe, Square...)

### Fase 4 – Contenido y extras
- [ ] Dirección exacta y mapa en `/location`
- [ ] Más fotos y los videos de la galería
- [ ] Conectar el dominio `thebotspot.org` en Vercel
