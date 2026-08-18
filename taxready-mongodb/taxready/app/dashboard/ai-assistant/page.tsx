"use client";

import { useState, useRef, useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { useTaxReadyData } from "@/components/providers/data-provider";
import { Sparkles, Send, User } from "lucide-react";

const SUGGESTIONS = [
  "How much did I spend on business expenses this month?",
  "Which transactions need receipts?",
  "Show me my largest expense categories.",
  "Which transactions are uncategorized?",
  "Prepare a summary for my accountant."
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiAssistantPage() {
  const { transactions, receipts, business } = useTaxReadyData();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask me about your own transactions, receipts, or categories — I only ever look at Lagos Retail Co.'s records."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transactions, receipts, businessId: business.id })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer ?? "I couldn't find an answer to that." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong answering that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="AI Assistant" />
      <div className="flex h-[calc(100vh-73px)] flex-col p-5 md:p-8">
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Sparkles size={14} />
                </span>
              )}
              <div
                className={`max-w-[75%] whitespace-pre-line rounded-xl2 px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-ink text-paper" : "border border-line bg-white text-ink/80"
                }`}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-ink/50">
                  <User size={14} />
                </span>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 pl-11 text-xs text-ink/40">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400 [animation-delay:300ms]" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {messages.length <= 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="focus-ring rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink/65 hover:border-brand-300 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-4 shadow-card"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your transactions, receipts, or categories…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button type="submit" disabled={loading} className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-40">
            <Send size={15} />
          </button>
        </form>
      </div>
    </>
  );
}
