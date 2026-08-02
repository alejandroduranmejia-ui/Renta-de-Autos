import { headers } from "next/headers";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { requireUser } from "@/server/auth/guards";

const SIDEBAR_LINKS = [
  { href: "/mis-reservas", label: "Mis reservas" },
  { href: "/mis-vehiculos", label: "Mis vehículos" },
  { href: "/verificacion", label: "Verificación" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border p-6 sm:block">
          <nav className="flex flex-col gap-1 text-sm">
            {SIDEBAR_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname.startsWith(link.href)
                    ? "rounded-lg bg-muted px-3 py-2 font-medium text-foreground"
                    : "rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
