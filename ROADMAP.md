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

## 🔜 Fase 1 – Reservas (lo siguiente)

Reemplaza el plugin BookingPress de WordPress. Páginas: `/book-appointment`, `/thank-you`, `/my-bookings`.

**Antes de empezar, definir con el negocio:**

- [ ] Tipos de reserva (p. ej. batalla de robots, fiesta de cumpleaños, grupo/evento) y precio de cada una ($25 por persona)
- [ ] Duración de cada sesión y cuántas personas por arena (máx. 8, 2 arenas)
- [ ] Horarios disponibles (confirmar: la página de Contacto y el FAQ tenían horarios distintos)
- [ ] ¿Se paga en línea al reservar o se paga en el local?
- [ ] ¿Quién recibe el aviso de una reserva nueva (correo, WhatsApp...)?

**Trabajo técnico:**

- [ ] `database`: tipo `Booking` y colección `bookings` en Firestore
- [ ] `backend`: servicio de reservas (crear, validar, revisar disponibilidad, cancelar)
- [ ] `frontend`: rutas `POST /api/bookings` y `GET /api/bookings/availability`
- [ ] `frontend`: formulario de reserva en `/book-appointment` (fecha, hora, personas, datos de contacto)
- [ ] `frontend`: página `/thank-you` con el número de reserva
- [ ] Correo de confirmación al cliente y aviso al negocio
- [ ] `/my-bookings`: el cliente consulta su reserva (con correo + número de reserva)
- [ ] Panel simple para que el negocio vea las reservas del día

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
