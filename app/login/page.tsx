"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
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
            <CardTitle className="text-xl text-center">Connexion</CardTitle>
            <p className="text-sm text-gray-500 text-center">
              ArtisanFlow - Gestion chantiers & finances
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">
                  Mot de passe
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
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
            <div className="mt-3 text-center">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand-blue-600 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <p className="text-sm text-gray-500 text-center mt-4">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="text-brand-blue-600 hover:underline font-medium">
                S&apos;inscrire
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
