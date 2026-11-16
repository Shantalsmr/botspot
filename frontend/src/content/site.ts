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
  social: {
    facebook: "https://www.facebook.com/p/The-Bot-Spot-61582077369646/",
    instagram: "https://www.instagram.com/botspot_ut/",
  },
  // Horario confirmado por el negocio (nov. 2026). Mantener igual a OPENING_HOURS en backend/src/catalog.ts.
  hours: [
    { days: "Mon – Thu", time: "5:00 PM – 9:30 PM" },
    { days: "Fri", time: "5:00 PM – 10:30 PM" },
    { days: "Sat", time: "12:00 PM – 10:30 PM" },
    { days: "Sun", time: "Closed" },
  ],
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/parties", label: "Parties" },
  { href: "/events", label: "Events" },
  { href: "/steam", label: "STEAM" },
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
