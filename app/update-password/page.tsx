"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hammer, Loader2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setError("Lien de réinitialisation invalide ou expiré. Recommencez depuis la page Mot de passe oublié.");
      }
      setReady(true);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
            <CardTitle className="text-xl text-center">Nouveau mot de passe</CardTitle>
            <p className="text-sm text-gray-500 text-center">
              Choisissez un nouveau mot de passe pour votre compte ArtisanFlow.
            </p>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-brand-blue-500" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">
                    Nouveau mot de passe
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-[48px]"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-1 block">
                    Confirmer le mot de passe
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="min-h-[48px]"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
                )}
                <Button type="submit" className="w-full min-h-[48px]" disabled={loading || !ready}>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Mettre à jour le mot de passe"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

