import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { paymentEvents } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { syncConnectedAccountCore } from "@/server/payments/connect";

// Verifica la firma contra el cuerpo CRUDO antes de parsear nada — Next.js App Router entrega el
// body sin tocar vía request.text(), así que no hace falta excluir esta ruta de ningún body
// parser (a diferencia del Pages Router). blueprint.md §5, §14.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing signature");
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Ledger de idempotencia bajo constraint único — un evento repetido falla el insert y no hace
  // nada más, respondiendo 200 igual (los proveedores reintentan por días).
  try {
    await db.insert(paymentEvents).values({
      provider: "stripe",
      externalEventId: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  // Nunca confía en el payload del evento — vuelve a consultar el objeto real a la API.
  if (event.type === "account.updated") {
    const accountId = (event.data.object as Stripe.Account).id;
    await syncConnectedAccountCore(accountId);
  }

  return NextResponse.json({ received: true });
}
