"use client";

import { useState, useRef, FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Sparkles, X } from "lucide-react";
import { useAssistant } from "@/context/assistant-context";
import { useDailyBriefing } from "@/hooks/use-daily-briefing";
import type { AssistantMessage, ModifiedEntity } from "@/context/assistant-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CHART_COLORS = ["#0066FF", "#00a86b", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

function MessageBubble({
  m,
  onEntityClick,
}: {
  m: AssistantMessage;
  onEntityClick?: () => void;
}) {
  const isUser = m.role === "user";
  return (
    <div className={`mb-1.5 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs ${
          isUser
            ? "bg-brand-blue-500 text-white"
            : "bg-white/80 text-gray-800 border border-gray-100"
        }`}
      >
        <div className="whitespace-pre-wrap">{m.text}</div>
        {m.chartData && m.chartData.length > 0 && (
          <div className="mt-2 h-[160px] w-full min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={m.chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {m.chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} €`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {m.modifiedEntities && m.modifiedEntities.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
            <span className="text-[10px] font-medium uppercase text-brand-blue-600">Modifié par l&apos;IA</span>
            {m.modifiedEntities.map((ent: ModifiedEntity, i: number) => (
              <Link
                key={i}
                href={ent.link}
                onClick={onEntityClick}
                className="block rounded-lg border border-brand-blue-200 bg-brand-blue-50/80 px-2 py-1 text-[11px] text-brand-blue-700 transition-all duration-300 hover:shadow-[0_0_12px_rgba(0,102,255,0.35)]"
              >
                <span className="font-medium">{ent.name}</span>
                {ent.fields.length ? ` · ${ent.fields.join(", ")}` : ""}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FloatingAssistant() {
  const pathname = usePathname();
  const { messages, sendMessage, isProcessing } = useAssistant();
  const { summary: dailyBriefing } = useDailyBriefing();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const isDashboard = pathname === "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const toSend = input;
    setInput("");
    await sendMessage(toSend);
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="assistant-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-4 z-40 w-[min(380px,calc(100%-2rem))]"
          >
            <div className="relative rounded-2xl border border-white/20 bg-white/75 bg-clip-padding p-3 shadow-brand-glow backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue-500 text-white shadow-brand-glow">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900">Agent IA Expert</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-2 flex items-center gap-2 rounded-lg bg-brand-blue-50/80 px-2 py-1.5 text-xs text-brand-blue-700"
                >
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    L&apos;IA analyse votre demande...
                  </motion.span>
                </motion.div>
              )}

              <p className="mb-2 text-xs text-gray-500">
                Ex. : « Ajoute 1500€ au projet Leroy », « Nouveau projet : Salle de bain 8m² pour Mme Martin »,
                « Marge moyenne ce mois-ci ? », « Répartition des dépenses ».
              </p>
              <div
                ref={listRef}
                className="mb-3 max-h-64 overflow-y-auto rounded-xl bg-white/40 p-2 text-sm text-gray-800"
              >
                {messages.length === 0 && !isProcessing ? (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">
                    {isDashboard && dailyBriefing
                      ? dailyBriefing
                      : "Pose une question ou donnez un ordre : CA, nouveau projet, marge, employés, rappels, graphiques."}
                  </p>
                ) : (
                  messages.map((m) => <MessageBubble key={m.id} m={m} />)
                )}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Demande à l'agent..."
                  className="min-h-[40px] text-sm"
                  disabled={isProcessing}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-brand-blue-500 text-white hover:bg-brand-blue-600"
                  disabled={!input.trim() || isProcessing}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-500 text-white shadow-brand-glow hover:bg-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Ouvrir l'assistant IA"
      >
        <Sparkles className="h-6 w-6" />
      </motion.button>
    </>
  );
}
