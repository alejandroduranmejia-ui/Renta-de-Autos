export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-6 py-4">
        <span className="text-lg font-semibold">Renta de Vehículos</span>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
