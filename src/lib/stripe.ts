import Stripe from "stripe";
import { env } from "@/lib/env";

// Un solo cliente exportado — cualquier código que hable con Stripe pasa por aquí.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
