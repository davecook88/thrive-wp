import { useState } from "@wordpress/element";
import { Button } from "@wordpress/components";
import CustomSelectControl from "./CustomSelectControl";
import ClockTimePicker from "./ClockTimePicker";
import { WeeklyAvailabilityRule } from "@thrive/shared";

interface RulesSectionProps {
  rules: WeeklyAvailabilityRule[];
  onAddRule: (rule: Omit<WeeklyAvailabilityRule, "id">) => void | Promise<void>;
  onRemoveRule: (index: number) => void | Promise<void>;
  accentColor: string;
}

// Form state type for UI representation
interface RuleFormData {
  dayOfWeek: number;
  startTimeMinutes: number;
  endTimeMinutes: number;
}

// Conversion helpers
const minutesToTimeString = (minutes: number): string => {
  // Normalize minutes to be within 0-1439 (24 hours)
  const normalizedMins = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  // Create a Date object for today at the local time represented by normalizedMins
  const now = new Date();
  const localDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    normalizedMins,
  );
  // Get UTC hours and minutes
  const utcHours = localDate.getUTCHours();
  const utcMins = localDate.getUTCMinutes();
  return `${utcHours.toString().padStart(2, "0")}:${utcMins.toString().padStart(2, "0")}`;
};

// Convert a "HH:MM" time string that should be interpreted as UTC into a localized time string
const utcTimeStringToLocal = (time: string): string => {
  if (!time || typeof time !== "string") {
    return time;
  }
  const parts = time.split(":");
  if (parts.length < 2) {
    return time;
  }
  const hours = Number.parseInt(parts[0], 10);
  const minutes = Number.parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }
  // Use a fixed date and interpret the time as UTC, then format to local.
  const utcDate = new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
  return utcDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function RulesSection({
  rules,
  onAddRule,
  onRemoveRule,
  accentColor,
}: RulesSectionProps) {
  console.log("Rendering RulesSection with rules:", rules);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RuleFormData>({
    dayOfWeek: 1,
    startTimeMinutes: 9 * 60,
    endTimeMinutes: 17 * 60,
  });

  const weekdays = [
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert form data to API format
    const ruleToSubmit: Omit<WeeklyAvailabilityRule, "id"> = {
      dayOfWeek: formData.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: minutesToTimeString(formData.startTimeMinutes),
      endTime: minutesToTimeString(formData.endTimeMinutes),
    };

    await onAddRule(ruleToSubmit);
    setShowForm(false);
    setFormData({
      dayOfWeek: 1,
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 17 * 60,
    });
  };

  const formatRuleDisplay = (rule: WeeklyAvailabilityRule) => {
    const weekday =
      weekdays.find((w) => w.value === String(rule.dayOfWeek))?.label ||
      "Unknown";
    const startTimeLocal = utcTimeStringToLocal(rule.startTime);
    const endTimeLocal = utcTimeStringToLocal(rule.endTime);
    return `${weekday}: ${startTimeLocal} - ${endTimeLocal}`;
  };

  return (
    <div
      className="rules-section"
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <h4 style={{ marginTop: 0, color: "#374151" }}>Weekly Rules</h4>
      <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "15px" }}>
        Set your recurring availability for each day of the week.
      </p>

      <div className="rules-container">
        {rules.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#6b7280", padding: "20px" }}
          >
            No rules set. Add your first weekly rule below.
          </div>
        ) : (
          rules.map((rule, index) => (
            <div
              key={rule.id || index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px",
                background: "#f8fafc",
                borderRadius: "6px",
                marginBottom: "8px",
              }}
            >
              <div>{formatRuleDisplay(rule)}</div>
              <Button
                variant="secondary"
                isDestructive
                onClick={() => {
                  void onRemoveRule(index);
                }}
                style={{ fontSize: "12px", padding: "5px 10px" }}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div
          className="add-rule-form"
          style={{
            marginTop: "15px",
            padding: "15px",
            background: "#f8fafc",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        >
          <h5 style={{ marginTop: 0, color: "#374151" }}>Add Weekly Rule</h5>
          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <CustomSelectControl
              label="Day of Week"
              value={String(formData.dayOfWeek)}
              options={weekdays}
              accentColor={accentColor}
              onChange={(value) =>
                setFormData({ ...formData, dayOfWeek: Number(value) })
              }
            />
            <div
              style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}
            >
              <ClockTimePicker
                label="Start Time"
                value={formData.startTimeMinutes}
                onChange={(minutes) =>
                  setFormData({ ...formData, startTimeMinutes: minutes })
                }
                accentColor={accentColor}
                is12Hour
              />
              <ClockTimePicker
                label="End Time"
                value={formData.endTimeMinutes}
                onChange={(minutes) =>
                  setFormData({ ...formData, endTimeMinutes: minutes })
                }
                accentColor={accentColor}
                is12Hour
              />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <Button
                type="submit"
                variant="primary"
                className="btn has-accent-background-color has-white-color"
                style={{ background: accentColor }}
              >
                Add Rule
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
                className="btn has-secondary-background-color has-white-color"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          style={{
            background: accentColor,
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: "6px",
            cursor: "pointer",
            marginTop: "15px",
          }}
        >
          Add Rule
        </Button>
      )}
    </div>
  );
}
