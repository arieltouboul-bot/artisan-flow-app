"use client";

import { useMemo } from "react";
import { mockInvoices } from "@/lib/mock-data";

export function useInvoices() {
  const overdue = useMemo(
    () => mockInvoices.filter((i) => i.status === "en_retard"),
    []
  );
  const totalOverdue = useMemo(
    () => overdue.reduce((s, i) => s + i.amount, 0),
    [overdue]
  );
  return { invoices: mockInvoices, overdue, totalOverdue };
}
