import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found">This robot wandered off the arena. Let&apos;s get you back.</PageHeader>
      <section className="section">
        <div className="container actions">
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
        </div>
      </section>
    </>
  );
}
