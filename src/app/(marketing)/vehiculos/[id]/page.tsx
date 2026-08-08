import { ImageOff } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { BookingDatePicker } from "@/components/vehicles/booking-date-picker";
import { BookingPolicies } from "@/components/vehicles/booking-policies";
import { HostCard } from "@/components/vehicles/host-card";
import { TrustBadges } from "@/components/vehicles/trust-badges";
import { VehicleFeatures } from "@/components/vehicles/vehicle-features";
import { VehicleHeader } from "@/components/vehicles/vehicle-header";
import { formatPriceCents } from "@/lib/format";
import {
  getVehicleDetail,
  getVehicleUnavailableDates,
} from "@/server/vehicles/queries";

const ERROR_MESSAGES: Record<string, string> = {
  fechas_no_disponibles:
    "Ese rango de fechas ya no está disponible para este vehículo — elige otras fechas.",
};

// Lo que se ve cuando alguien pega el enlace en WhatsApp — el canal por el que este piloto va a
// circular de verdad. Sin esto, todas las fichas comparten el mismo título genérico del layout.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicleDetail(id);
  if (!vehicle) return { title: "Vehículo no disponible" };

  const name = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
  const title = `Renta un ${name}`;
  const description = `${formatPriceCents(vehicle.dailyPriceCents, vehicle.currency)} por día · ${vehicle.seats} puestos · identidad y documentos verificados.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: vehicle.photoUrls.slice(0, 1).map((url) => ({ url, alt: name })),
    },
  };
}

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const vehicle = await getVehicleDetail(id);
  if (!vehicle) notFound();

  const unavailableDates = await getVehicleUnavailableDates(vehicle.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      {/* Altura acotada: en 16:9 a 1378px de ancho la galería medía 775px y empujaba el nombre,
          el precio y el botón de reservar por debajo del pliegue. Ahora el título y la caja de
          reserva entran en la primera pantalla, como en la ficha de Turo. */}
      {vehicle.photoUrls.length > 0 ? (
        <Carousel className="w-full">
          <CarouselContent>
            {vehicle.photoUrls.map((url) => (
              <CarouselItem key={url}>
                <div className="relative h-[clamp(15rem,42vh,26rem)] overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {vehicle.photoUrls.length > 1 && (
            <>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
              <span className="absolute right-4 bottom-4 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                {vehicle.photoUrls.length} fotos
              </span>
            </>
          )}
        </Carousel>
      ) : (
        // Antes era un rectángulo gris gigante y mudo: la misma altura que una galería real, sin
        // nada dentro salvo la palabra "Sin fotos".
        <div className="flex h-[clamp(11rem,26vh,16rem)] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground">
          <ImageOff className="size-6" />
          <span className="text-sm">Este vehículo todavía no tiene fotos</span>
        </div>
      )}

      {/* `items-start` es lo que permite que la columna derecha sea sticky: sin él, el grid la
          estira a la altura de la izquierda y no hay nada que fijar. */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <VehicleHeader vehicle={vehicle} />

          {vehicle.description && (
            <p className="whitespace-pre-line text-foreground">
              {vehicle.description}
            </p>
          )}

          {/* Un solo bloque de confianza: quién es el dueño y qué verificamos de él van juntos,
              porque es una sola pregunta del arrendatario, no dos. */}
          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
            <HostCard host={vehicle.host} />
            <div className="border-t border-border pt-4">
              <TrustBadges verification={vehicle.verification} />
            </div>
          </section>
          <VehicleFeatures features={vehicle.features} />
          <BookingPolicies />
        </div>

        {/* Sticky: la columna de contenido mide ~1300px, así que sin esto el precio y el botón
            de reservar desaparecen en cuanto el usuario baja a leer características o reglas.
            `top-20` deja hueco para el header, que también es sticky. */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-20">
          {error && ERROR_MESSAGES[error] && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {ERROR_MESSAGES[error]}
            </p>
          )}
          <BookingDatePicker
            vehicleId={vehicle.id}
            dailyPriceCents={vehicle.dailyPriceCents}
            currency={vehicle.currency}
            unavailableDates={unavailableDates}
          />
        </div>
      </div>
    </div>
  );
}
