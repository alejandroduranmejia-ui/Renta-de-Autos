import { requireUser } from "@/server/auth/guards";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 sm:block">
        <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span>Mis reservas</span>
          <span>Mis vehículos</span>
          <span>Verificación</span>
          <span>Configuración</span>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-lg font-semibold">Renta de Vehículos</span>
        </header>
        <main className="flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
