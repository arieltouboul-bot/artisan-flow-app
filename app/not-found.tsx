"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Hammer, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white via-brand-blue-50/30 to-brand-blue-100/40 px-4">
      <div className="flex items-center gap-2 text-brand-blue-600 mb-6">
        <Hammer className="h-10 w-10" />
        <span className="text-xl font-bold">Artisan Flow</span>
      </div>
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-lg text-gray-600 text-center max-w-md">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </Link>
        <Button variant="outline" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      </div>
    </div>
  );
}
