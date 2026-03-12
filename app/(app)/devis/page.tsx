"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default function DevisPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          Devis
        </h1>
        <p className="mt-1 text-gray-500">
          Créez et téléchargez vos devis
        </p>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-blue-600" />
            Nouveau devis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-6">
            Générez un devis PDF à partir d&apos;un client, d&apos;une date de validité et de lignes de prestations.
          </p>
          <Link href="/devis/nouveau">
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Créer un devis
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
