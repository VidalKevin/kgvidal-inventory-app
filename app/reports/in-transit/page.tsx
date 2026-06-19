"use client";

import { useCallback, useEffect, useState } from "react";
import PageTitle from "@/components/PageTitle";
import { CalendarClock, RefreshCw, X } from "lucide-react";

type OnHoldOrder = {
  id: number;
  order_date: string | null;
  order_number: string | null;
  first_name: string | null;
  email: string | null;
  on_hold: string | null;
  synced_at: string | null;
};

type SyncFrequency = "daily" | "weekly" | "custom";

const SYNC_TIME_OPTIONS = [
  { label: "12:00 AM", value: "00:00" },
  { label: "4:00 AM", value: "04:00" },
  { label: "8:00 AM", value: "08:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "8:00 PM", value: "20:00" },
];

const DAY_OPTIONS = [
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "T", value: "T" },
  { label: "W", value: "W" },
  { label: "T", value: "T2" },
  { label: "F", value: "F" },
  { label: "S", value: "S2" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSyncedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<OnHoldOrder[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [showScheduleFields, setShowScheduleFields] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [scheduleFrequency, setScheduleFrequency] =
    useState<SyncFrequency>("daily");
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    DAY_OPTIONS.map((day) => day.value)
  );
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);

    try {
      const response = await fetch("/api/sync/shiphero-onhold");
      const data = (await response.json()) as {
        orders?: OnHoldOrder[];
        syncedAt?: string;
        error?: string;
      };

      if (data.error) {
        throw new Error(data.error);
      }

      setOrders(data.orders ?? []);
      setSyncedAt(data.syncedAt ?? null);
    } catch {
      setOrders([]);
      setSyncedAt(null);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchOrders]);

  useEffect(() => {
    if (!syncModalOpen) {
      return;
    }

    fetch("/api/sync/shiphero-onhold-schedule")
      .then((response) => response.json())
      .then(
        (data: {
          schedule?: {
            time: string;
            frequency: SyncFrequency;
            days: string[];
          };
        }) => {
          if (data.schedule) {
            setScheduleTime(data.schedule.time ?? "08:00");
            setScheduleFrequency(data.schedule.frequency ?? "daily");
            setScheduleDays(
              data.schedule.days?.length
                ? data.schedule.days
                : DAY_OPTIONS.map((day) => day.value)
            );
          }
        }
      )
      .catch(() => {});
  }, [syncModalOpen]);

  const syncNow = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setSyncModalOpen(false);

    try {
      const response = await fetch("/api/sync/shiphero-onhold", {
        method: "POST",
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        details?: string;
      };

      if (!response.ok || data.error) {
        setSyncMessage({
          type: "error",
          text: data.details || data.error || "Sync failed.",
        });
      } else {
        await fetchOrders();
        setSyncMessage({ type: "success", text: "ShipHero sync complete." });
      }
    } catch {
      setSyncMessage({
        type: "error",
        text: "Sync failed. Make sure the ShipHero Playwright worker is available and the saved ShipHero session is still logged in.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleDay = (day: string) => {
    setScheduleDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    );
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);

    try {
      await fetch("/api/sync/shiphero-onhold-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: scheduleTime,
          frequency: scheduleFrequency,
          days: scheduleDays,
          enabled: true,
        }),
      });
      setSyncModalOpen(false);
      setShowScheduleFields(false);
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="sticky-page-toolbar">
        <div className="flex items-start justify-between gap-4">
          <PageTitle
            title="Order on Hold"
            description="Track ShipHero orders from the last 30 days that are unfulfilled and on hold."
          />

          <div className="flex shrink-0 items-center gap-2 pt-1">
            {syncedAt && (
              <span className="text-xs text-slate-400">
                Last synced {formatSyncedAt(syncedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSyncModalOpen(true);
                setShowScheduleFields(false);
              }}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={syncing ? "animate-spin" : ""}
              />
              {syncing ? "Syncing..." : "Sync"}
            </button>
          </div>
        </div>

        {syncMessage && (
          <div
            className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${
              syncMessage.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {syncMessage.text}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="table-standard">
          <thead className="sticky-table-header">
            <tr>
              <th>Order Date</th>
              <th>Order Number</th>
              <th>First Name</th>
              <th>Email</th>
              <th>On Hold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingOrders ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  Loading...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  No on-hold orders found. Click <strong>Sync</strong> to pull
                  the latest data from ShipHero.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td>{formatDate(order.order_date)}</td>
                  <td className="font-medium text-slate-900">
                    {order.order_number ?? "-"}
                  </td>
                  <td>{order.first_name ?? "-"}</td>
                  <td className="text-slate-500">{order.email ?? "-"}</td>
                  <td>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                      {order.on_hold ?? "On Hold"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                ShipHero Sync
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSyncModalOpen(false);
                  setShowScheduleFields(false);
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <p className="text-sm text-slate-500">
                Sync now runs the ShipHero automation in the background, saves
                the latest on-hold orders to Supabase, then refreshes this list.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={syncNow}
                  disabled={syncing}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={syncing ? "animate-spin" : ""}
                  />
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleFields(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <CalendarClock size={16} />
                  Schedule
                </button>
              </div>

              {showScheduleFields && (
                <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Time
                    </label>
                    <select
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    >
                      {SYNC_TIME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Frequency
                    </label>
                    <select
                      value={scheduleFrequency}
                      onChange={(event) =>
                        setScheduleFrequency(
                          event.target.value as SyncFrequency
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom days</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Days
                    </label>
                    <div className="mt-2 grid grid-cols-7 gap-2">
                      {DAY_OPTIONS.map((day) => {
                        const selected =
                          scheduleFrequency === "daily" ||
                          scheduleDays.includes(day.value);

                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            disabled={scheduleFrequency === "daily"}
                            className={`h-10 rounded-xl border text-sm font-semibold ${
                              selected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 text-slate-700 hover:bg-slate-50"
                            } disabled:cursor-not-allowed`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void saveSchedule()}
                    disabled={savingSchedule}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingSchedule ? "Saving..." : "Save Schedule"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
