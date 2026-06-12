import { SupabaseClient } from "@supabase/supabase-js";

export type SyncFrequency = "daily" | "weekly" | "custom";

export type ShopifySyncSchedule = {
  time: string;
  frequency: SyncFrequency;
  days: string[];
  timezone: string;
  enabled: boolean;
  last_run_key: string | null;
  last_run_at: string | null;
};

export type ScheduleCheck = {
  due: boolean;
  runKey: string;
  localDate: string;
  localTime: string;
  localDay: string;
  reason?: string;
};

const SCHEDULE_NAME = "shopify-inventory";
const DAY_CODES = ["S", "M", "T", "W", "T2", "F", "S2"];
const DEFAULT_TIMEZONE = "America/New_York";
const SCHEDULE_GRACE_MINUTES = 60;

export const defaultShopifySyncSchedule: ShopifySyncSchedule = {
  time: "08:00",
  frequency: "weekly",
  days: ["F"],
  timezone: DEFAULT_TIMEZONE,
  enabled: true,
  last_run_key: null,
  last_run_at: null,
};

function normalizeTime(value: unknown) {
  const text = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(text) ? text : defaultShopifySyncSchedule.time;
}

function normalizeFrequency(value: unknown): SyncFrequency {
  return value === "daily" || value === "weekly" || value === "custom"
    ? value
    : defaultShopifySyncSchedule.frequency;
}

function normalizeDays(value: unknown, frequency: SyncFrequency) {
  if (frequency === "daily") {
    return DAY_CODES;
  }

  const values = Array.isArray(value) ? value : [];
  const days = values
    .map((item) => String(item))
    .filter((item) => DAY_CODES.includes(item));

  return days.length ? Array.from(new Set(days)) : defaultShopifySyncSchedule.days;
}

export function normalizeShopifySyncSchedule(
  value: Partial<ShopifySyncSchedule> | null | undefined
): ShopifySyncSchedule {
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

function getLocalParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dayCode = DAY_CODES[weekdayIndex[part("weekday")] ?? 0];
  const localDate = `${part("year")}-${part("month")}-${part("day")}`;
  const localTime = `${part("hour")}:${part("minute")}`;

  return {
    localDate,
    localTime,
    localDay: dayCode,
    runKey: `${localDate}T${localTime}`,
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function checkShopifySyncSchedule(
  schedule: ShopifySyncSchedule,
  now = new Date()
): ScheduleCheck {
  const parts = getLocalParts(now, schedule.timezone);
  const runKey = `${parts.localDate}T${schedule.time}`;

  const currentMinutes = timeToMinutes(parts.localTime);
  const scheduleMinutes = timeToMinutes(schedule.time);

  const minutesAfterScheduled =
    currentMinutes === null || scheduleMinutes === null
      ? null
      : currentMinutes - scheduleMinutes;

  const isWithinScheduleWindow =
    minutesAfterScheduled !== null &&
    minutesAfterScheduled >= 0 &&
    minutesAfterScheduled < SCHEDULE_GRACE_MINUTES;

  if (!schedule.enabled) {
    return { ...parts, runKey, due: false, reason: "Schedule is disabled." };
  }

  if (!schedule.days.includes(parts.localDay)) {
    return { ...parts, runKey, due: false, reason: "Today is not selected." };
  }

  if (schedule.last_run_key === runKey) {
    return {
      ...parts,
      runKey,
      due: false,
      reason: "Schedule already ran for this time.",
    };
  }

  if (!isWithinScheduleWindow) {
    return {
      ...parts,
      runKey,
      due: false,
      reason: "Current time is outside the schedule window.",
    };
  }

  return { ...parts, runKey, due: true };
}

export async function fetchShopifySyncSchedule(supabaseAdmin: SupabaseClient) {
  const { data, error } = await supabaseAdmin
    .from("app_sync_schedules")
    .select("schedule")
    .eq("name", SCHEDULE_NAME)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase schedule fetch failed: ${error.message}`);
  }

  return normalizeShopifySyncSchedule(
    (data?.schedule as Partial<ShopifySyncSchedule> | null) ??
      defaultShopifySyncSchedule
  );
}

export async function saveShopifySyncSchedule(
  supabaseAdmin: SupabaseClient,
  schedule: Partial<ShopifySyncSchedule>
) {
  const normalized = normalizeShopifySyncSchedule(schedule);

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

export async function markShopifySyncScheduleRun(
  supabaseAdmin: SupabaseClient,
  schedule: ShopifySyncSchedule,
  runKey: string
) {
  const updated = normalizeShopifySyncSchedule({
    ...schedule,
    last_run_key: runKey,
    last_run_at: new Date().toISOString(),
  });

  const { error } = await supabaseAdmin.from("app_sync_schedules").upsert(
    {
      name: SCHEDULE_NAME,
      schedule: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" }
  );

  if (error) {
    throw new Error(`Supabase schedule run update failed: ${error.message}`);
  }

  return updated;
}