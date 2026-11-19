import Image from "next/image";
import Link from "next/link";
import { navLinks, site, telHref } from "@/content/site";

const mapsLink = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

/** Pie de pagina de todas las paginas: marca y reserva, secciones, contacto, horario y redes. */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <Image src="/images/logo-square.jpg" alt="" width={72} height={72} />
            <span>
              <strong>{site.name}</strong>
              <small>{site.tagline}</small>
            </span>
          </Link>
          <p className="muted">Downtown Provo&apos;s robot battle arena. Drive a real robot, pop your rival&apos;s balloon.</p>
          <Link href="/book-appointment" className="btn btn-primary btn-small">
            🤖 Book your battle
          </Link>
        </div>

        <nav className="footer-col" aria-label="Footer">
          <p className="footer-title">Explore</p>
          <ul className="footer-links">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/cancellation-policy">Cancellation policy</Link>
            </li>
          </ul>
        </nav>

        <div className="footer-col">
          <p className="footer-title">Visit us</p>
          {site.address ? (
            <p>
              <a href={mapsLink(site.address)} target="_blank" rel="noopener noreferrer">
                {site.address}
              </a>
              <br />
              <span className="muted small">Robot arena · free parking</span>
            </p>
          ) : null}
          <p>
            <a href={mapsLink(site.steamAddress)} target="_blank" rel="noopener noreferrer">
              {site.steamAddress}
            </a>
            <br />
            <span className="muted small">STEM classes</span>
          </p>
          {site.phones.map((phone) => (
            <p key={phone}>
              <a href={telHref(phone)}>{phone}</a>
              <br />
              <span className="muted small">We speak {site.phoneLanguages}</span>
            </p>
          ))}
          <p>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>

        <div className="footer-col">
          <p className="footer-title">Hours</p>
          <ul className="hours-list">
            {site.hours.map((h) => (
              <li key={h.days}>
                <span>{h.days}</span>
                <span>{h.time}</span>
              </li>
            ))}
          </ul>
          <p className="footer-title footer-follow">Follow the action</p>
          <p className="footer-social">
            <a href={site.social.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            {site.social.tiktok ? (
              <a href={site.social.tiktok} target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
            ) : null}
            <a href={site.social.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
            {site.youtube.url ? (
              <a href={site.youtube.url} target="_blank" rel="noopener noreferrer">
                YouTube
              </a>
            ) : null}
          </p>
        </div>
      </div>
      <div className="container footer-bottom muted">
        <span>
          © {year} {site.name}. All rights reserved.
        </span>
        <span className="footer-bottom-links">
          <Link href="/account">My account</Link>
          <Link href="/admin" className="footer-admin">
            Owners login
          </Link>
        </span>
      </div>
    </footer>
  );
}
