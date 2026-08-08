import type { NextConfig } from "next";

// CSP deliberadamente permisiva en script/style (`unsafe-inline`) — Next.js inyecta estilos y el
// bootstrap de hidratación inline sin nonce en este track; connect-src whitelist solo lo que esta
// app realmente llama desde el navegador: Supabase (REST + Realtime por wss) y el checkout
// hospedado de Stripe (blueprint.md §14).
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* https://api.stripe.com",
  "frame-src https://checkout.stripe.com",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Fotos de vehículos servidas desde el bucket público de Supabase Storage — el subdominio
    // cambia por proyecto/entorno, de ahí el wildcard. El patrón http://127.0.0.1 es para el
    // Supabase local en desarrollo (`supabase start`).
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
    ],
    // Next.js 16 bloquea que el optimizador descargue de cualquier host que resuelva a una IP
    // privada — una defensa contra SSRF. Eso hace que el `remotePatterns` de 127.0.0.1 de arriba
    // sea inútil por sí solo: en desarrollo TODA foto de vehículo fallaba con
    // `resolved to private ip`, y por eso las fichas se veían siempre con el recuadro gris.
    //
    // Se activa SOLO en desarrollo. En producción la protección queda intacta: ahí el bucket vive
    // en un host público de Supabase y nada debería pedirle al servidor que descargue de una red
    // interna.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
