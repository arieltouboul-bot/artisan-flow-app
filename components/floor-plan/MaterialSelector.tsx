"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import type { MaterialRow } from "@/lib/floor-plan/types";
import { useMaterialsLibrary } from "@/hooks/use-materials-library";
import { Loader2 } from "lucide-react";

export type MaterialSelectorProps = {
  /** Identifiant `materials_library.id` sélectionné */
  value: string | null;
  onValueChange: (materialId: string | null) => void;
  /**
   * Si fourni (y compris tableau vide), utilise cette liste.
   * Si omis, charge les matériaux via Supabase dans le composant.
   */
  materials?: MaterialRow[];
  disabled?: boolean;
  className?: string;
  /** À associer au `htmlFor` du `<label>` parent */
  id?: string;
};

function formatOptionLabel(m: MaterialRow): string {
  const cat = m.category?.trim();
  return cat ? `${m.name} — ${cat}` : m.name;
}

export function MaterialSelector({
  value,
  onValueChange,
  materials: materialsProp,
  disabled,
  className,
  id = "material-selector",
}: MaterialSelectorProps) {
  const { language } = useLanguage();
  const internal = useMaterialsLibrary(materialsProp === undefined);
  const materials = materialsProp ?? internal.materials;
  const loading = materialsProp === undefined && internal.loading;
  const err = materialsProp === undefined ? internal.error : null;

  const options = useMemo(() => materials.map((m) => ({ m, label: formatOptionLabel(m) })), [materials]);

  return (
    <div className={cn("space-y-1", className)}>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
          {t("materialSelectorLoading", language)}
        </div>
      )}
      {err && <p className="text-xs text-red-600">{err}</p>}
      <select
        id={id}
        disabled={disabled || loading}
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={value ?? ""}
        onChange={(e) => onValueChange(e.target.value || null)}
      >
        {options.length === 0 && !loading ? (
          <option value="">{t("materialSelectorEmpty", language)}</option>
        ) : (
          <>
            <option value="">{t("materialSelectorPlaceholder", language)}</option>
            {options.map(({ m }) => (
              <option key={m.id} value={m.id}>
                {formatOptionLabel(m)}
                {m.unit ? ` (${m.unit})` : ""}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}
