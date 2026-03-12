"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Hammer, Sparkles } from "lucide-react";

type Language = "fr" | "en";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("fr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("af_language");
    if (stored === "fr" || stored === "en") {
      setLanguage(stored);
    }
  }, []);

  const isEn = language === "en";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white shadow-lg ring-1 ring-white/20">
              <Hammer className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Artisan Flow</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white min-h-[44px]">
                {isEn ? "Sign in" : "Connexion"}
              </Button>
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-20 md:py-32 md:px-8">
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="text-center"
        >
          <motion.div variants={item} className="mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 shadow-xl">
              <Hammer className="h-8 w-8" />
            </div>
          </motion.div>
          <motion.h1
            variants={item}
            className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight"
          >
            {isEn
              ? "Artisan Flow: Your site, your team, your success."
              : "Artisan Flow : Votre chantier, votre équipe, votre succès."}
          </motion.h1>
          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg text-blue-100 md:text-xl"
          >
            {isEn
              ? "Manage your jobsites, margins and clients at a glance."
              : "Gérez vos chantiers, vos marges et vos clients en un clin d'œil."}
          </motion.p>
          <motion.div variants={item} className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="min-h-[56px] px-10 text-base font-semibold bg-white text-blue-900 hover:bg-blue-50 shadow-xl"
              >
                {isEn ? "Get started" : "Commencer l'aventure"}
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="min-h-[56px] gap-2 border-2 border-white/50 bg-white/10 px-8 text-base font-semibold text-white hover:bg-white/20"
              >
                <Sparkles className="h-5 w-5" />
                {isEn ? "✨ Talk with the AI Expert" : "✨ Parler avec l'Agent IA Expert"}
              </Button>
            </Link>
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-24 grid gap-6 md:grid-cols-3"
        >
          {[
            {
              title: isEn ? "Projects" : "Chantiers",
              text: isEn
                ? "Track your projects, dates and tasks in one place."
                : "Suivez vos projets et tâches en un seul endroit.",
            },
            {
              title: isEn ? "Margins & Revenue" : "Marges & CA",
              text: isEn
                ? "Pilot your business with clear dashboards."
                : "Pilotez votre activité avec des tableaux de bord clairs.",
            },
            {
              title: isEn ? "Clients" : "Clients",
              text: isEn
                ? "Centralise your contacts and history by client."
                : "Centralisez vos contacts et historiques.",
            },
          ].map(({ title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-blue-200">{text}</p>
            </motion.div>
          ))}
        </motion.section>
      </main>
    </div>
  );
}
