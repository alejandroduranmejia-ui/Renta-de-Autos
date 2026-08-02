import { Car, Menu } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOutAction } from "@/server/auth/actions";
import { getSession } from "@/server/auth/session";

type NavItem = { href: string; label: string };

const GUEST_NAV: NavItem[] = [{ href: "/vehiculos", label: "Vehículos" }];
const USER_NAV: NavItem[] = [
  { href: "/vehiculos", label: "Vehículos" },
  { href: "/mis-reservas", label: "Mis reservas" },
  { href: "/mis-vehiculos", label: "Mis vehículos" },
  { href: "/verificacion", label: "Verificación" },
];

export async function SiteHeader() {
  const [session, headersList] = await Promise.all([getSession(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "/";
  const navItems = session ? USER_NAV : GUEST_NAV;
  const displayName =
    (session?.user.user_metadata?.full_name as string | undefined) ??
    session?.user.email;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Car className="size-5 text-primary" />
          <span>Renta de Vehículos</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname.startsWith(item.href)
                  ? "text-foreground"
                  : "text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground">
                {displayName}
              </span>
              <form action={signOutAction}>
                <SignOutButton variant="outline" size="sm">
                  Cerrar sesión
                </SignOutButton>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/iniciar-sesion">Iniciar sesión</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/registro">Regístrate</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Renta de Vehículos</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {navItems.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
              {session ? (
                <form action={signOutAction}>
                  <SignOutButton variant="outline" className="w-full">
                    Cerrar sesión
                  </SignOutButton>
                </form>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button variant="outline" asChild>
                      <Link href="/iniciar-sesion">Iniciar sesión</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href="/registro">Regístrate</Link>
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
