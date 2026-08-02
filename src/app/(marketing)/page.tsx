import { ArrowRight, Car, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { listActiveVehicles } from "@/server/vehicles/queries";

const STEPS = [
  {
    icon: Search,
    title: "Busca",
    description:
      "Filtra por fechas y presupuesto entre vehículos ya verificados.",
  },
  {
    icon: ShieldCheck,
    title: "Reserva con confianza",
    description:
      "Identidad y documentos verificados antes de que puedas publicar o reservar.",
  },
  {
    icon: Car,
    title: "Disfruta",
    description: "Coordina la entrega por chat directo con el dueño.",
  },
];

export default async function HomePage() {
  const featured = (await listActiveVehicles()).slice(0, 6);

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden px-6 py-28 text-center sm:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute top-[-10%] left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-1/3 left-[10%] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-1/4 right-[10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <span className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <Sparkles className="size-3.5 text-primary" />
          Verificado, local, sin intermediarios
        </span>
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight text-balance text-foreground sm:text-7xl">
          Renta un vehículo, o pon el tuyo a rentar.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground text-balance">
          Un marketplace local entre personas que se conocen — identidad y
          documentos verificados antes de publicar o reservar.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="h-11 px-6 text-base">
            <Link href="/vehiculos">
              Ver vehículos disponibles
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="h-11 px-6 text-base"
          >
            {/* Landing pública, no la ruta autenticada de alta: un visitante anónimo caía en el
                login sin saber qué se le iba a pedir. */}
            <Link href="/publica-tu-vehiculo">Publica tu vehículo</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="grid gap-10 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                <step.icon className="size-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">
              Vehículos destacados
            </h2>
            <Link
              href="/vehiculos"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todos <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
