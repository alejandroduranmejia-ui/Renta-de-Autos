"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

// `type="button"` a propósito: si fuera `type="submit"`, sería el primer
// `button[type="submit"]` en el DOM de cualquier página de (app) (el header se renderiza antes
// que el contenido), y un selector de test tan genérico como `page.click('button[type="submit"]')`
// terminaría cerrando la sesión en vez de enviar el formulario de la página (verificado en vivo:
// exactamente eso rompía tests/e2e/chat.spec.ts). `requestSubmit()` desde el manejador de click
// dispara igual la Server Action del formulario que lo envuelve.
export function SignOutButton(props: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      type="button"
      onClick={(e) => {
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
