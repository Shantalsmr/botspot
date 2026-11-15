import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
}

/** Encabezado comun de las paginas internas (titulo + migas de pan). */
export function PageHeader({ title, eyebrow, children }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div className="container">
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>{title}</span>
        </nav>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {children ? <div className="lead">{children}</div> : null}
      </div>
    </section>
  );
}
