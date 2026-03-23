"use client";

export type HelpLocale = "fr" | "en";

export type HelpContentDictionary = {
  dashboardTitle: string;
  dashboardIntro: string;
  dashboardBullets: string[];
  projectsTitle: string;
  projectsBullets: string[];
  revenuesTitle: string;
  revenuesBullets: string[];
  teamTitle: string;
  teamBullets: string[];
  rentalsTitle: string;
  rentalsBullets: string[];
  uxTitle: string;
  uxBullets: string[];
};

export const HELP_CONTENT: Record<HelpLocale, HelpContentDictionary> = {
  fr: {
    dashboardTitle: "Dashboard & indicateurs",
    dashboardIntro: "Lecture des cartes de couleur :",
    dashboardBullets: [
      "Bleu : chiffre d’affaires (CA du mois et CA annuel).",
      "Vert : marge / bénéfice net.",
      "Rouge : impayés (reste à encaisser par projet).",
      "Cliquez sur une carte pour ouvrir le détail sans quitter la page.",
    ],
    projectsTitle: "Projets & progression",
    projectsBullets: [
      "Définissez les dates de début et de fin prévue pour piloter le chantier.",
      "La progression financière suit le budget, les paiements reçus et les dépenses réelles.",
      "La barre de santé financière compare Budget vs Dépenses avec alerte au-delà de 80%.",
      "Dans l’onglet Projet, vous voyez aussi l’équipe assignée et les coûts liés.",
    ],
    revenuesTitle: "Revenus & impayés",
    revenuesBullets: [
      "Chaque revenu enregistré met à jour automatiquement les impayés du projet.",
      "Les cartes Dashboard (CA mensuel/annuel, marge, impayés) se recalculent sans rafraîchir.",
      "L’export PDF reste bilingue FR/EN avec synthèse comptable.",
      "Les montants clés sont modifiables en direct (live edit) selon les écrans.",
    ],
    teamTitle: "Team & Payroll",
    teamBullets: [
      "Configurez le type de salaire (journalier/mensuel) et le montant.",
      "Enregistrez chaque paiement avec date, montant et projet lié (optionnel).",
      "L’historique des paiements reste modifiable en live edit.",
      "Les salaires payés alimentent les dépenses globales et la marge nette.",
    ],
    rentalsTitle: "Locations",
    rentalsBullets: [
      "Chaque location calcule sa durée (début/fin) et son coût total automatiquement.",
      "Statut visuel : Sur chantier (vert) ou À rendre (rouge).",
      "Le Dashboard affiche une alerte si une location se termine sous 24h.",
      "Les coûts de location sont ajoutés aux dépenses et impactent la marge.",
    ],
    uxTitle: "Gestes UX",
    uxBullets: [
      "Sur mobile, glissez vers la gauche pour afficher Modifier et Supprimer.",
      "Ce geste est uniformisé sur les listes principales (clients, team, revenus, matériel, locations).",
      "Les montants éditables se mettent à jour instantanément dans toute l’application.",
      "Le menu Aide ferme la sidebar mobile pour améliorer la lecture.",
    ],
  },
  en: {
    dashboardTitle: "Dashboard & KPIs",
    dashboardIntro: "How to read card colors:",
    dashboardBullets: [
      "Blue: revenue (monthly and yearly sales).",
      "Green: margin / net profit.",
      "Red: unpaid balances (amount still due per project).",
      "Click any card to open detailed breakdowns directly on the dashboard.",
    ],
    projectsTitle: "Projects & progress",
    projectsBullets: [
      "Set start and end dates for each project to track delivery planning.",
      "Financial progress follows contract budget, payments collected, and real expenses.",
      "The financial health bar compares Budget vs Spending and warns above 80%.",
      "Project pages also show linked team members and project-related costs.",
    ],
    revenuesTitle: "Revenues & unpaid",
    revenuesBullets: [
      "Every revenue entry automatically reduces the unpaid balance of its linked project.",
      "Dashboard KPIs (monthly/yearly revenue, margin, unpaid) refresh immediately.",
      "PDF exports remain bilingual (French/English) for accounting workflows.",
      "Key amounts can be updated inline on supported screens.",
    ],
    teamTitle: "Team & payroll",
    teamBullets: [
      "Configure salary type (daily/monthly) and salary amount for each team member.",
      "Log each payment with date, amount, and optional linked project.",
      "Payment history supports inline editing for fast corrections.",
      "Payroll payments are included in total expenses and net margin.",
    ],
    rentalsTitle: "Rentals",
    rentalsBullets: [
      "Each rental computes duration (start/end) and total cost automatically.",
      "Visual status: On site (green) or To return (red).",
      "Dashboard warns you when a rental is ending within the next 24 hours.",
      "Rental costs are added to expenses and impact profit margin.",
    ],
    uxTitle: "UX gestures",
    uxBullets: [
      "Swipe left on mobile lists to reveal Edit and Delete.",
      "This gesture is consistent across core lists (clients, team, revenues, materials, rentals).",
      "Inline amount edits propagate instantly to global financial totals.",
      "Opening Help closes the mobile sidebar for better readability.",
    ],
  },
};
