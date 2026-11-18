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
  phones: ["(385) 283-2039"],
  /** Por telefono atienden en ingles y espanol (el sitio va solo en ingles). */
  phoneLanguages: "English & Spanish",
  pricePerPerson: 25,
  city: "Downtown Provo, Utah",
  /** Direccion de la arena (robots, arcade, fiestas). Se usa en /location, el mapa y el pie de pagina. */
  address: "255 N University Ave, Provo, UT 84604" as string | null,
  /** Lugar de las clases del programa STEAM (es otro sitio, en Orem). */
  steamAddress: "1201 N 800 E, Orem, UT 84097",
  social: {
    facebook: "https://www.facebook.com/p/The-Bot-Spot-61582077369646/",
    instagram: "https://www.instagram.com/botspot_ut/",
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

// "Home" no va en el menu: el logo ya lleva al inicio.
export const navLinks = [
  { href: "/parties", label: "Parties" },
  { href: "/events", label: "Events" },
  { href: "/steam", label: "STEAM" },
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

export function photo(name: string): Photo {
  return gallery.find((p) => p.src.endsWith(`/${name}.jpg`)) ?? gallery[0]!;
}

export interface Tournament {
  title: string;
  /** Fecha (YYYY-MM-DD). Despues de ese dia deja de mostrarse en "proximos". */
  date: string;
  time: string;
  description: string;
}

/** Proximos torneos (los agrega el negocio). Vacio = la seccion dice que pronto se anuncian. */
export const tournaments: Tournament[] = [];
