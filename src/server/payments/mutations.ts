"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { getOrCreateConnectOnboardingLinkCore } from "@/server/payments/connect";

export async function startConnectOnboarding() {
  const actor = await requireUser();
  const headersList = await headers();
  const host = headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";

  const { onboardingUrl } = await getOrCreateConnectOnboardingLinkCore(
    actor,
    `${proto}://${host}`,
  );
  redirect(onboardingUrl);
}
