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

## ✅ Presentación al cliente (18 nov. 2026)

- [x] Sitio presentado a David Sopetti: le encantó. Envió sugerencias y pidió a Jerome y a otro ingeniero que lo revisen
- [x] Recibir el feedback de David (audio del 18 nov.)
- Le gustó: la arena 3D del inicio con los robots peleando, Parties, Shop, Location y la cuenta del cliente (el ícono de la personita). Sin cambios ahí.

**Cambios rápidos:**

- [x] STEM en vez de STEAM (sobra la A) en títulos, menú, formularios y `/admin`; `/steam` → `/stem` con redirección
      (el tipo interno `steam` en la colección `inquiries` se dejó igual para no romper los registros guardados)
- [x] Teléfono único publicado: **(801) 471-5678** (reemplaza al (385) 283-2039)
- [x] Redes en orden Instagram, TikTok, Facebook (contacto, torneos y pie de página)
- [ ] Poner el enlace de TikTok en `site.social.tiktok`: el botón aparece solo cuando hay enlace
- [x] `/events`: campo obligatorio "How many people?" con rangos (`EVENT_GROUP_SIZES` en `catalog.ts`: 1–25, 26–50, 51–100, 101–250, 250+); se ve en `/admin`

**Cambios medianos:**

- [ ] `/admin` más compacto: secciones desplegables para que la página no sea tan larga
- [ ] `/admin`: lista de espera STEM en su propia sección, agrupada en cupos de ~10 personas; al llenarse un grupo, enviar el horario de inicio
- [ ] `/tournaments`: línea de tiempo con los torneos que se vayan haciendo
- [ ] `/gallery`: que las fotos cuenten algo (categorías como Parties / Tournaments / STEM y un pie de foto), no solo una cuadrícula

**Cambios grandes:**

- [ ] Solicitudes de eventos con plantilla de cotización en `/admin` según el tipo de cliente (company, school, university, festival)
      y precio estimado según la distancia desde The Bot Spot (falta que el negocio defina tarifas y radios)
- [ ] Cuenta del cliente como dashboard: secciones separadas para reservas, merch (pedidos) y cada experiencia

---

## ✅ Fase 1 – Reservas (lista)

Reemplaza el plugin BookingPress de WordPress. Datos del negocio confirmados (Notion, nov. 2026):
precios en `backend/src/catalog.ts`, horario L–J 5–9:30 PM, V 5–10:30 PM, S 12–10:30 PM, domingo cerrado.

**Hecho:**

- [x] Catálogo: batalla 30 min ($15/persona), 1 hora ($25/persona o grupos 4=$90, 8=$150, 16=$280), evento privado 2 h ($400)
- [x] Capacidad 16 personas a la vez; bloques de 30 min; el cupo se aparta 30 min mientras se paga (transacción Firestore)
- [x] `GET /api/bookings/availability`, `POST /api/bookings/checkout` (Stripe Checkout), `POST /api/stripe/webhook`
- [x] `/book-appointment`, `/thank-you` (confirma el pago con Stripe), `/cancellation-policy` (propuesta)
- [x] Probado de punta a punta con tarjeta de test 4242 (nov. 2026): reserva, pago y confirmación funcionan

**Extras y configuración para producción:**

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

## ✅ Rediseño (en `main`; presentado y aprobado por el cliente)

- [x] Inicio con arena de robots animada en 3D (`ArenaCanvas`): reflectores, robots que chocan con chispas, cámara que se inclina con el scroll
- [x] Paleta negro / naranja / blanco; títulos en Chakra Petch (antes Barlow Condensed; paleta final en la Fase 4)
- [x] Sin precios en el inicio; sección de promociones semanales lista (`promotions` en `site.ts`, se oculta si está vacía)
- [x] Comida eliminada del sitio; un solo teléfono publicado + "We speak English & Spanish"
- [ ] Confirmar el naranja exacto de la marca (hoy `#ff7a1a`, `--color-action` en `globals.css`)
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
- [x] Inicio: arena en canvas 2D con perspectiva (`components/arena`, el formato original con reflectores y franjas) con robots cuadrados estilo Bot Spot (gafas, bigote, barras LED, pinzas, globo) y pelea guiada por el scroll. La arena queda fija detrás de todo el inicio y la cámara viaja con el scroll (amplia → al ras del piso → desde arriba al final); las secciones son tarjetas de vidrio. Fotos de acción mientras llegan los videos
- [x] Paleta: carbono + cian del logo (identidad) + naranja (solo acciones) + madera del local (fondos); ver el encabezado de `globals.css`
- [ ] Videos originales en loop: pedir los .mp4 a los dueños, ponerlos en `frontend/public/videos` y en `loopVideos` (`site.ts`)
- [x] Página `/tournaments`: transmisión en vivo de YouTube y torneos pasados; lista de próximos torneos en `site.ts`
- [ ] Poner el canal de YouTube en `site.youtube` (`channelId` que empieza con UC y `url`). No se encontró públicamente
- [ ] Conectar el dominio `thebotspot.org` en Vercel
