import { useState } from "@wordpress/element";
import { Button, TextControl, CheckboxControl } from "@wordpress/components";

interface Exception {
  id?: string;
  date: string;
  kind: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
}

interface ExceptionsSectionProps {
  exceptions: Exception[];
  onAddException: (exception: Omit<Exception, "id">) => void;
  onRemoveException: (index: number) => void;
  accentColor: string;
}

export default function ExceptionsSection({
  exceptions,
  onAddException,
  onRemoveException,
  accentColor,
}: ExceptionsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    kind: "available",
    startTimeMinutes: 9 * 60,
    endTimeMinutes: 17 * 60,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exception = isBlackout
      ? { date: formData.date, kind: "unavailable" }
      : { ...formData };
    onAddException(exception);
    setShowForm(false);
    setIsBlackout(false);
    setFormData({
      date: "",
      kind: "available",
      startTimeMinutes: 9 * 60,
      endTimeMinutes: 17 * 60,
    });
  };

  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  };

  const formatExceptionDisplay = (exception: Exception) => {
    if (exception.kind === "unavailable") {
      return `${exception.date}: Blackout`;
    }
    const startTime =
      exception.startTimeMinutes !== undefined
        ? minutesToTime(exception.startTimeMinutes)
        : "All day";
    const endTime =
      exception.endTimeMinutes !== undefined
        ? minutesToTime(exception.endTimeMinutes)
        : "All day";
    return `${exception.date}: ${startTime} - ${endTime}`;
  };

  return (
    <div
      className="exceptions-section"
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <h4 style={{ marginTop: 0, color: "#374151" }}>Exceptions</h4>
      <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "15px" }}>
        Add specific dates for blackouts or custom availability.
      </p>

      <div className="exceptions-container">
        {exceptions.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#6b7280", padding: "20px" }}
          >
            No exceptions set. Add date-specific availability or blackouts
            below.
          </div>
        ) : (
          exceptions.map((exception, index) => (
            <div
              key={exception.id || index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px",
                background: "#fef3c7",
                borderRadius: "6px",
                marginBottom: "8px",
              }}
            >
              <div>{formatExceptionDisplay(exception)}</div>
              <Button
                variant="secondary"
                isDestructive
                onClick={() => onRemoveException(index)}
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
          className="add-exception-form"
          style={{
            marginTop: "15px",
            padding: "15px",
            background: "#fef3c7",
            borderRadius: "6px",
            border: "1px solid #f59e0b",
          }}
        >
          <h5 style={{ marginTop: 0, color: "#92400e" }}>Add Exception</h5>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <TextControl
              label="Date"
              value={formData.date}
              onChange={(value) => setFormData({ ...formData, date: value })}
              type="date"
              required
            />
            <CheckboxControl
              label="Blackout (unavailable all day)"
              checked={isBlackout}
              onChange={(checked) => setIsBlackout(checked)}
            />
            {!isBlackout && (
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
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <Button
                type="submit"
                variant="primary"
                style={{ background: accentColor }}
              >
                Add Exception
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
          Add Exception
        </Button>
      )}
    </div>
  );
}
