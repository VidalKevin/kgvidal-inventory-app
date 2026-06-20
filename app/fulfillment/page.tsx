"use client";

import { useCallback, useEffect, useState } from "react";
import PageTitle from "@/components/PageTitle";
import { CalendarClock, RefreshCw, X } from "lucide-react";

const tabs = ["POs on Hold", "Unfulfilled POs"] as const;
const DAY_OPTIONS = [
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "T", value: "T" },
  { label: "W", value: "W" },
  { label: "T", value: "T2" },
  { label: "F", value: "F" },
  { label: "S", value: "S2" },
];
const SYNC_TIME_OPTIONS = [
  { label: "12:00 AM", value: "00:00" },
  { label: "4:00 AM", value: "04:00" },
  { label: "8:00 AM", value: "08:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "8:00 PM", value: "20:00" },
];

type FulfillmentTab = (typeof tabs)[number];
type SyncFrequency = "daily" | "weekly" | "custom";

type OnHoldOrder = {
  id: number;
  order_date: string | null;
  order_number: string | null;
  first_name: string | null;
  email: string | null;
  on_hold: string | null;
  synced_at: string | null;
};

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
  const [activeTab, setActiveTab] = useState<FulfillmentTab>("POs on Hold");
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

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to load on-hold orders.");
      }

      setOrders(data.orders ?? []);
      setSyncedAt(data.syncedAt ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load on-hold orders.";
      setOrders([]);
      setSyncedAt(null);
      setSyncMessage({ type: "error", text: message });
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
        throw new Error(data.details || data.error || "ShipHero sync failed.");
      }

      await fetchOrders();
      setSyncMessage({ type: "success", text: "ShipHero on-hold sync complete." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ShipHero sync failed.";
      setSyncMessage({ type: "error", text: message });
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
    setSyncMessage(null);

    try {
      const days =
        scheduleFrequency === "daily"
          ? DAY_OPTIONS.map((day) => day.value)
          : scheduleDays;
      const response = await fetch("/api/sync/shiphero-onhold-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: scheduleTime,
          frequency: scheduleFrequency,
          days,
          enabled: true,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to save ShipHero schedule.");
      }

      setSyncModalOpen(false);
      setShowScheduleFields(false);
      setSyncMessage({
        type: "success",
        text: "ShipHero on-hold schedule saved to Supabase.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save ShipHero schedule.";
      setSyncMessage({ type: "error", text: message });
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <section>
      <div className="sticky-page-toolbar">
        <div className="flex items-start justify-between gap-4">
          <PageTitle
            title="Fulfillment"
            description="Review order holds and unfulfilled purchase order activity."
          />

          {activeTab === "POs on Hold" && (
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
                className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing..." : "Sync"}
              </button>
            </div>
          )}
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
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

      {activeTab === "POs on Hold" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky-table-header bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Order Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Order Number
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  First Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  On Hold
                </th>
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
                    No on-hold orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(order.order_date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {order.order_number ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.first_name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {order.email ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.on_hold ?? "On Hold"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Unfulfilled PO sync will be added here next.
        </div>
      )}

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
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={syncNow}
                  disabled={syncing}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
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
                        setScheduleFrequency(event.target.value as SyncFrequency)
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
                    disabled={
                      savingSchedule ||
                      (scheduleFrequency !== "daily" && scheduleDays.length === 0)
                    }
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingSchedule ? "Saving..." : "Save schedule"}
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
