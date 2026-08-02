import { FileCheck2, ShieldCheck } from "lucide-react";
import type { VehicleVerification } from "@/server/vehicles/queries";

// Lo que la plataforma ya verifica de verdad — identidad revisada por un admin y documentos del
// vehículo aprobados — hecho visible en la ficha. Hasta ahora era el activo de confianza más caro
// del producto y no aparecía en ninguna pantalla pública.
//
// Solo se muestra lo que está aprobado: un badge ausente no afirma nada, y nunca se pinta un
// estado "pendiente" en verde.
export function TrustBadges({
  verification,
}: {
  verification: VehicleVerification;
}) {
  const badges = [
    verification.identityApproved && {
      icon: ShieldCheck,
      label: "Identidad del dueño verificada",
    },
    verification.documentsApproved && {
      icon: FileCheck2,
      label: "Tarjeta de circulación y póliza al día",
    },
  ].filter(Boolean) as { icon: typeof ShieldCheck; label: string }[];

  if (badges.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {badges.map((badge) => (
        <li
          key={badge.label}
          className="flex items-center gap-2 text-sm text-foreground"
        >
          <badge.icon className="size-4 shrink-0 text-success" />
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
