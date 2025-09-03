import { useEffect, useState } from "@wordpress/element";
import { Button } from "@wordpress/components";
import { getCalendarContextSafe } from "../../../types/calendar-utils";
import type { CalendarEvent } from "../../../types/calendar";
import RulesSection from "./RulesSection";
import ExceptionsSection from "./ExceptionsSection";

interface Rule {
  id?: string;
  weekday: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  kind: string;
}

interface Exception {
  id?: string;
  date: string;
  kind: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
}

interface AvailabilityData {
  rules: Rule[];
  exceptions: Exception[];
}

interface TeacherAvailabilityProps {
  heading: string;
  helpText: string;
  accentColor: string;
  showPreviewWeeks: number;
}

export default function TeacherAvailability({
  heading,
  helpText,
  accentColor,
  showPreviewWeeks,
}: TeacherAvailabilityProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const API_BASE = "/api";

  useEffect(() => {
    loadAvailability();
    // Also push an initial preview into the calendar context if present
    previewAndPushToCalendar(showPreviewWeeks).catch(() => void 0);
  }, []);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API call failed: ${response.status} ${error}`);
    }

    return response.json();
  };

  const loadAvailability = async () => {
    try {
      setLoading(true);
      // Backend shape -> UI shape mapping
      const data = await apiCall("/teachers/me/availability");
      const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };

      const mappedRules: Rule[] = (data.rules || []).map((r: any) => ({
        id: String(r.id),
        weekday: String(r.weekday),
        startTimeMinutes: toMinutes(r.startTime),
        endTimeMinutes: toMinutes(r.endTime),
        kind: "available",
      }));

      const mappedExceptions: Exception[] = (data.exceptions || []).map(
        (e: any) => ({
          id: String(e.id),
          date: e.date,
          kind: e.isBlackout ? "unavailable" : "available",
          startTimeMinutes: e.startTime ? toMinutes(e.startTime) : undefined,
          endTimeMinutes: e.endTime ? toMinutes(e.endTime) : undefined,
        })
      );

      setRules(mappedRules);
      setExceptions(mappedExceptions);
    } catch (error) {
      console.error("Failed to load availability:", error);
      setRules([]);
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Build DTO and persist full availability snapshot (API uses PUT on the collection)
  const persistAvailability = async (
    nextRules: Rule[],
    nextExceptions: Exception[]
  ) => {
    const toTime = (mins: number) => {
      // Normalize negative minutes to wrap around within 24 hours
      // (e.g., -30 becomes 1410, which is 23:30)
      const normalizedMins = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);

      const utcHours = Math.floor(normalizedMins / 60);
      // Ensure minutes are always positive (JS % can return negative for negatives)
      const utcMinutes = ((normalizedMins % 60) + 60) % 60;

      return `${utcHours.toString().padStart(2, "0")}:${utcMinutes
        .toString()
        .padStart(2, "0")}`;
    };

    const payload = {
      rules: nextRules.map((r) => ({
        weekday: Number(r.weekday),
        startTime: toTime(r.startTimeMinutes),
        endTime: toTime(r.endTimeMinutes),
      })),
      // Only blackout exceptions are currently supported by the API
      exceptions: nextExceptions
        .filter((e) => e.kind === "unavailable")
        .map((e) => ({
          date: e.date,
          startTime:
            typeof e.startTimeMinutes === "number"
              ? toTime(e.startTimeMinutes)
              : undefined,
          endTime:
            typeof e.endTimeMinutes === "number"
              ? toTime(e.endTimeMinutes)
              : undefined,
          isBlackout: true,
        })),
    };

    const result = await apiCall("/teachers/me/availability", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    // Normalize the response by reloading fresh state
    await loadAvailability();
    setRefreshVersion((v) => v + 1);
    // After save, refresh the calendar preview
    await previewAndPushToCalendar(showPreviewWeeks);
    return result;
  };

  const handleAddRule = async (rule: Omit<Rule, "id">) => {
    try {
      console.log("Adding rule:", rule);
      console.log("Current rules:", rules);
      const next = [...rules, rule];
      setRules(next);
      await persistAvailability(next, exceptions);
    } catch (error) {
      console.error("Error adding rule:", error);
      alert("Failed to add rule: " + (error as Error).message);
    }
  };

  const handleRemoveRule = async (index: number) => {
    const rule = rules[index];
    if (!rule || !rule.id) {
      // Remove from local state only if no ID (not saved yet)
      setRules(rules.filter((_, i) => i !== index));
      return;
    }

    try {
      const next = rules.filter((_, i) => i !== index);
      setRules(next);
      await persistAvailability(next, exceptions);
    } catch (error) {
      console.error("Error removing rule:", error);
      alert("Failed to remove rule: " + (error as Error).message);
    }
  };

  const handleAddException = async (exception: Omit<Exception, "id">) => {
    // Only blackout (kind === 'unavailable') is supported by the API currently
    if (exception.kind !== "unavailable") {
      alert("Custom availability exceptions are not supported yet.");
      return;
    }
    try {
      const next = [...exceptions, exception];
      setExceptions(next);
      await persistAvailability(rules, next);
    } catch (error) {
      console.error("Error adding exception:", error);
      alert("Failed to add exception: " + (error as Error).message);
    }
  };

  const handleRemoveException = async (index: number) => {
    const exception = exceptions[index];
    if (!exception || !exception.id) {
      // Remove from local state only if no ID (not saved yet)
      setExceptions(exceptions.filter((_, i) => i !== index));
      return;
    }

    try {
      const next = exceptions.filter((_, i) => i !== index);
      setExceptions(next);
      await persistAvailability(rules, next);
    } catch (error) {
      console.error("Error removing exception:", error);
      alert("Failed to remove exception: " + (error as Error).message);
    }
  };

  const handleRefresh = async () => {
    try {
      setSaveStatus("Refreshing...");
      await loadAvailability();
      setSaveStatus("Refreshed successfully!");
      await previewAndPushToCalendar(showPreviewWeeks);
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      console.error("Refresh error:", error);
      setSaveStatus("Refresh failed. Please try again.");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  // Compute a preview window and push events into the shared calendar context
  async function previewAndPushToCalendar(weeks: number) {
    try {
      const container = document.getElementById("teacher-availability-root");
      if (!container) return;
      const api = getCalendarContextSafe(container);
      if (!api || typeof api.setEventsFromTeacherAvailability !== "function")
        return;

      // Compute start of current week (Sunday) and end by weeks
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const start = new Date(now);
      const dow = start.getDay();
      start.setDate(start.getDate() - dow);
      const end = new Date(start);
      end.setDate(end.getDate() + Math.max(1, weeks) * 7);

      const res = await apiCall("/teachers/me/availability/preview", {
        method: "POST",
        body: JSON.stringify({
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      });
      const windows: Array<{ start: string; end: string }> = Array.isArray(
        res?.windows
      )
        ? res.windows
        : [];
      const events: CalendarEvent[] = windows.map((w) => ({
        id: `avail:${w.start}|${w.end}`,
        title: "Available",
        startUtc: w.start,
        endUtc: w.end,
        type: "availability" as const,
      }));

      api.setEventsFromTeacherAvailability(
        start.toISOString(),
        end.toISOString(),
        events
      );
    } catch (e) {
      // Non-fatal: preview is best-effort
      console.warn("Failed to push preview to calendar", e);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
        Loading availability...
      </div>
    );
  }

  return (
    <div
      className="teacher-availability-container"
      style={{ maxWidth: "1200px", margin: "0 auto" }}
    >
      <div
        style={{
          background: `${accentColor}20`,
          border: `2px solid ${accentColor}`,
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ color: accentColor, marginTop: 0 }}>{heading}</h3>
        <p style={{ marginBottom: 0, color: "#666" }}>{helpText}</p>
      </div>

      {/* Management Interface */}
      <div
        className="availability-management"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <RulesSection
          rules={rules}
          onAddRule={handleAddRule}
          onRemoveRule={handleRemoveRule}
          accentColor={accentColor}
        />
        <ExceptionsSection
          exceptions={exceptions}
          onAddException={handleAddException}
          onRemoveException={handleRemoveException}
          accentColor={accentColor}
        />
      </div>

      {/* Save Button */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <Button
          variant="primary"
          onClick={handleRefresh}
          style={{
            background: "#10b981",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Refresh
        </Button>
        <span
          style={{
            marginLeft: "15px",
            color: saveStatus.includes("failed") ? "#ef4444" : "#10b981",
          }}
        >
          {saveStatus}
        </span>
      </div>
    </div>
  );
}
