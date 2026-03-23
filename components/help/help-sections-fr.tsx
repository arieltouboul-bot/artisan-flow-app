"use client";

import { LayoutDashboard, FolderKanban, Banknote, UsersRound, Package, Smartphone } from "lucide-react";
import type { HelpSection } from "./help-sections-en";

export const HELP_SECTIONS_FR: HelpSection[] = [
  {
    id: "dashboard",
    title: "Dashboard & indicateurs",
    icon: LayoutDashboard,
    body: (
      <div className="space-y-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900">Lecture des cartes de couleur :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Bleu</strong> : chiffre d’affaires (CA du mois et CA annuel).
          </li>
          <li>
            <strong>Vert</strong> : marge / bénéfice net.
          </li>
          <li>
            <strong>Rouge</strong> : impayés (reste à encaisser par projet).
          </li>
          <li>
            Cliquez sur une carte pour ouvrir le détail sans quitter la page.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "projects",
    title: "Projets & progression",
    icon: FolderKanban,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Définissez les dates de <strong>début</strong> et de <strong>fin prévue</strong> pour piloter le chantier.
          </li>
          <li>
            La progression financière suit le budget, les paiements reçus et les dépenses réelles.
          </li>
          <li>
            La barre de santé financière compare <strong>Budget vs Dépenses</strong> avec alerte au-delà de 80%.
          </li>
          <li>
            Dans l’onglet Projet, vous voyez aussi l’équipe assignée et les coûts liés.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "revenues",
    title: "Revenus & impayés",
    icon: Banknote,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Chaque revenu enregistré met à jour automatiquement les impayés du projet.
          </li>
          <li>
            Les cartes Dashboard (CA mensuel/annuel, marge, impayés) se recalculent sans rafraîchir.
          </li>
          <li>
            L’export PDF reste bilingue FR/EN avec synthèse comptable.
          </li>
          <li>
            Les montants clés sont modifiables en direct (live edit) selon les écrans.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "team-payroll",
    title: "Team & Payroll",
    icon: UsersRound,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>Configurez le type de salaire (journalier/mensuel) et le montant.</li>
          <li>Enregistrez chaque paiement avec date, montant et projet lié (optionnel).</li>
          <li>L’historique des paiements reste modifiable en live edit.</li>
          <li>Les salaires payés alimentent les dépenses globales et la marge nette.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "rentals",
    title: "Locations",
    icon: Package,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Chaque location calcule sa durée (début/fin) et son coût total automatiquement.
          </li>
          <li>
            Statut visuel : <strong>Sur chantier</strong> (vert) ou <strong>À rendre</strong> (rouge).
          </li>
          <li>
            Le Dashboard affiche une alerte si une location se termine sous 24h.
          </li>
          <li>
            Les coûts de location sont ajoutés aux dépenses et impactent la marge.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "ux",
    title: "Gestes UX",
    icon: Smartphone,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Sur mobile, glissez vers la gauche pour afficher <strong>Modifier</strong> et <strong>Supprimer</strong>.
          </li>
          <li>
            Ce geste est uniformisé sur les listes principales (clients, team, revenus, matériel, locations).
          </li>
          <li>
            Les montants éditables se mettent à jour instantanément dans toute l’application.
          </li>
          <li>Le menu Aide ferme la sidebar mobile pour améliorer la lecture.</li>
        </ul>
      </div>
    ),
  },
];
