import { Menu } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { requireAdmin } from "@/server/auth/guards";

const LINKS = [
  { href: "/admin/verificaciones", label: "Verificaciones" },
  { href: "/admin/vehiculos", label: "Vehículos" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/";

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-border p-6 sm:block">
        <nav className="flex flex-col gap-1 text-sm">
          {LINKS.map((link) => (
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
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-lg font-semibold">Admin</span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Admin</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
