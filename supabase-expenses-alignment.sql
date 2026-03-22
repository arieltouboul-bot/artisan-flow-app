-- ArtisanFlow: expenses schema alignment (safe, idempotent)
-- Run this script once in Supabase SQL editor.

begin;

alter table if exists public.expenses
  add column if not exists vendor text,
  add column if not exists amount_ttc numeric(12,2),
  add column if not exists tva_amount numeric(12,2),
  add column if not exists invoice_date date,
  add column if not exists image_url text,
  add column if not exists confidence_score numeric(4,3),
  add column if not exists project_id uuid null;

-- Backfill vendor/invoice_date from legacy fields used by app.
update public.expenses
set
  vendor = coalesce(nullif(vendor, ''), nullif(split_part(description, ' — ', 1), ''), description),
  invoice_date = coalesce(invoice_date, date)
where true;

-- Keep compatibility with old rows that only have HT + TVA rate.
update public.expenses
set amount_ttc = round((amount_ht * (1 + coalesce(tva_rate, 20) / 100.0))::numeric, 2)
where amount_ttc is null and amount_ht is not null;

update public.expenses
set tva_amount = round((amount_ttc - amount_ht)::numeric, 2)
where tva_amount is null and amount_ttc is not null and amount_ht is not null;

-- Optional constraints (kept permissive for legacy data).
alter table if exists public.expenses
  alter column user_id set not null;

-- Helpful indexes.
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_invoice_date on public.expenses(invoice_date desc);
create index if not exists idx_expenses_project_id on public.expenses(project_id);

commit;

