import Link from "next/link";
import { requireAdmin } from "@/server/auth/guards";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 sm:block">
        <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link href="/admin/verificaciones">Verificaciones</Link>
          <Link href="/admin/vehiculos">Vehículos</Link>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border px-6 py-4">
          <span className="text-lg font-semibold">Admin</span>
        </header>
        <main className="flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
