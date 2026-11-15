import path from "node:path";
import type { NextConfig } from "next";

// Raiz del monorepo (una carpeta arriba de /frontend)
const monorepoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  // Los paquetes del monorepo se publican como TypeScript: Next.js los compila.
  transpilePackages: ["@botspot/backend", "@botspot/database"],
  // firebase-admin solo corre en el servidor (Node.js), no se empaqueta.
  serverExternalPackages: ["firebase-admin"],
  // Permite que Vercel incluya los archivos de /backend y /database.
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  // Direcciones viejas de WordPress -> paginas nuevas (no se pierden enlaces ni SEO).
  async redirects() {
    return [
      { source: "/check-out", destination: "/checkout", permanent: true },
      { source: "/index.php/check-out", destination: "/checkout", permanent: true },
      { source: "/index.php/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
