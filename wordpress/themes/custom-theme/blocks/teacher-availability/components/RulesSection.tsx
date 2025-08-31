import { useState } from "@wordpress/element";
import { Button, TextControl, SelectControl } from "@wordpress/components";

interface Rule {
  id?: string;
  weekday: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  kind: string;
}

interface RulesSectionProps {
  rules: Rule[];
  onAddRule: (rule: Omit<Rule, "id">) => void;
  onRemoveRule: (index: number) => void;
  accentColor: string;
}

export default function RulesSection({
  rules,
  onAddRule,
  onRemoveRule,
  accentColor,
}: RulesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    weekday: "1",
    startTimeMinutes: 9 * 60,
    endTimeMinutes: 17 * 60,
    kind: "available",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRule(formData);
    setShowForm(false);
    setFormData({
      weekday: "1",
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 17 * 60,
      kind: "available",
    });
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  const formatRuleDisplay = (rule: Rule) => {
    const weekday =
      weekdays.find((w) => w.value === rule.weekday)?.label || "Unknown";
    const startTime = minutesToTime(rule.startTimeMinutes);
    const endTime = minutesToTime(rule.endTimeMinutes);
    return `${weekday}: ${startTime} - ${endTime}`;
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
                onClick={() => onRemoveRule(index)}
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
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <SelectControl
              label="Day of Week"
              value={formData.weekday}
              options={weekdays}
              onChange={(value) => setFormData({ ...formData, weekday: value })}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <TextControl
                label="Start Time (HH:MM)"
                value={minutesToTime(formData.startTimeMinutes)}
                onChange={(value) => {
                  const [hours, minutes] = value.split(":").map(Number);
                  setFormData({
                    ...formData,
                    startTimeMinutes: hours * 60 + minutes,
                  });
                }}
                type="time"
              />
              <TextControl
                label="End Time (HH:MM)"
                value={minutesToTime(formData.endTimeMinutes)}
                onChange={(value) => {
                  const [hours, minutes] = value.split(":").map(Number);
                  setFormData({
                    ...formData,
                    endTimeMinutes: hours * 60 + minutes,
                  });
                }}
                type="time"
              />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <Button
                type="submit"
                variant="primary"
                style={{ background: accentColor }}
              >
                Add Rule
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
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
