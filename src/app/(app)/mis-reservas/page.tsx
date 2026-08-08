import { CalendarRange } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";
import { listMyBookings, type MyBooking } from "@/server/bookings/queries";
import { startBookingCheckout } from "@/server/payments/mutations";

const STATUS_LABEL: Record<string, string> = {
  held: "Pendiente de pago",
  confirmed: "Confirmada",
  active: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  held: "outline",
  confirmed: "default",
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function canPay(booking: MyBooking) {
  if (booking.status !== "held") return false;
  if (!booking.holdExpiresAt) return true;
  return booking.holdExpiresAt > new Date();
}

export default async function MisReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ creada?: string; pago?: string }>;
}) {
  const actor = await requireUser();
  const { creada, pago } = await searchParams;
  const bookings = await listMyBookings(actor.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Mis reservas</h1>

      {creada && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Reserva creada — complétala pagando antes de que expire.
        </p>
      )}
      {pago === "exitoso" && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Pago recibido, tu reserva quedó confirmada.
        </p>
      )}
      {pago === "cancelado" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Pago cancelado — tu reserva sigue pendiente.
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="text-muted-foreground">Aún no tienes reservas.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex flex-col gap-4 surface p-4 sm:flex-row sm:items-center"
            >
              <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-36">
                {booking.photoUrl && (
                  <Image
                    src={booking.photoUrl}
                    alt={booking.vehicleName}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <Link
                  href={`/reservas/${booking.id}`}
                  className="font-medium text-card-foreground hover:underline"
                >
                  {booking.vehicleName}
                </Link>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarRange className="size-3.5" />
                  {formatDate(booking.startsAt)} – {formatDate(booking.endsAt)}
                </span>
                {/* Mismo desglose que la ficha (booking-date-picker) — el número total nunca
                    cambia entre lo que se prometió y lo que se autoriza. */}
                <span className="text-sm font-medium text-foreground">
                  {formatPriceCents(
                    booking.priceCents + booking.depositHoldCents,
                    booking.currency,
                  )}{" "}
                  autorizado
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatPriceCents(booking.priceCents, booking.currency)} de
                  renta ·{" "}
                  {formatPriceCents(booking.depositHoldCents, booking.currency)}{" "}
                  de depósito reembolsable
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[booking.status]}>
                  {STATUS_LABEL[booking.status] ?? booking.status}
                </Badge>
                {canPay(booking) && (
                  <form action={startBookingCheckout}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <Button type="submit" size="sm">
                      Pagar
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
