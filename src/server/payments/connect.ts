import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";

type Actor = { id: string };

// Crea (o reutiliza) la cuenta conectada Express del dueño y devuelve el link de onboarding
// hospedado de Stripe. El KYC real (identidad + cuenta bancaria) lo resuelve ese flujo hospedado —
// nunca se construye a mano (blueprint.md §11, capabilities/auth.md).
export async function getOrCreateConnectOnboardingLinkCore(
  actor: Actor,
  returnOrigin: string,
) {
  let [account] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.ownerId, actor.id))
    .limit(1);

  if (!account) {
    const stripeAccount = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
      },
    });
    [account] = await db
      .insert(connectedAccounts)
      .values({
        ownerId: actor.id,
        stripeAccountId: stripeAccount.id,
        payoutsEnabled: false,
        verificationStatus: "pending",
      })
      .returning();
  }

  const link = await stripe.accountLinks.create({
    account: account.stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${returnOrigin}/mis-vehiculos`,
    return_url: `${returnOrigin}/mis-vehiculos`,
  });

  return { onboardingUrl: link.url };
}

// Separado de `syncConnectedAccountCore` a propósito: esta parte (la escritura en base de datos)
// es la que un test puede ejercitar directamente con datos ya obtenidos, sin necesitar una llamada
// real a la API de Stripe — la llamada de red vive únicamente en `syncConnectedAccountCore`.
export async function applyAccountSync(
  stripeAccountId: string,
  data: { payoutsEnabled: boolean; detailsSubmitted: boolean },
) {
  const [updated] = await db
    .update(connectedAccounts)
    .set({
      payoutsEnabled: data.payoutsEnabled,
      verificationStatus: data.detailsSubmitted ? "verified" : "pending",
    })
    .where(eq(connectedAccounts.stripeAccountId, stripeAccountId))
    .returning();

  return updated ?? null;
}

// Llamado por el webhook `account.updated` — nunca confía en el payload del evento, vuelve a
// consultar el objeto real a la API de Stripe antes de escribir (blueprint.md §5, "refetch on
// webhook").
export async function syncConnectedAccountCore(stripeAccountId: string) {
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return applyAccountSync(stripeAccountId, {
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  });
}
