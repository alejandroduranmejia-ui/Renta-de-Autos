import { Car } from "lucide-react";
import Link from "next/link";

// Solo rutas que existen de verdad — un footer con enlaces muertos daña más la confianza que no
// tener footer.
const SECTIONS: { title: string; links: { href: string; label: string }[] }[] =
  [
    {
      title: "Explorar",
      links: [
        { href: "/vehiculos", label: "Vehículos disponibles" },
        { href: "/registro", label: "Crear una cuenta" },
        { href: "/iniciar-sesion", label: "Iniciar sesión" },
      ],
    },
    {
      title: "Para dueños",
      links: [
        { href: "/publica-tu-vehiculo", label: "Publica tu vehículo" },
        { href: "/mis-vehiculos", label: "Mis vehículos" },
        { href: "/verificacion", label: "Verificar mi identidad" },
      ],
    },
  ];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Car className="size-5 text-primary" />
            Renta de Vehículos
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">
            Renta entre particulares con identidad y documentos verificados
            antes de publicar o reservar.
          </p>
        </div>

        <div className="flex gap-12">
          {SECTIONS.map((section) => (
            <nav key={section.title} className="flex flex-col gap-3">
              <span className="text-sm font-medium text-foreground">
                {section.title}
              </span>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl border-t border-border px-6 py-6">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Renta de Vehículos
        </p>
      </div>
    </footer>
  );
}
