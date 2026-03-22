"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/language-context";
import { BookOpen, ScanLine, FolderKanban, Sparkles, FileDown } from "lucide-react";

const sections = {
  en: [
    {
      id: "start",
      title: "Getting started",
      icon: BookOpen,
      body: (
        <div className="space-y-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Set up your workspace in a few steps:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open <strong>Settings</strong> and enter your <strong>business name</strong>, <strong>logo</strong>,{" "}
              <strong>default currency</strong>, and <strong>VAT rate</strong>. This drives quotes, invoices, and PDF
              headers.
            </li>
            <li>
              Create <strong>Clients</strong> with contact details; then create <strong>Projects</strong> (jobs) and link
              them to clients.
            </li>
            <li>
              Use the <strong>Dashboard</strong> for revenue vs. expenses and quick navigation to overdue items.
            </li>
            <li>
              Invite or manage your <strong>team</strong> under Employees when you use crew on multiple sites.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: "scan",
      title: "Smart scanning (invoices)",
      icon: ScanLine,
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>For the most accurate OCR and fewer corrections:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Shoot in <strong>bright, even light</strong>; avoid flash glare on thermal paper.</li>
            <li>Keep the receipt <strong>flat</strong> and fill the frame; re-take if motion-blurred.</li>
            <li>
              The app applies <strong>contrast enhancement</strong> before OCR (scanner-style pipeline).
            </li>
            <li>
              After upload, <strong>always verify</strong> vendor, date, and total; fields with lower confidence appear{" "}
              <span className="text-amber-700 font-medium">highlighted</span>.
            </li>
            <li>
              When you fix a vendor name, the app can <strong>remember</strong> the mapping locally for the next scan.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "projects",
      title: "Project management",
      icon: FolderKanban,
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Each <strong>project</strong> stores contract value, amounts collected, and material costs — your margin is
              visible at a glance.
            </li>
            <li>
              Attach <strong>expenses and invoice photos</strong> to a project when you select it during import; this
              keeps job P&amp;L realistic.
            </li>
            <li>
              Use <strong>Calendar</strong> for appointments (quotes, site visits) so nothing conflicts with your
              schedule.
            </li>
            <li>
              On mobile, <strong>swipe left</strong> on a project row to edit or delete quickly without opening the ⋮
              menu.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "ai",
      title: "AI commands",
      icon: Sparkles,
      body: (
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Open the <strong>AI Command Center</strong> via the floating <strong>sparkle</strong> button (bottom-right),
            or press <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs">⌘</kbd>{" "}
            <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs">K</kbd> /{" "}
            <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd>{" "}
            <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs">K</kbd>. Type natural-language
            orders in English or French.
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 font-semibold text-gray-900">Example command</th>
                  <th className="px-3 py-2 font-semibold text-gray-900">What it does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2 text-gray-800">
                    <em>Schedule appointment with Client X next Monday at 2pm</em>
                  </td>
                  <td className="px-3 py-2 text-gray-600">Creates an entry in Calendar (Appointments).</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-800">
                    <em>Add project Kitchen renovation with budget 5000</em>
                  </td>
                  <td className="px-3 py-2 text-gray-600">Creates a project with that contract budget.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-gray-800">
                    <em>Show invoices from Castorama this month</em>
                  </td>
                  <td className="px-3 py-2 text-gray-600">Opens Invoices with vendor + period filters.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            More phrases (payments, margins, reminders) are supported — ask in plain language and the assistant will
            answer or route you to the right screen.
          </p>
        </div>
      ),
    },
    {
      id: "exports",
      title: "Exports & tax-ready PDF",
      icon: FileDown,
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Go to <strong>Invoices</strong> and use <strong>Generate PDF for accountant</strong>: you get a summary
              table (dates, vendors, amounts) plus <strong>full-page photo annexes</strong> for each receipt.
            </li>
            <li>
              Use <strong>Export CSV</strong> if your accountant prefers spreadsheet import.
            </li>
            <li>
              Upload your <strong>logo</strong> in Settings so it appears on the PDF header where configured.
            </li>
            <li>
              Keep <strong>invoice photos</strong> attached in the app — they are the source for annex pages.
            </li>
          </ol>
        </div>
      ),
    },
  ],
  fr: [
    {
      id: "start",
      title: "Premiers pas",
      icon: BookOpen,
      body: (
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            Complétez votre <strong>profil entreprise</strong> dans Paramètres : nom, logo, devise et TVA par défaut.
          </li>
          <li>
            Ajoutez des <strong>clients</strong> et des <strong>projets</strong> pour lier dépenses et factures aux chantiers.
          </li>
          <li>
            Utilisez le <strong>tableau de bord</strong> pour suivre CA et charges.
          </li>
        </ul>
      ),
    },
    {
      id: "scan",
      title: "Scan intelligent (factures)",
      icon: ScanLine,
      body: (
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>Photographiez les tickets dans une bonne lumière, sans reflet excessif.</li>
          <li>Le traitement renforce le contraste avant OCR (type application scanner).</li>
          <li>
            Vérifiez toujours <strong>fournisseur</strong>, <strong>date</strong> et <strong>montant TTC</strong> dans le
            formulaire ; les champs peu fiables sont surlignés en ambre.
          </li>
          <li>Vos corrections aident l’app à mémoriser des correspondances fournisseurs localement.</li>
        </ul>
      ),
    },
    {
      id: "projects",
      title: "Projets & budget",
      icon: FolderKanban,
      body: (
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>Chaque projet suit montant du contrat, encaissements et coûts matériaux.</li>
          <li>Comparez les dépenses au budget pour rester sur votre marge.</li>
          <li>Utilisez le calendrier pour les visites et rendez-vous clients.</li>
        </ul>
      ),
    },
    {
      id: "ai",
      title: "Barre de commande IA",
      icon: Sparkles,
      body: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Ouvrez la <strong>barre de commande</strong> (bouton étincelles) ou <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">⌘</kbd> + <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">K</kbd> / <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Ctrl</kbd> + <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">K</kbd>.
          </p>
          <p className="font-medium text-gray-900">Exemples :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <em>Prends rendez-vous avec Client X lundi prochain à 14h</em> — crée un rendez-vous.
            </li>
            <li>
              <em>Ajoute le projet Rénovation cuisine avec un budget de 5000€</em> — crée un projet avec ce budget.
            </li>
            <li>
              <em>Montre-moi les factures de Castorama de ce mois</em> — ouvre Factures avec filtres.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "exports",
      title: "Exports & PDF comptable",
      icon: FileDown,
      body: (
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            Dans <strong>Factures</strong>, générez un PDF récapitulatif avec annexes photos des justificatifs.
          </li>
          <li>L’export CSV convient à Excel ; le PDF est pensé pour votre comptable.</li>
          <li>Paramétrez votre logo dans les réglages pour l’en-tête du PDF.</li>
        </ul>
      ),
    },
  ],
};

export default function HelpPage() {
  const { language } = useLanguage();
  const lang = language === "fr" ? "fr" : "en";
  const list = sections[lang];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {lang === "en" ? "Help & Support — Full guide" : "Aide & Support — Guide complet"}
        </h1>
        <p className="mt-1 text-gray-500">
          {lang === "en"
            ? "Everything you need to run ArtisanFlow efficiently."
            : "Tout ce qu’il faut pour utiliser ArtisanFlow efficacement."}
        </p>
      </div>

      <Tabs defaultValue={list[0].id} className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-gray-100 p-1">
          {list.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="gap-1.5 text-xs sm:text-sm">
              <s.icon className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-none">{s.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {list.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <s.icon className="h-5 w-5 text-brand-blue-500" />
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>{s.body}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="border-brand-blue-100 bg-brand-blue-50/40">
        <CardContent className="pt-6 text-sm text-gray-700">
          <p>
            <strong>{lang === "en" ? "Contact" : "Contact"} :</strong> support@artisanflow.fr ·{" "}
            {lang === "en" ? "We reply as soon as possible." : "Réponse sous les meilleurs délais."}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
