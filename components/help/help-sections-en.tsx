"use client";

import { BookOpen, ScanLine, FolderKanban, Sparkles, FileDown, Calendar, Package, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type HelpSection = { id: string; title: string; icon: LucideIcon; body: ReactNode };

export const HELP_SECTIONS_EN: HelpSection[] = [
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
            <span className="font-medium text-amber-700">highlighted</span>.
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
            Attach <strong>expenses and invoice photos</strong> to a project when you select it during import; this keeps
            job P&amp;L realistic.
          </li>
          <li>
            Use <strong>Calendar</strong> for appointments (quotes, site visits) so nothing conflicts with your schedule.
          </li>
          <li>
            On mobile, <strong>swipe left</strong> on a project row to edit or delete quickly without opening the ⋮ menu.
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
          <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs">K</kbd>. Natural language in English
          or French.
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 font-semibold text-gray-900">Example</th>
                <th className="px-3 py-2 font-semibold text-gray-900">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Schedule appointment with Client X next Monday at 2pm</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Calendar entry; detects conflicts and suggests another slot.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Every Monday at 8am, remind me to check the inventory</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Creates a short series of recurring reminders on the calendar.</td>
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
                <td className="px-3 py-2 text-gray-600">Opens Invoices with filters.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>Update budget of Project X to 10k</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Updates contract amount.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-800">
                  <em>What is my total spending this month?</em>
                </td>
                <td className="px-3 py-2 text-gray-600">Sums expenses (incl. VAT) for the current month.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          If something is unclear, the assistant will <strong>ask you to clarify</strong> instead of staying silent.
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
            Go to <strong>Invoices</strong> and use <strong>Generate PDF for accountant</strong>: summary table plus{" "}
            <strong>full-page photo annexes</strong>.
          </li>
          <li>
            Use <strong>Export CSV</strong> if your accountant prefers spreadsheets.
          </li>
          <li>
            Upload your <strong>logo</strong> in Settings for PDF headers.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "calendar",
    title: "Calendar & appointments",
    icon: Calendar,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          Use <strong>Calendar</strong> for quotes, site visits, and meetings. Month / week / day views. Tap an event to
          edit; <strong>Delete</strong> confirms before removal — the grid updates instantly.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Appointments can be linked to a <strong>project</strong> automatically when the client matches an existing
            job.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "materials",
    title: "Materials & stock",
    icon: Package,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          <strong>Materials</strong> tracks inventory and supplier orders. Scan receipts to add lines; quantities update
          stock.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            AI can <strong>remove stock</strong> or set <strong>low-stock reminders</strong>.
          </li>
          <li>
            Swipe left on mobile for <strong>Edit</strong> / <strong>Delete</strong>.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "mobile",
    title: "Mobile gestures",
    icon: Smartphone,
    body: (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          <strong>Swipe left</strong> on list rows (Invoices, Projects, Materials) for quick actions. Invoice thumbnails
          support <strong>tap-to-expand</strong> with a smooth shared transition.
        </p>
        <p>
          Opening <strong>Help &amp; Support</strong> closes the mobile sidebar so the guide uses the full width.
        </p>
      </div>
    ),
  },
];
