import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookings, vehicles } from "@/lib/db/schema";

describe("seed", () => {
  it("leaves exactly 1 active vehicle and 1 confirmed booking", async () => {
    const activeVehicles = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.status, "active"));
    const confirmedBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.status, "confirmed"));

    expect(activeVehicles).toHaveLength(1);
    expect(confirmedBookings).toHaveLength(1);
  });
});
