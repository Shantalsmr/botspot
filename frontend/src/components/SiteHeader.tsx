"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navMenu, site, type NavGroup } from "@/content/site";
import { useCart } from "./Cart";

/**
 * Encabezado: maximo 4 opciones en el menu (las demas en desplegables), cuenta, carrito y "Book now".
 * En computadora los desplegables se abren al pasar el mouse o al hacer clic; en celular todo va
 * dentro del menu ☰ agrupado.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const { count } = useCart();

  // Al cambiar de pagina se cierra todo.
  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  // Clic fuera o Escape cierra el desplegable.
  useEffect(() => {
    if (!openGroup) return;
    const onClick = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup]);

  const isActive = (g: NavGroup) =>
    g.href ? pathname === g.href : (g.items ?? []).some((i) => pathname === i.href);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <Image src="/images/logo-square.jpg" alt="" width={72} height={72} priority />
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

        <nav ref={navRef} id="main-nav" className={`main-nav${open ? " is-open" : ""}`} aria-label="Main">
          <ul className="nav-groups">
            {navMenu.map((g) =>
              g.items ? (
                <li
                  key={g.label}
                  className={`nav-group${openGroup === g.label ? " is-open" : ""}`}
                  onMouseEnter={() => window.matchMedia("(hover: hover)").matches && setOpenGroup(g.label)}
                  onMouseLeave={() => window.matchMedia("(hover: hover)").matches && setOpenGroup(null)}
                >
                  <button
                    type="button"
                    className={`nav-trigger${isActive(g) ? " is-current" : ""}`}
                    aria-expanded={openGroup === g.label}
                    aria-controls={`menu-${g.label}`}
                    onClick={() => setOpenGroup((v) => (v === g.label ? null : g.label))}
                  >
                    {g.label}
                    <span className="nav-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  <ul id={`menu-${g.label}`} className="nav-dropdown">
                    {g.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                          <strong>{item.label}</strong>
                          {item.hint ? <span>{item.hint}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={g.label} className="nav-group">
                  <Link
                    href={g.href!}
                    className={`nav-trigger${isActive(g) ? " is-current" : ""}`}
                    aria-current={pathname === g.href ? "page" : undefined}
                  >
                    {g.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
          <div className="nav-actions">
            <Link
              href="/account"
              className="account-link"
              title="My account"
              aria-current={pathname.startsWith("/account") ? "page" : undefined}
            >
              <span aria-hidden="true">👤</span>
              <span className="nav-label">My account</span>
            </Link>
            <Link
              href="/cart"
              className="account-link cart-link"
              title="Cart"
              aria-current={pathname === "/cart" ? "page" : undefined}
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
            <Link href="/book-appointment" className="btn btn-primary btn-book">
              Book now
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
