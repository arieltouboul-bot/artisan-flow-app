export const MASTER_CODE = "PRO-BUILD-2026";
export const TRIAL_DAYS = 7;

export function isValidDateString(value: string | null | undefined): value is string {
  if (!value) return false;
  const dt = new Date(value);
  return !Number.isNaN(dt.getTime());
}

export function trialDaysRemaining(trialStartedAt: string | null | undefined, now = new Date()): number {
  if (!isValidDateString(trialStartedAt)) return 0;
  const start = new Date(trialStartedAt);
  const elapsedMs = now.getTime() - start.getTime();
  if (elapsedMs < 0) return TRIAL_DAYS;
  const elapsedDays = Math.floor(elapsedMs / 86_400_000);
  const remaining = TRIAL_DAYS - elapsedDays;
  return remaining > 0 ? remaining : 0;
}

export function hasAppAccess(input: {
  isActive: boolean | null | undefined;
  trialStartedAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (Boolean(input.isActive)) return true;
  return trialDaysRemaining(input.trialStartedAt, input.now) > 0;
}
