import { ArrowRight, Car, Search, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeroSearch } from "@/components/vehicles/hero-search";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { listActiveVehicles, listActiveZones } from "@/server/vehicles/queries";

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
  const [{ items: featured }, zones] = await Promise.all([
    listActiveVehicles({ perPage: 6 }),
    listActiveZones(),
  ]);

  const heroPhotoUrl = featured.find((v) => v.photoUrl)?.photoUrl ?? null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Padding inferior menor que el superior: sumado al `py-16` de la sección siguiente dejaba
          ~225px de vacío entre la llamada a la acción y los tres pasos, que se leía como un error
          de maquetación más que como aire. */}
      <section className="relative overflow-hidden px-6 pt-28 pb-16 text-center sm:pt-36 sm:pb-20">
        {/* La foto del primer vehículo publicado hace de fondo. En un marketplace de autos el
            producto ES la foto, y la portada no mostraba ninguna: solo texto blanco sobre negro.
            Se usa contenido real en vez de una imagen de archivo, así que no hay que versionar un
            asset ni pagar una descarga extra — la foto ya se carga en la grilla de destacados. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          {heroPhotoUrl && (
            <>
              <Image
                src={heroPhotoUrl}
                alt=""
                fill
                priority
                className="object-cover opacity-35"
              />
              {/* Doble velo: uno plano para que el texto siempre tenga contraste suficiente, y un
                  degradado que funde el borde inferior con el fondo de la página. */}
              <div className="absolute inset-0 bg-background/55" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background" />
            </>
          )}
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
        <div className="mt-10">
          <HeroSearch zones={zones} />
        </div>

        {/* Jerarquía por sustracción: el buscador es LA acción del hero. "Ver todos los
            vehículos" se eliminó porque buscar sin filtros hace exactamente eso, y competía
            visualmente con el propio buscador. Queda una sola llamada secundaria, para el otro
            lado del marketplace. */}
        <p className="mt-6 text-sm text-muted-foreground">
          ¿Tienes un vehículo parado?{" "}
          <Link
            href="/publica-tu-vehiculo"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            Ponlo a rentar
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-16">
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
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
