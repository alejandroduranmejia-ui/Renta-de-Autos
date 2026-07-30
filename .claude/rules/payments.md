---
description: Webhooks de Stripe, idempotencia, montos y depósitos
paths:
  - "src/server/payments/**"
  - "src/app/api/webhooks/**"
---

- Verifica la firma de Stripe contra el **cuerpo crudo** antes de parsear nada. La ruta del webhook
  está excluida de cualquier body parser que reescriba bytes.
- Inserta `payment_events.external_event_id` bajo constraint único, en la misma transacción que el
  cambio de estado. Un duplicado falla el insert y no hace nada más.
- Nunca confíes en el payload del webhook para el estado final — vuelve a consultar el objeto real a
  la API de Stripe antes de escribir.
- El depósito de garantía se retiene con `capture_method: manual` — nunca se captura salvo un reporte
  de daño explícito (fuera de alcance de v1). Solo el precio se captura al completar la renta.
- Los fondos del arrendador nunca pasan por la cuenta operativa de la plataforma — siempre por la
  cuenta conectada de Stripe (`connected_accounts.stripe_account_id`).
- Responde `200` rápido; el trabajo lento (emails) va después de escribir el estado, nunca antes.
