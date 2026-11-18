import Link from "next/link";
import { site, telHref } from "@/content/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <p className="footer-title">{site.name}</p>
          <p className="muted">{site.address ?? site.city}</p>
          <p className="muted">${site.pricePerPerson} per person</p>
        </div>
        <div>
          <p className="footer-title">Call us</p>
          {site.phones.map((phone) => (
            <p key={phone}>
              <a href={telHref(phone)}>{phone}</a>
            </p>
          ))}
          <p>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>
        <div>
          <p className="footer-title">Hours</p>
          <ul className="hours-list">
            {site.hours.map((h) => (
              <li key={h.days}>
                <span>{h.days}</span>
                <span>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="footer-title">Follow the action</p>
          <p>
            <a href={site.social.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          </p>
          <p>
            <a href={site.social.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </p>
          <p>
            <Link href="/account">My account & bookings</Link>
          </p>
        </div>
      </div>
      <div className="container footer-bottom muted">
        <span>
          © {year} {site.name}. All rights reserved.
        </span>
        <Link href="/admin" className="footer-admin">
          Owners login
        </Link>
      </div>
    </footer>
  );
}
