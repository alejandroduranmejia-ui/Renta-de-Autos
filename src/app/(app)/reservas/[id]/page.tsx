import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/app/chat-thread";
import { db } from "@/lib/db";
import { bookings, messages, vehicles } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";

export default async function ReservaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireUser();

  const [row] = await db
    .select({ booking: bookings, ownerId: vehicles.ownerId })
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
      <h1 className="text-xl font-semibold text-foreground">Reserva</h1>
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
