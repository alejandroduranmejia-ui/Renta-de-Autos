import { FileCheck2, IdCard, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLATFORM_COMMISSION_RATE } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Publica tu vehículo",
  description:
    "Pon tu vehículo a rentar entre personas verificadas de tu ciudad. Tú fijas el precio y las fechas.",
};

// Versión mínima: existe para que el CTA del home no caiga en una ruta autenticada sin contexto.
// La landing completa (calculadora de ingresos, testimonios) llega en la Ola 4.
const REQUIREMENTS = [
  {
    icon: IdCard,
    title: "Tu identidad verificada",
    description:
      "Subes tu cédula o licencia y un administrador la revisa, normalmente en menos de 24 horas.",
  },
  {
    icon: FileCheck2,
    title: "Documentos del vehículo",
    description:
      "Tarjeta de circulación y póliza de seguro vigente. Sin las dos aprobadas, la publicación no se activa.",
  },
  {
    icon: Wallet,
    title: "Una cuenta para recibir pagos",
    description:
      "El pago del arrendatario se libera a tu cuenta al terminar la renta, menos la comisión de la plataforma.",
  },
];

export default function PublicaTuVehiculoPage() {
  const commissionPercent = Math.round(PLATFORM_COMMISSION_RATE * 100);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-6 py-20">
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
          Tu vehículo puede pagarse solo.
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground text-balance">
          Pon tu vehículo a rentar entre personas verificadas de tu ciudad. Tú
          fijas el precio por día y decides qué fechas aceptas.
        </p>
        <Button size="lg" asChild className="h-11 px-6 text-base">
          <Link href="/mis-vehiculos/nuevo">Publicar mi vehículo</Link>
        </Button>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-foreground">
          Qué necesitas para empezar
        </h2>
        <ul className="flex flex-col gap-5">
          {REQUIREMENTS.map((item) => (
            <li key={item.title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <item.icon className="size-5 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-medium text-card-foreground">Cuánto cobramos</h2>
        <p className="text-sm text-muted-foreground">
          La plataforma retiene un {commissionPercent}% de cada renta. Publicar
          es gratis y no hay cuota mensual — si tu vehículo no se renta, no
          pagas nada.
        </p>
      </section>
    </div>
  );
}
