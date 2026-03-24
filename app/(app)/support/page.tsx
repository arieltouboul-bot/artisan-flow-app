"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        {language === "en" ? "Help & Support" : t("helpSupport", language)}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === "en" ? "How to install on iPhone" : "Comment installer sur iPhone"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {language === "en"
            ? "Share > Add to Home Screen."
            : "Partager > Ajouter à l'écran d'accueil."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === "en" ? "Financial Tracking" : "Suivi financier"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {language === "en"
            ? "Margin = Revenues - (Materials + Rentals + Team salaries)."
            : "Marge = Revenus - (Matériaux + Locations + Salaires équipe)."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === "en" ? "Team Management" : "Gestion de l'équipe"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {language === "en"
            ? "Add staff and configure salary type and salary amount from Team."
            : "Ajoutez des employés et configurez leur type de salaire et leur montant depuis Équipe."}
        </CardContent>
      </Card>
    </div>
  );
}
