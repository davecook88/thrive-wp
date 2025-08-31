import { useEffect, useState } from "@wordpress/element";
import { Button } from "@wordpress/components";
import RulesSection from "./RulesSection";
import ExceptionsSection from "./ExceptionsSection";
import PreviewSection from "./PreviewSection";

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

  const API_BASE = "/api";

  useEffect(() => {
    loadAvailability();
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
      const data: AvailabilityData = await apiCall("/teachers/me/availability");
      setRules(data.rules || []);
      setExceptions(data.exceptions || []);
    } catch (error) {
      console.error("Failed to load availability:", error);
      setRules([]);
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (rule: Omit<Rule, "id">) => {
    try {
      const response = await fetch("/api/teachers/me/availability/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Rule added:", result);

      // Refresh the availability data
      await loadAvailability();
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
      const response = await fetch(
        `/api/teachers/me/availability/rules/${rule.id}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove from local state
      setRules(rules.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Error removing rule:", error);
      alert("Failed to remove rule: " + (error as Error).message);
    }
  };

  const handleAddException = async (exception: Omit<Exception, "id">) => {
    try {
      const response = await fetch("/api/teachers/me/availability/exceptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(exception),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Exception added:", result);

      // Refresh the availability data
      await loadAvailability();
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
      const response = await fetch(
        `/api/teachers/me/availability/exceptions/${exception.id}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove from local state
      setExceptions(exceptions.filter((_, i) => i !== index));
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
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      console.error("Refresh error:", error);
      setSaveStatus("Refresh failed. Please try again.");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

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

      <PreviewSection
        showPreviewWeeks={showPreviewWeeks}
        accentColor={accentColor}
      />

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
