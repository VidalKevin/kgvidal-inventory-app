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

export type ScheduleCheck = {
  due: boolean;
  runKey: string;
  localDate: string;
  localTime: string;
  localDay: string;
  reason?: string;
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

export function checkShipheroOnholdSchedule(
  schedule: ShipheroOnholdSchedule,
  now = new Date()
): ScheduleCheck {
  const parts = getLocalParts(now, schedule.timezone);
  const runKey = `${parts.localDate}T${schedule.time}`;
  const currentMinutes = timeToMinutes(parts.localTime);
  const scheduleMinutes = timeToMinutes(schedule.time);
  const hasReachedScheduledTime =
    currentMinutes !== null &&
    scheduleMinutes !== null &&
    currentMinutes >= scheduleMinutes;

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

  if (!hasReachedScheduledTime) {
    return {
      ...parts,
      runKey,
      due: false,
      reason: "Current time is before the scheduled time.",
    };
  }

  return { ...parts, runKey, due: true };
}

export async function markShipheroOnholdScheduleRun(
  supabaseAdmin: SupabaseClient,
  schedule: ShipheroOnholdSchedule,
  runKey: string
) {
  const updated = normalizeShipheroOnholdSchedule({
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
