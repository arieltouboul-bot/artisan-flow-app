"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Hammer, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white via-brand-blue-50/30 to-brand-blue-100/40 px-4">
      <div className="flex items-center gap-2 text-brand-blue-600 mb-6">
        <Hammer className="h-10 w-10" />
        <span className="text-xl font-bold">Artisan Flow</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Une erreur est survenue</h1>
      <p className="mt-4 text-gray-600 text-center max-w-md">
        {error.message || "Un problème inattendu s&apos;est produit. Réessayez ou retournez à l&apos;accueil."}
      </p>
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
        <Link href="/">
          <Button variant="outline">Accueil</Button>
        </Link>
      </div>
    </div>
  );
}
