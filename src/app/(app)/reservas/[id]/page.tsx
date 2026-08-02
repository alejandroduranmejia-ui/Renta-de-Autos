import { eq } from "drizzle-orm";
import { CalendarRange } from "lucide-react";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/app/chat-thread";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { bookings, messages, vehicles } from "@/lib/db/schema";
import { formatPriceCents } from "@/lib/format";
import { requireUser } from "@/server/auth/guards";

const STATUS_LABEL: Record<string, string> = {
  held: "Pendiente de pago",
  confirmed: "Confirmada",
  active: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ReservaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireUser();

  const [row] = await db
    .select({
      booking: bookings,
      ownerId: vehicles.ownerId,
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(bookings)
    .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(eq(bookings.id, id))
    .limit(1);
  if (!row || (row.booking.renterId !== actor.id && row.ownerId !== actor.id)) {
    notFound();
  }

  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.bookingId, id))
    .orderBy(messages.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {row.make} {row.model}
            </h1>
            <span className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarRange className="size-3.5" />
              {formatDate(row.booking.startsAt)} –{" "}
              {formatDate(row.booking.endsAt)}
            </span>
          </div>
          <Badge>
            {STATUS_LABEL[row.booking.status] ?? row.booking.status}
          </Badge>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">
          {formatPriceCents(
            row.booking.priceCents + row.booking.depositHoldCents,
            row.booking.currency,
          )}
        </p>
      </div>

      <ChatThread
        bookingId={id}
        currentUserId={actor.id}
        initialMessages={thread.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
