"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// El layout raíz ya pinta la clase `dark` en el <html> del primer HTML, leyendo esta misma cookie
// server-side (blueprint.md §9, paso 2). Este botón es lo único que la escribe — antes la cookie
// se leía pero nada la ponía, así que el modo oscuro solo se alcanzaba a mano.
//
// El icono NO depende de estado de React: se resuelve con la variante `dark:` de Tailwind sobre
// la clase del <html>. Eso evita el desajuste de hidratación clásico de los selectores de tema
// (el servidor no sabe qué icono corresponde hasta que lee la cookie, y cualquier `useState`
// inicial adivina mal en la primera pintura).
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    document.cookie = `theme=${isDark ? "dark" : "light"}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar entre modo claro y oscuro"
      className={className}
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </Button>
  );
}
