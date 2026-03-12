"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderKanban, LayoutDashboard } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-gray-600 text-center">
        Cette page n&apos;existe pas.
      </p>
      <Link href="/dashboard" className="mt-8">
        <Button className="gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Retour au tableau de bord
        </Button>
      </Link>
    </div>
  );
}
