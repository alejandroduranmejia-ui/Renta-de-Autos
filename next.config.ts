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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
