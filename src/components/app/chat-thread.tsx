"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendMessage } from "@/server/messages/mutations";

type Message = {
  id: string;
  bookingId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

// Suscripción a Supabase Realtime (Postgres Changes) filtrada por `booking_id` — la política RLS
// de la migración 0003 es la que de verdad decide qué INSERTs le llegan a este cliente; el filtro
// de aquí es solo para no reprocesar eventos de otras reservas si algún día esa política cambia
// (blueprint.md §9, paso 13).
export function ChatThread({
  bookingId,
  currentUserId,
  initialMessages,
}: {
  bookingId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;

    // Realtime valida el rol de la conexión (RLS) contra los claims del `access_token` en el
    // instante exacto del join — si se suscribe antes de que la sesión termine de hidratarse
    // desde la cookie, el primer join sale sin token (rol `anon`, sin grant sobre `messages`) y
    // Realtime lo rechaza para siempre, sin reintentar solo porque `setAuth` llegue después
    // (verificado en vivo: `getSession()` seguido de `subscribe()` en el mismo tick reproducía
    // el rechazo de forma determinista). Esperar la sesión y fijar el auth ANTES de suscribirse
    // evita esa carrera.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        supabase.realtime.setAuth(data.session.access_token);
      }
      channel = supabase
        .channel(`messages:booking:${bookingId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `booking_id=eq.${bookingId}`,
          },
          (payload) => {
            const incoming = payload.new as Message;
            setMessages((current) =>
              current.some((m) => m.id === incoming.id)
                ? current
                : [...current, incoming],
            );
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2" aria-label="Mensajes">
        {messages.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Aún no hay mensajes, escribe para coordinar la entrega.
          </li>
        )}
        {messages.map((m) => (
          <li
            key={m.id}
            data-sender={m.senderId === currentUserId ? "self" : "other"}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            {m.body}
          </li>
        ))}
      </ul>
      <form
        ref={formRef}
        action={async (formData) => {
          await sendMessage(formData);
          formRef.current?.reset();
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <input
          name="body"
          placeholder="Escribe un mensaje"
          required
          className="flex-1 rounded-lg border border-input px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
