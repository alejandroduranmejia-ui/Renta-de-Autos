import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

// blueprint.md §7: stack de fuentes del sistema, sin descarga de red — reproduce el look de
// Apple exactamente en dispositivos Apple y no tiene costo de carga en ningún otro sistema.

export const metadata: Metadata = {
  title: "Renta de Vehículos",
  description: "Marketplace de renta de vehículos entre particulares.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La cookie de modo oscuro se lee server-side para que la clase "dark" ya esté en el HTML de
  // la primera respuesta, antes de que corra cualquier script de cliente (blueprint.md §9, paso 2).
  const cookieStore = await cookies();
  const isDark = cookieStore.get("theme")?.value === "dark";

  return (
    <html lang="es" className={`h-full antialiased ${isDark ? "dark" : ""}`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
