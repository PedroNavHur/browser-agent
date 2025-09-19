"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/convexApi";
import { convexClient } from "./convex-provider";

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  hint?: string;
};

const introMessages: ChatMessage[] = [
  {
    id: "intro-1",
    role: "agent",
    text: "Hola, soy Buscalo — tu agente explorador de mapas inmobiliarios.",
    hint: "Pídeme que busque alquileres, aplique filtros o genere una exportación.",
  },
  {
    id: "intro-2",
    role: "agent",
    text: "Describe qué ciudad, presupuesto y requisitos quieres y me pondré a trabajar.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(introMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isConvexConfigured = useMemo(() => Boolean(convexClient), []);

  const enqueueMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    enqueueMessage(userMessage);
    setInput("");
    setIsSending(true);

    try {
      if (!isConvexConfigured) {
        enqueueMessage({
          id: `agent-missing-${Date.now()}`,
          role: "agent",
          text: "Necesitamos configurar Convex para hablar con el agente real. Añade NEXT_PUBLIC_CONVEX_URL y vuelve a intentarlo.",
        });
        return;
      }

      const client = convexClient;
      if (!client) {
        throw new Error("Convex client unavailable");
      }

      const response = await client.action(api.agent.sendMessage, {
        text: trimmed,
      });

      enqueueMessage({
        id: response.trackingId,
        role: "agent",
        text: response.reply,
        hint: `Tracking ID: ${response.trackingId}`,
      });
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Algo salió mal al contactar al agente.";
      enqueueMessage({
        id: `agent-error-${Date.now()}`,
        role: "agent",
        text: "No pude enviar tu mensaje en este momento.",
        hint: errorText,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="container mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2 text-center">
          <span className="badge badge-secondary badge-outline mx-auto w-fit">
            Buscalo · Browser Agent
          </span>
          <h1 className="text-3xl font-bold sm:text-4xl">Habla con Buscalo</h1>
          <p className="text-base-content/80">
            Describe la misión inmobiliaria y prepararemos al agente para
            navegar mapas, aplicar filtros y extraer listings reales.
          </p>
        </header>

        <section className="card flex-1 bg-base-100 shadow-xl">
          <div className="card-body flex h-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Chat piloto</h2>
              <span
                className={`badge ${isConvexConfigured ? "badge-success" : "badge-warning"}`}
              >
                {isConvexConfigured ? "Convex listo" : "Configura Convex"}
              </span>
            </div>

            <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto rounded-box border border-base-300 bg-base-200/60 p-4">
              {messages.map((message) => {
                const isAgent = message.role === "agent";
                return (
                  <div
                    key={message.id}
                    className={`chat ${isAgent ? "chat-start" : "chat-end"}`}
                  >
                    <div className="chat-header mb-1 text-sm opacity-70">
                      {isAgent ? "Buscalo" : "Tú"}
                    </div>
                    <div
                      className={`chat-bubble ${
                        isAgent ? "chat-bubble-primary" : "chat-bubble-accent"
                      } whitespace-pre-wrap`}
                    >
                      {message.text}
                    </div>
                    {message.hint ? (
                      <div className="chat-footer mt-1 text-xs opacity-60">
                        {message.hint}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <label className="form-control">
                <div className="label">
                  <span className="label-text">
                    ¿Qué quieres que haga el agente?
                  </span>
                  <span className="label-text-alt text-xs opacity-60">
                    Ejemplo: "Busca estudios en Jersey City bajo $2,000 y
                    permite mascotas"
                  </span>
                </div>
                <textarea
                  className="textarea textarea-bordered min-h-24"
                  placeholder="Describe tu misión inmobiliaria"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={isSending}
                  required
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm opacity-70">
                  El agente usará Browserbase + Stagehand en la siguiente
                  iteración.
                </span>
                <button
                  className={`btn btn-primary ${isSending ? "loading" : ""}`}
                  type="submit"
                  disabled={isSending || !isConvexConfigured}
                >
                  {isSending ? "Enviando" : "Enviar a Buscalo"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
