"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/guards";
import { createCheckoutSessionCore } from "@/server/payments/checkout";
import { getOrCreateConnectOnboardingLinkCore } from "@/server/payments/connect";

async function originFromHeaders() {
  const headersList = await headers();
  const host = headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function startConnectOnboarding() {
  const actor = await requireUser();
  const { onboardingUrl } = await getOrCreateConnectOnboardingLinkCore(
    actor,
    await originFromHeaders(),
  );
  redirect(onboardingUrl);
}

export async function startBookingCheckout(formData: FormData) {
  const actor = await requireUser();
  const bookingId = z.string().uuid().parse(formData.get("bookingId"));

  const { checkoutUrl } = await createCheckoutSessionCore(
    actor,
    bookingId,
    await originFromHeaders(),
  );
  if (!checkoutUrl) throw new Error("Stripe no devolvió una URL de checkout.");
  redirect(checkoutUrl);
}
