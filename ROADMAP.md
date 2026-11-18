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
- [x] Máximo 2 reservas sin pagar a la vez por visitante (hash anónimo de la IP)
- [x] Aviso al negocio por correo en cada reserva pagada y en cada solicitud de cambio (se activa al configurar Resend)
- [x] Panel `/admin` con contraseña (`ADMIN_PASSWORD`): ingresos hoy/7 días/mes, gráfico de 30 días, próximas reservas y formularios
- [x] Cuentas de clientes opcionales (`/account`): ver reservas, reservar con sesión, editar datos, pedir cancelación o cambio (los dueños lo resuelven en `/admin`)
- [x] Enlace "Owners login" en el pie de página
- [ ] Correos con Resend: `RESEND_API_KEY` y `EMAIL_FROM` en Vercel y verificar el dominio (DNS) — sin esto no llegan los avisos ni la recuperación de contraseña
- [ ] Pasar a claves live de Stripe (cuenta activada con EIN y banco de The Bot Spot)
- [x] Formularios `/events` (eventos corporativos / arenas móviles) y `/steam` (lista de espera), colección `inquiries`
- [ ] `ADMIN_PASSWORD` en Vercel


---

## 🎨 Rediseño (rama `rediseno-arena`, pendiente de aprobar)

- [x] Inicio con arena de robots animada en 3D (`ArenaCanvas`): reflectores, robots que chocan con chispas, cámara que se inclina con el scroll
- [x] Paleta negro / naranja / blanco; títulos en Barlow Condensed
- [x] Sin precios en el inicio; sección de promociones semanales lista (`promotions` en `site.ts`, se oculta si está vacía)
- [x] Comida eliminada del sitio; un solo teléfono publicado + "We speak English & Spanish"
- [ ] Confirmar el naranja exacto de la marca (hoy `#ff7a00` en `globals.css`)
- [ ] Videos de clientes jugando (loop) y reviews de Google en el inicio — faltan los archivos
- [ ] Logo y colores oficiales en archivo

---

## Fases siguientes (sin fecha todavía)

### ✅ Fase 2 – Formulario de contacto
- [x] Formulario en `/contact` (tipo `contact` en `inquiries`); los mensajes salen en `/admin`
- [ ] Aviso por correo de cada mensaje (cuando Resend este configurado)

### ✅ Fase 3 – Tienda y carrito (nov. 2026)
- [x] Catalogo en `backend/src/shop.ts` con los precios del menu del local (tickets 2/4/10/16, camiseta $29; sin comida ni dulces) + gift cards $25/$50/$100 (montos por confirmar)
- [x] Carrito en el navegador (`/cart`), resumen y pago con Stripe (`/checkout` → `/order-confirmed`), coleccion `orders`
- [x] Pedidos y ventas de la tienda en `/admin`; el mismo webhook de Stripe confirma pedidos y reservas
- [ ] Fotos reales de los productos (`public/images/shop/`)
- [ ] Editor de productos en `/admin` para que los duenos los cambien sin programador
- [x] Codigos de gift card y tickets (`giftCards`): se generan al pagar, se ven en `/order-confirmed` y se envian por correo (con Resend)
- [x] Canje en el local desde `/admin` (dolares o tickets) y uso de gift cards al reservar en linea (descuenta del total; si cubre todo no pasa por Stripe)
- [x] Panel: ingresos separados por origen (reservas en linea, tienda en linea, terminal Clover) y por ubicacion en las ventas de terminal
- [x] Sincronizacion automatica de terminales (`terminal-sync.service.ts`): Clover (API v3) y Stripe Terminal (cobros card_present),
      cada noche por cron de Vercel (`/api/cron/terminal-sync`) o con "Sync now" en `/admin`. Sin duplicados (id = id del pago)
- [ ] Conectar Clover: crear token de API en Clover (permiso de lectura de Payments) y poner `CLOVER_API_TOKEN`,
      `CLOVER_MERCHANT_ID` y `CRON_SECRET` en Vercel. Mientras tanto, registro manual en `/admin`
- [ ] Usar gift cards tambien para pagar en la tienda en linea

### Fase 4 – Contenido y extras
- [x] Dirección y mapa en `/location`: arena en 255 N University Ave, Provo; clases STEAM en 1201 N 800 E, Orem
- [x] Fotos reales en galeria, Parties, STEAM y tienda (`frontend/public/images/gallery`, lista en `site.ts`) — confirmar permiso de uso
- [ ] Videos de la galería
- [ ] Conectar el dominio `thebotspot.org` en Vercel
