import { Palette, Users } from "lucide-react";
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
import { HostCard } from "@/components/vehicles/host-card";
import { TrustBadges } from "@/components/vehicles/trust-badges";
import { formatPriceCents } from "@/lib/format";
import { getVehicleDetail } from "@/server/vehicles/queries";

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      {vehicle.photoUrls.length > 0 ? (
        <Carousel className="w-full">
          <CarouselContent>
            {vehicle.photoUrls.map((url) => (
              <CarouselItem key={url}>
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
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
        <div className="flex aspect-video items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          Sin fotos
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Palette className="size-4" /> {vehicle.color}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" /> {vehicle.seats} puestos
              </span>
            </div>
          </div>

          {vehicle.description && (
            <p className="whitespace-pre-line text-foreground">
              {vehicle.description}
            </p>
          )}

          <HostCard host={vehicle.host} />
          <TrustBadges verification={vehicle.verification} />
        </div>

        <div className="flex flex-col gap-3">
          {error && ERROR_MESSAGES[error] && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {ERROR_MESSAGES[error]}
            </p>
          )}
          <BookingDatePicker
            vehicleId={vehicle.id}
            dailyPriceCents={vehicle.dailyPriceCents}
            currency={vehicle.currency}
          />
        </div>
      </div>
    </div>
  );
}
