"use client";

import { LayoutDashboard, FolderKanban, Banknote, UsersRound, Package, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type HelpSection = { id: string; title: string; icon: LucideIcon; body: ReactNode };

export const HELP_SECTIONS_EN: HelpSection[] = [
  {
    id: "dashboard",
    title: "Dashboard & KPIs",
    icon: LayoutDashboard,
    body: (
      <div className="space-y-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900">How to read card colors:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Blue</strong>: revenue (monthly and yearly sales).
          </li>
          <li>
            <strong>Green</strong>: margin / net profit.
          </li>
          <li>
            <strong>Red</strong>: unpaid balances (amount still due per project).
          </li>
          <li>Click any card to open detailed breakdowns directly on the dashboard.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "projects",
    title: "Projects & progress",
    icon: FolderKanban,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>Set <strong>start</strong> and <strong>end</strong> dates for each project to track delivery planning.</li>
          <li>Financial progress follows contract budget, payments collected, and real expenses.</li>
          <li>The financial health bar compares <strong>Budget vs Spending</strong> and warns above 80%.</li>
          <li>Project pages also show linked team members and project-related costs.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "revenues",
    title: "Revenues & unpaid",
    icon: Banknote,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>Every revenue entry automatically reduces the unpaid balance of its linked project.</li>
          <li>Dashboard KPIs (monthly/yearly revenue, margin, unpaid) refresh immediately.</li>
          <li>PDF exports remain bilingual (French/English) for accounting workflows.</li>
          <li>Key amounts can be updated inline on supported screens.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "team-payroll",
    title: "Team & payroll",
    icon: UsersRound,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>Configure salary type (daily/monthly) and salary amount for each team member.</li>
          <li>Log each payment with date, amount, and optional linked project.</li>
          <li>Payment history supports inline editing for fast corrections.</li>
          <li>Payroll payments are included in total expenses and net margin.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "rentals",
    title: "Rentals",
    icon: Package,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>Each rental computes duration (start/end) and total cost automatically.</li>
          <li>
            Visual status: <strong>On site</strong> (green) or <strong>To return</strong> (red).
          </li>
          <li>Dashboard warns you when a rental is ending within the next 24 hours.</li>
          <li>Rental costs are added to expenses and impact profit margin.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "ux",
    title: "UX gestures",
    icon: Smartphone,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>Swipe left on mobile lists to reveal <strong>Edit</strong> and <strong>Delete</strong>.</li>
          <li>This gesture is consistent across core lists (clients, team, revenues, materials, rentals).</li>
          <li>Inline amount edits propagate instantly to global financial totals.</li>
          <li>Opening Help closes the mobile sidebar for better readability.</li>
        </ul>
      </div>
    ),
  },
];
