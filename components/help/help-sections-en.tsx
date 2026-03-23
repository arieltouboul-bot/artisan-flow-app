"use client";

import { LayoutDashboard, FolderKanban, Banknote, UsersRound, Package, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { HELP_CONTENT } from "./help-content";

export type HelpSection = { id: string; title: string; icon: LucideIcon; body: ReactNode };
const content = HELP_CONTENT.en;

const bullets = (items: string[]) => (
  <ul className="list-disc space-y-2 pl-5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export const HELP_SECTIONS_EN: HelpSection[] = [
  {
    id: "dashboard",
    title: content.dashboardTitle,
    icon: LayoutDashboard,
    body: (
      <div className="space-y-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900">{content.dashboardIntro}</p>
        {bullets(content.dashboardBullets)}
      </div>
    ),
  },
  {
    id: "projects",
    title: content.projectsTitle,
    icon: FolderKanban,
    body: <div className="space-y-3 text-sm text-gray-700">{bullets(content.projectsBullets)}</div>,
  },
  {
    id: "revenues",
    title: content.revenuesTitle,
    icon: Banknote,
    body: <div className="space-y-3 text-sm text-gray-700">{bullets(content.revenuesBullets)}</div>,
  },
  {
    id: "team-payroll",
    title: content.teamTitle,
    icon: UsersRound,
    body: <div className="space-y-3 text-sm text-gray-700">{bullets(content.teamBullets)}</div>,
  },
  {
    id: "rentals",
    title: content.rentalsTitle,
    icon: Package,
    body: <div className="space-y-3 text-sm text-gray-700">{bullets(content.rentalsBullets)}</div>,
  },
  {
    id: "ux",
    title: content.uxTitle,
    icon: Smartphone,
    body: <div className="space-y-3 text-sm text-gray-700">{bullets(content.uxBullets)}</div>,
  },
];
