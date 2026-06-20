import { SupabaseClient } from "@supabase/supabase-js";

export type SyncFrequency = "daily" | "weekly" | "custom";

export type ShipheroOnholdSchedule = {
  time: string;
  frequency: SyncFrequency;
  days: string[];
  timezone: string;
  enabled: boolean;
  last_run_key: string | null;
  last_run_at: string | null;
};

const SCHEDULE_NAME = "shiphero-onhold";
const DAY_CODES = ["S", "M", "T", "W", "T2", "F", "S2"];
const DEFAULT_TIMEZONE = "America/New_York";

export const defaultShipheroOnholdSchedule: ShipheroOnholdSchedule = {
  time: "08:00",
  frequency: "daily",
  days: DAY_CODES,
  timezone: DEFAULT_TIMEZONE,
  enabled: true,
  last_run_key: null,
  last_run_at: null,
};

function normalizeTime(value: unknown) {
  const text = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(text) ? text : defaultShipheroOnholdSchedule.time;
}

function normalizeFrequency(value: unknown): SyncFrequency {
  return value === "daily" || value === "weekly" || value === "custom"
    ? value
    : defaultShipheroOnholdSchedule.frequency;
}

function normalizeDays(value: unknown, frequency: SyncFrequency) {
  if (frequency === "daily") {
    return DAY_CODES;
  }

  const values = Array.isArray(value) ? value : [];
  const days = values
    .map((item) => String(item))
    .filter((item) => DAY_CODES.includes(item));

  return days.length
    ? Array.from(new Set(days))
    : defaultShipheroOnholdSchedule.days;
}

export function normalizeShipheroOnholdSchedule(
  value: Partial<ShipheroOnholdSchedule> | null | undefined
): ShipheroOnholdSchedule {
  const frequency = normalizeFrequency(value?.frequency);

  return {
    time: normalizeTime(value?.time),
    frequency,
    days: normalizeDays(value?.days, frequency),
    timezone: String(value?.timezone || DEFAULT_TIMEZONE),
    enabled: value?.enabled ?? true,
    last_run_key: value?.last_run_key ?? null,
    last_run_at: value?.last_run_at ?? null,
  };
}

export async function fetchShipheroOnholdSchedule(
  supabaseAdmin: SupabaseClient
) {
  const { data, error } = await supabaseAdmin
    .from("app_sync_schedules")
    .select("schedule")
    .eq("name", SCHEDULE_NAME)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase schedule fetch failed: ${error.message}`);
  }

  return normalizeShipheroOnholdSchedule(
    (data?.schedule as Partial<ShipheroOnholdSchedule> | null) ??
      defaultShipheroOnholdSchedule
  );
}

export async function saveShipheroOnholdSchedule(
  supabaseAdmin: SupabaseClient,
  schedule: Partial<ShipheroOnholdSchedule>
) {
  const normalized = normalizeShipheroOnholdSchedule(schedule);
  const { error } = await supabaseAdmin.from("app_sync_schedules").upsert(
    {
      name: SCHEDULE_NAME,
      schedule: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" }
  );

  if (error) {
    throw new Error(`Supabase schedule save failed: ${error.message}`);
  }

  return normalized;
}
