import Link from "next/link";
import { site, telHref } from "@/content/site";

interface ComingSoonProps {
  feature: string;
}

/**
 * Bloque temporal para las funciones que aun no estan construidas
 * (reservas, tienda, carrito...). Ver ROADMAP.md.
 */
export function ComingSoon({ feature }: ComingSoonProps) {
  const [mainPhone] = site.phones;

  return (
    <section className="section">
      <div className="container">
        <div className="card coming-soon">
          <p className="eyebrow">Coming soon</p>
          <h2>{feature} is getting an upgrade</h2>
          <p>
            We&apos;re rebuilding this part of our website. In the meantime, call or message us and we&apos;ll
            take care of you right away.
          </p>
          <div className="actions">
            {mainPhone ? (
              <a className="btn btn-primary" href={telHref(mainPhone)}>
                Call {mainPhone}
              </a>
            ) : null}
            <Link className="btn btn-outline" href="/contact">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
