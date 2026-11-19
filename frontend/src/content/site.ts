/**
 * Informacion del negocio en un solo archivo.
 * Cambia telefonos, horarios, redes, etc. aqui y se actualiza todo el sitio.
 */
export const site = {
  name: "The Bot Spot",
  tagline: "It's Battle Time",
  description:
    "Downtown Provo's family robot arcade. Battle weaponized robots, play classic arcade games and celebrate your birthday with robot-powered fun.",
  url: "https://thebotspot.org",
  email: "info@thebotspot.org",
  /** Numero de contacto oficial (confirmado por David, 18 nov. 2026). No publicar otros. */
  phones: ["(801) 471-5678"],
  /** Por telefono atienden en ingles y espanol (el sitio va solo en ingles). */
  phoneLanguages: "English & Spanish",
  pricePerPerson: 25,
  city: "Downtown Provo, Utah",
  /** Direccion de la arena (robots, arcade, fiestas). Se usa en /location, el mapa y el pie de pagina. */
  address: "255 N University Ave, Provo, UT 84604" as string | null,
  /** Lugar de las clases del programa STEM (es otro sitio, en Orem). */
  steamAddress: "1201 N 800 E, Orem, UT 84097",
  /** Personas por grupo de clases STEM (lista de espera en /admin). Al llenarse un grupo se manda el horario. */
  stemGroupSize: 10,
  social: {
    facebook: "https://www.facebook.com/p/The-Bot-Spot-61582077369646/",
    instagram: "https://www.instagram.com/botspot_ut/",
    /** Perfil de TikTok. Si se pone en null, el boton de TikTok deja de mostrarse. */
    tiktok: "https://www.tiktok.com/@bot.spot" as string | null,
  },
  /**
   * Canal de YouTube donde transmiten los torneos (pagina /tournaments).
   * PENDIENTE: poner el id del canal (empieza con "UC", se ve en YouTube Studio → Configuracion →
   * Canal → Configuracion avanzada) y el link publico. Mientras channelId sea null, la pagina
   * muestra "pronto" en vez del video.
   */
  youtube: {
    channelId: null as string | null,
    url: null as string | null,
  },
  // Horario confirmado por el negocio (nov. 2026). Mantener igual a OPENING_HOURS en backend/src/catalog.ts.
  hours: [
    { days: "Mon – Thu", time: "5:00 PM – 9:30 PM" },
    { days: "Fri", time: "5:00 PM – 10:30 PM" },
    { days: "Sat", time: "12:00 PM – 10:30 PM" },
    { days: "Sun", time: "Closed" },
  ],
} as const;

export interface NavItem {
  href: string;
  label: string;
  /** Texto corto que se ve en el menu desplegable. */
  hint?: string;
}

export interface NavGroup {
  label: string;
  href?: string;
  items?: NavItem[];
}

/**
 * Menu principal: maximo 4 opciones; el resto va en desplegables.
 * "Home" no va en el menu: el logo ya lleva al inicio.
 */
export const navMenu: NavGroup[] = [
  {
    label: "Experiences",
    items: [
      { href: "/parties", label: "Parties", hint: "Birthdays & group fun" },
      { href: "/events", label: "Events", hint: "Corporate & mobile arenas" },
      { href: "/tournaments", label: "Tournaments", hint: "Watch & compete" },
      { href: "/stem", label: "STEM", hint: "Build your own robot" },
    ],
  },
  { label: "Shop", href: "/shop" },
  { label: "Gallery", href: "/gallery" },
  {
    label: "Visit",
    items: [
      { href: "/location", label: "Location", hint: "Provo arena & Orem classes" },
      { href: "/faq", label: "FAQ", hint: "Ages, parking, tickets" },
      { href: "/contact", label: "Contact", hint: "Call, email or message us" },
    ],
  },
];

/** Todas las paginas en una lista plana (pie de pagina). */
export const navLinks = [
  { href: "/parties", label: "Parties" },
  { href: "/events", label: "Events" },
  { href: "/stem", label: "STEM" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/shop", label: "Shop" },
  { href: "/gallery", label: "Gallery" },
  { href: "/faq", label: "FAQ" },
  { href: "/location", label: "Location" },
  { href: "/contact", label: "Contact" },
] as const;

export interface Activity {
  title: string;
  description: string;
  icon: string;
}

export const activities: Activity[] = [
  {
    icon: "🤖",
    title: "Robot Battle Arenas",
    description:
      "Take control of a weaponized robot and face off against friends in one of our two custom-built arenas. Up to 8 players per arena for epic showdowns!",
  },
  {
    icon: "🕹️",
    title: "Classic Arcade Games",
    description:
      "Enjoy timeless favorites like air hockey, foosball, and more, perfect for quick matches and friendly competition.",
  },
  {
    icon: "🚚",
    title: "Mobile Arenas",
    description:
      "We bring the robot arena to your business, school, university or event. Custom quotes for every group.",
  },
  {
    icon: "🎉",
    title: "Birthday Parties & Events",
    description:
      "Celebrate in style! Our arcade is the perfect spot for birthdays, group outings, and team events with fun packages to fit your needs.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Family & Friends Nights",
    description:
      "Make it a night to remember with activities designed for couples, families, and friends to bond, laugh, and compete together.",
  },
  {
    icon: "🏆",
    title: "Tournaments & Challenges",
    description: "Test your skills in our regular robot battles and arcade challenges — bragging rights await!",
  },
];

export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: "Do you host birthday parties?",
    answer:
      "Yes! Book robot battles for your whole group online, or reserve the entire venue for a private event. Contact us if you need help planning.",
  },
  {
    question: "How many people can play in the robot battle arenas?",
    answer: "Each arena can host up to 8 players at a time, making it perfect for dates, groups, and parties.",
  },
  {
    question: "Do I need to reserve in advance for robot battles?",
    answer:
      "Walk-ins are welcome, but we recommend reservations for parties and weekends to guarantee your spot.",
  },
  {
    question: "What are your hours of operation?",
    answer: site.hours.map((h) => `${h.days}: ${h.time}`).join(" · "),
  },
  {
    question: "Do you have group rates?",
    answer: "Yes! Group packages are applied automatically when you book online. For schools and corporate events, contact us for a custom quote.",
  },
  {
    question: "Is the arcade family-friendly?",
    answer: "Absolutely. We're designed for all ages — kids, teens, and adults will all find games they love.",
  },
  {
    question: "Is there an age limit for playing the robot battles?",
    answer:
      "Players should be at least 6 years old to enjoy the robot battles. Younger children can still enjoy our classic arcade games.",
  },
  {
    question: "Do you have parking available?",
    answer: "Yes, we offer convenient on-site parking for all our guests, free of charge.",
  },
  {
    question: "Do game tickets expire?",
    answer: "Use them today, tomorrow, or next year — fun doesn't have an expiration date at The Bot Spot!",
  },
];

export interface Promotion {
  title: string;
  description: string;
  /** Ultimo dia de la promocion (YYYY-MM-DD). Despues de esa fecha deja de mostrarse. */
  expires: string;
}

/**
 * Promociones semanales del inicio. Vacio = la seccion no se muestra.
 * El negocio avisa cuando tenga promociones (ver ROADMAP.md).
 */
export const promotions: Promotion[] = [];

export function telHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, "")}`;
}

export interface Photo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * Fotos reales del local (de Google Maps, optimizadas en /public/images/gallery).
 * Antes de publicar, confirmar con el negocio que se pueden usar (algunas las subieron clientes).
 */
export const gallery: Photo[] = [
  { src: "/images/gallery/arena-battle-crowd.jpg", alt: "Friends watching a robot battle through the arena glass", width: 1600, height: 900 },
  { src: "/images/gallery/group-robots-1.jpg", alt: "A group of teens holding their battle robots", width: 1600, height: 1200 },
  { src: "/images/gallery/robot-closeup.jpg", alt: "Close-up of a battle robot with glowing eyes", width: 1200, height: 1600 },
  { src: "/images/gallery/battle-kids.jpg", alt: "A dad and son driving robots in the arena", width: 1600, height: 1200 },
  { src: "/images/gallery/arena-glow.jpg", alt: "Colorful balls and robots inside the lit-up arena", width: 1600, height: 1200 },
  { src: "/images/gallery/friends-robots.jpg", alt: "Two friends showing off their robots", width: 1200, height: 1600 },
  { src: "/images/gallery/family-robots.jpg", alt: "A family posing with robots under The Bot Spot sign", width: 1600, height: 1349 },
  { src: "/images/gallery/arena-red-lights.jpg", alt: "Robots battling under red arena lights", width: 1600, height: 1200 },
  { src: "/images/gallery/kids-driving.jpg", alt: "Kids driving robots with game controllers", width: 1205, height: 1600 },
  { src: "/images/gallery/arena-night.jpg", alt: "A full arena of players during a night battle", width: 1600, height: 1200 },
  { src: "/images/gallery/party-group.jpg", alt: "A party group holding glowing robots", width: 1200, height: 1600 },
  { src: "/images/gallery/arena-overview.jpg", alt: "The robot battle arena from above", width: 1600, height: 1200 },
  { src: "/images/gallery/group-robots-2.jpg", alt: "Friends with their robots by the arena", width: 1200, height: 1600 },
  { src: "/images/gallery/kids-arena.jpg", alt: "Kids watching robots battle inside the arena", width: 1600, height: 1200 },
  { src: "/images/gallery/arena-action.jpg", alt: "Robots chasing balls on the arena floor", width: 1200, height: 1600 },
  { src: "/images/gallery/team-arena.jpg", alt: "A team event at The Bot Spot", width: 1600, height: 1200 },
  { src: "/images/gallery/kids-robots.jpg", alt: "Kids showing their robots with a parent", width: 1205, height: 1600 },
  { src: "/images/gallery/arena-blue.jpg", alt: "A robot under blue arena lights", width: 1600, height: 1205 },
  { src: "/images/gallery/arcade-hall.jpg", alt: "The arcade hall with a robot arena table", width: 1200, height: 1600 },
  { src: "/images/gallery/air-hockey.jpg", alt: "Players at the arcade games", width: 1600, height: 826 },
  { src: "/images/gallery/arena-spectators.jpg", alt: "Spectators around the arena", width: 1600, height: 1200 },
  { src: "/images/gallery/new-robot.jpg", alt: "Two guests excited about their new robot", width: 1200, height: 1600 },
  { src: "/images/gallery/staff-team.jpg", alt: "The Bot Spot team", width: 1200, height: 1600 },
  { src: "/images/gallery/robot-build.jpg", alt: "A battle robot being built on the workbench", width: 1200, height: 1600 },
  { src: "/images/gallery/robot-shelf.jpg", alt: "Battle robots on display by The Bot Spot banner", width: 1200, height: 1600 },
  { src: "/images/gallery/arena-floor.jpg", alt: "The arena floor with robots and balls", width: 1200, height: 1600 },
];

export interface GalleryChapter {
  id: string;
  eyebrow: string;
  title: string;
  /** Una o dos frases que cuentan de que va el capitulo. */
  story: string;
  /** Fotos de `gallery` por nombre (sin ".jpg") con su pie de foto. */
  photos: { name: string; caption: string }[];
}

/**
 * La galeria cuenta una historia por capitulos en vez de ser solo fotos (feedback, 18 nov. 2026).
 * Pies de foto propuestos: que el negocio los corrija si saben quien sale o de que evento es.
 */
export const galleryChapters: GalleryChapter[] = [
  {
    id: "battles",
    eyebrow: "Chapter 1",
    title: "Battle night",
    story: "Lights down, controllers up. This is what a round in our arena looks like, from the driver's seat and from the glass.",
    photos: [
      { name: "arena-battle-crowd", caption: "Everyone presses against the glass for the final seconds." },
      { name: "arena-red-lights", caption: "Red lights mean the round is on." },
      { name: "arena-action", caption: "Chasing the ball across the arena floor." },
      { name: "arena-glow", caption: "Colors, balls and robots everywhere." },
      { name: "arena-night", caption: "A full arena on a busy night." },
      { name: "arena-blue", caption: "A bot waiting for its next opponent." },
      { name: "arena-overview", caption: "The arena from above: two teams, one floor." },
      { name: "arena-floor", caption: "The calm before the battle." },
    ],
  },
  {
    id: "families",
    eyebrow: "Chapter 2",
    title: "Birthdays & family fun",
    story: "Parents vs. kids, birthday crews and first-timers. Some of our favorite battles happen between people who share a last name.",
    photos: [
      { name: "family-robots", caption: "Family photo under The Bot Spot sign." },
      { name: "battle-kids", caption: "Dad vs. son: the rematch nobody wanted to lose." },
      { name: "party-group", caption: "A birthday crew with their glowing bots." },
      { name: "kids-driving", caption: "Small hands, serious driving skills." },
      { name: "kids-arena", caption: "Front-row seats to the action." },
      { name: "kids-robots", caption: "Showing off their robots after the battle." },
    ],
  },
  {
    id: "friends",
    eyebrow: "Chapter 3",
    title: "Friends, teams & game night",
    story: "Groups of friends, company teams and arcade breaks between rounds. The arena is better with a crowd.",
    photos: [
      { name: "group-robots-1", caption: "The squad, ready for battle." },
      { name: "team-arena", caption: "A team event that turned into a tournament." },
      { name: "friends-robots", caption: "Two friends, two robots, one winner." },
      { name: "group-robots-2", caption: "Picking robots before the next round." },
      { name: "new-robot", caption: "That first-battle excitement." },
      { name: "arena-spectators", caption: "Cheering from around the arena." },
      { name: "arcade-hall", caption: "The arcade hall, for breaks between battles." },
      { name: "air-hockey", caption: "Classic arcade games for the warm-up." },
    ],
  },
  {
    id: "behind",
    eyebrow: "Chapter 4",
    title: "Behind the bots",
    story: "Every robot is built, tuned and repaired by our team. This is where the battles really start.",
    photos: [
      { name: "robot-build", caption: "A new bot taking shape on the workbench." },
      { name: "robot-closeup", caption: "Up close with one of our fighters." },
      { name: "robot-shelf", caption: "The roster, charged and ready." },
      { name: "staff-team", caption: "The crew that keeps the bots battling." },
    ],
  },
];

export function photo(name: string): Photo {
  return gallery.find((p) => p.src.endsWith(`/${name}.jpg`)) ?? gallery[0]!;
}

export interface Tournament {
  title: string;
  /** Fecha (YYYY-MM-DD). Despues de ese dia pasa solo de "proximos" a la linea de tiempo. */
  date: string;
  time: string;
  description: string;
  /** Lo que se llena despues del torneo (todo opcional) y se ve en la linea de tiempo: */
  /** Ganador o equipo ganador. */
  winner?: string;
  /** Resumen corto de como fue. */
  recap?: string;
  /** Foto de /public/images/gallery, sin ".jpg" (p. ej. "arena-night"). */
  photo?: string;
  /** Enlace al video del torneo (YouTube, Instagram o TikTok). */
  videoUrl?: string;
}

/**
 * Todos los torneos, proximos y pasados (los agrega el negocio). Los proximos salen arriba;
 * los pasados, en la linea de tiempo (feedback de David, 18 nov. 2026). Ejemplo:
 * { title: "Winter Clash", date: "2026-12-12", time: "6:00 PM", description: "1v1, all ages.",
 *   winner: "Team Sparky", recap: "16 drivers, 3 knockouts in the final.", photo: "arena-night" }
 */
export const tournaments: Tournament[] = [];

export interface LoopVideo {
  /** Archivo en /public/videos (mp4, idealmente menos de 8 MB y sin audio). */
  src: string;
  /** Imagen que se ve mientras carga (opcional). */
  poster?: string;
  title: string;
}

/**
 * Videos originales del negocio (archivos .mp4 en frontend/public/videos). Se reproducen solos, en
 * loop y sin sonido. Cuando esta lista tiene videos, aparecen en el inicio (en vez de las fotos de accion) y en la galeria.
 * PENDIENTE: que los duenos pasen los archivos originales de sus reels.
 */
export const loopVideos: LoopVideo[] = [];
