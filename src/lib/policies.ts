// Las promesas que la plataforma le hace al arrendatario, en un solo lugar, para que la ficha y
// cualquier otra pantalla digan exactamente lo mismo.
//
// REGLA: nada de este archivo puede prometer algo que el código no haga. Turo promete
// "cancelación gratuita con reembolso total dentro de 24 h" porque tiene el reembolso
// implementado; nosotros no lo tenemos (`cancelBookingCore` cambia el estado a `cancelled` y no
// llama a Stripe), así que la política de abajo describe el comportamiento real y no ese.
// Decisión del dueño del producto el 2026-08-02: redactar ajustado en vez de implementar
// reembolsos ahora.

export const INCLUDED_IN_PRICE = [
  {
    title: "Chat directo con el dueño",
    description:
      "Coordinas entrega y devolución por el chat de la reserva, sin intermediarios.",
  },
  {
    title: "Identidad y documentos verificados",
    description:
      "Un administrador revisó la cédula del dueño, la tarjeta de circulación y la póliza antes de que el vehículo se publicara.",
  },
  {
    title: "Depósito reembolsable, no cobrado",
    description:
      "El depósito se autoriza en tu tarjeta y se libera al devolver el vehículo si no hay daños reportados.",
  },
] as const;

export const RULES_OF_USE = [
  {
    title: "No se fuma dentro del vehículo",
    description:
      "El dueño puede reportar el incumplimiento y descontarlo del depósito.",
  },
  {
    title: "Se devuelve con el mismo nivel de combustible",
    description: "La diferencia se acuerda entre las partes por el chat.",
  },
  {
    title: "Solo conduce quien reservó",
    description:
      "La identidad verificada es la de quien reserva; prestar el vehículo a un tercero rompe el acuerdo.",
  },
  {
    title: "Se devuelve razonablemente limpio",
    description: "Un vehículo devuelto sucio puede descontarse del depósito.",
  },
] as const;

export const CANCELLATION_POLICY = {
  title: "Cancelación",
  points: [
    "Mientras la reserva esté pendiente de pago, la cancelas tú mismo sin ningún costo.",
    "Si no pagas dentro de los 15 minutos siguientes, la reserva se libera sola y las fechas vuelven a quedar disponibles.",
    "Una vez confirmada, escríbele al dueño por el chat de la reserva: la devolución del pago se coordina caso por caso, todavía no es automática.",
  ],
} as const;
