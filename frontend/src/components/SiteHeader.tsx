"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navLinks, site } from "@/content/site";
import { useCart } from "./Cart";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <Image src="/images/logo-square.jpg" alt="" width={44} height={44} priority />
          <span>
            <strong>{site.name}</strong>
            <small>{site.tagline}</small>
          </span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>

        <nav id="main-nav" className={`main-nav${open ? " is-open" : ""}`} aria-label="Main">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/account"
            className="account-link"
            title="My account"
            aria-current={pathname.startsWith("/account") ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">👤</span>
            <span className="nav-label">My account</span>
          </Link>
          <Link
            href="/cart"
            className="account-link cart-link"
            title="Cart"
            aria-current={pathname === "/cart" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">🛒</span>
            <span className="nav-label">Cart</span>
            {count > 0 ? (
              <span className="cart-count">
                {count}
                <span className="sr-only"> items</span>
              </span>
            ) : null}
          </Link>
          <Link href="/book-appointment" className="btn btn-primary" onClick={() => setOpen(false)}>
            🤖 Book now
          </Link>
        </nav>
      </div>
    </header>
  );
}
