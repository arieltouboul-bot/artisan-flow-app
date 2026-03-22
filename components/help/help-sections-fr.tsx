"use client";

import { BookOpen, ScanLine, FolderKanban, Sparkles, FileDown, Calendar, Package, Smartphone } from "lucide-react";
import type { HelpSection } from "./help-sections-en";

export const HELP_SECTIONS_FR: HelpSection[] = [
  {
    id: "start",
    title: "Premiers pas",
    icon: BookOpen,
    body: (
      <div className="space-y-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900">Configurez votre espace en quelques étapes :</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Ouvrez <strong>Paramètres</strong> : <strong>nom d’entreprise</strong>, <strong>logo</strong>,{" "}
            <strong>devise</strong> et <strong>TVA</strong> — utilisés pour devis, factures et PDF.
          </li>
          <li>
            Créez des <strong>clients</strong> puis des <strong>projets</strong> (chantiers) rattachés à ces clients.
          </li>
          <li>
            Le <strong>tableau de bord</strong> résume CA, charges et éléments en retard.
          </li>
          <li>
            Gérez votre <strong>équipe</strong> dans Employés si plusieurs sites ou corps de métier.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "scan",
    title: "Scan intelligent (factures)",
    icon: ScanLine,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>Pour un OCR fiable :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Photo en <strong>lumière uniforme</strong>, sans reflets sur ticket thermique.
          </li>
          <li>
            Ticket <strong>à plat</strong>, cadrage plein cadre ; reprenez la photo si floue.
          </li>
          <li>
            <strong>Renforcement du contraste</strong> avant OCR (type scanner).
          </li>
          <li>
            Vérifiez toujours <strong>fournisseur</strong>, <strong>date</strong> et <strong>montant TTC</strong> ; les
            champs peu fiables sont <span className="font-medium text-amber-700">surlignés</span>.
          </li>
          <li>
            Les corrections peuvent être <strong>mémorisées localement</strong> pour le prochain scan.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "projects",
    title: "Projets & suivi",
    icon: FolderKanban,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Chaque <strong>projet</strong> suit contrat, encaissements et coûts matériaux — la marge est visible tout de
            suite.
          </li>
          <li>
            Liez <strong>dépenses et photos de factures</strong> au projet à l’import pour un P&amp;L réaliste.
          </li>
          <li>
            Le <strong>calendrier</strong> évite les chevauchements entre visites et rendez-vous.
          </li>
          <li>
            Sur mobile, <strong>glissez vers la gauche</strong> sur une ligne pour modifier ou supprimer rapidement.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "ai",
    title: "Commandes IA",
    icon: Sparkles,
    body: (
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          Ouvrez le <strong>centre de commande IA</strong> (bouton étincelles en bas à droite) ou{" "}
          <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd> +{" "}
          <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs">K</kbd>. Français ou anglais.
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 font-semibold text-gray-900">Exemple</th>
                <th className="px-3 py-2 font-semibold text-gray-900">Effet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Prends rendez-vous avec Client X lundi prochain à 14h</em>
                </td>
                <td className="px-3 py-2 text-gray-600">
                  Crée le RDV ; en cas de conflit, propose un autre créneau.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Chaque lundi à 8h, rappelle-moi de vérifier le stock</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Série de rappels récurrents sur le calendrier.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Ajoute le projet Rénovation cuisine avec budget 5000</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Crée le projet avec ce budget.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Montre les factures Castorama ce mois-ci</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Ouvre Factures avec filtres.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Combien j’ai dépensé ce mois-ci ?</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Total TTC des dépenses enregistrées.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          Si la demande est ambiguë, l’assistant <strong>pose une question de précision</strong> plutôt que de rester
          silencieux.
        </p>
      </div>
    ),
  },
  {
    id: "exports",
    title: "Exports & PDF",
    icon: FileDown,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Dans <strong>Factures</strong>, générez un <strong>PDF comptable</strong> avec annexes photos des
            justificatifs.
          </li>
          <li>
            L’<strong>export CSV</strong> convient à Excel ou à votre logiciel comptable.
          </li>
          <li>
            Paramétrez le <strong>logo</strong> dans les réglages pour l’en-tête des PDF.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "calendar",
    title: "Calendrier & RDV",
    icon: Calendar,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          Gérez devis, visites et réunions. Vues mois / semaine / jour. Modification et <strong>suppression</strong> avec
          confirmation — la grille se met à jour sans recharger la page.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Si le client correspond à un chantier existant, le RDV peut être <strong>lié au projet</strong>{" "}
            automatiquement.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "materials",
    title: "Matériel & stock",
    icon: Package,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          Suivi des stocks et commandes fournisseurs. Scan des tickets pour saisir les lignes et mettre à jour les
          quantités.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            L’IA peut <strong>retirer du stock</strong> ou créer des <strong>alertes de stock bas</strong>.
          </li>
          <li>
            Glissement vers la gauche sur mobile : <strong>Modifier</strong> / <strong>Supprimer</strong>.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "mobile",
    title: "Gestes mobiles",
    icon: Smartphone,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          <strong>Glissez vers la gauche</strong> sur les listes (Factures, Projets, Matériel) pour les actions
          rapides. Sur les vignettes de factures, <strong>appui</strong> pour agrandir avec transition fluide.
        </p>
        <p>
          L’entrée dans <strong>Aide &amp; support</strong> referme le menu latéral sur mobile pour une lecture confortable.
        </p>
      </div>
    ),
  },
];
