import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-foreground">
        Renta un vehículo, o pon el tuyo a rentar.
      </h1>
      <p className="max-w-md text-muted-foreground">
        Un marketplace local entre personas que se conocen — identidad y
        documentos verificados antes de publicar o reservar.
      </p>
      <Link
        href="/vehiculos"
        className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
      >
        Ver vehículos disponibles
      </Link>
    </div>
  );
}
