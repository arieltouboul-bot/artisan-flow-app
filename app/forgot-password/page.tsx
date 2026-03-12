"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hammer, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }
    try {
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/update-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess("Vérifiez vos emails pour le lien de réinitialisation.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue-500 text-white shadow-brand-glow">
            <Hammer className="h-8 w-8" />
          </div>
        </div>
        <Card className="overflow-hidden shadow-brand-glow">
          <CardHeader>
            <CardTitle className="text-xl text-center">Mot de passe oublié</CardTitle>
            <p className="text-sm text-gray-500 text-center">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="min-h-[48px]"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}
              {success && (
                <p className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                  {success}
                </p>
              )}
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Envoyer le lien de récupération"
                )}
              </Button>
            </form>
            <p className="text-sm text-gray-500 text-center mt-4">
              <Link href="/login" className="text-brand-blue-600 hover:underline font-medium">
                ← Retour à la connexion
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

