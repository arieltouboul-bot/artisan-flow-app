"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { Settings, Mail, Loader2, LogOut, Building2, Upload, ImageIcon } from "lucide-react";
import { useLanguage } from "@/context/language-context";

const BUCKET = "company-logos";

export default function ParametresPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { profile, loading: profileLoading, upsertProfile } = useProfile();
  const { language, setLanguage } = useLanguage();
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [address, setAddress] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name ?? "");
      setSiret(profile.siret ?? "");
      setAddress(profile.address ?? "");
    }
  }, [profile?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("af_language");
    if (stored === "fr" || stored === "en") {
      setLanguage(stored);
    }
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveLoading(true);
    const result = await upsertProfile({
      company_name: companyName.trim() || undefined,
      siret: siret.trim() || undefined,
      address: address.trim() || undefined,
    });
    setSaveLoading(false);
    if (result.error) {
      setSaveError(result.error instanceof Error ? result.error.message : String(result.error));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const supabase = createClient();
    if (!supabase) return;
    setLogoLoading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) {
      setSaveError(uploadError.message);
      setLogoLoading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const result = await upsertProfile({ logo_url: publicUrl });
    if (result.error) setSaveError(String(result.error));
    setLogoLoading(false);
    e.target.value = "";
  };

  const loading = userLoading || profileLoading;

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-brand-blue-500" />
        <p className="mt-2 text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          Paramètres
        </h1>
        <p className="mt-1 text-gray-500">
          Compte et profil entreprise
        </p>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-blue-500" />
            Profil entreprise
          </CardTitle>
          <p className="text-sm text-gray-500">
            Nom, SIRET, adresse et logo pour vos devis et documents
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div>
              <label htmlFor="company_name" className="text-sm font-medium text-gray-700 mb-1 block">
                Nom de l&apos;entreprise
              </label>
              <Input
                id="company_name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Mon Entreprise SARL"
                className="min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="siret" className="text-sm font-medium text-gray-700 mb-1 block">
                SIRET
              </label>
              <Input
                id="siret"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="123 456 789 00012"
                className="min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="address" className="text-sm font-medium text-gray-700 mb-1 block">
                Adresse
              </label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 rue Example, 75000 Paris"
                className="min-h-[48px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Logo</label>
              <div className="flex flex-wrap items-center gap-4">
                {profile?.logo_url ? (
                  <div className="relative h-20 w-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    <Image
                      src={profile.logo_url}
                      alt="Logo"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                >
                  {logoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {profile?.logo_url ? "Changer le logo" : "Uploader un logo"}
                </Button>
              </div>
            </div>
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}
            <Button type="submit" disabled={saveLoading}>
              {saveLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer le profil
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-brand-blue-500" />
            Compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Langue de l&apos;interface</p>
              <p className="text-xs text-gray-500">
                Français ou Anglais pour les libellés et l&apos;agent IA
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={language === "fr" ? "default" : "outline"}
                size="sm"
                className="min-h-[40px] px-4"
                onClick={() => {
                  setLanguage("fr");
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("af_language", "fr");
                  }
                }}
              >
                Français
              </Button>
              <Button
                type="button"
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                className="min-h-[40px] px-4"
                onClick={() => {
                  setLanguage("en");
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("af_language", "en");
                  }
                }}
              >
                English
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <Mail className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-gray-900">{user?.email ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-sm font-medium text-gray-500">Identifiant</p>
            <p className="font-mono text-sm text-gray-600 truncate max-w-full" title={user?.id}>
              {user?.id ?? "—"}
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-4 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
