// Shell protegido — la llamada real a requireUser() se agrega en el paso 4 (blueprint.md §9).
// Este paso (2) solo dibuja el shell: topbar + sidebar.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
