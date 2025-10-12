import { Dispatch, SetStateAction } from "react";
import type { Level } from "../../../../../shared/types/calendar";

interface BookingFiltersProps {
  showPrivateSessions: boolean;
  showGroupClasses: boolean;
  setShowPrivateSessions: Dispatch<SetStateAction<boolean>>;
  setShowGroupClasses: Dispatch<SetStateAction<boolean>>;
  sessionDuration: number;
  setSessionDuration: Dispatch<SetStateAction<number>>;
  levels: Level[];
  selectedLevelIds: number[];
  toggleLevel: (id: number) => void;
}

export default function BookingFilters({
  showPrivateSessions,
  showGroupClasses,
  setShowPrivateSessions,
  setShowGroupClasses,
  sessionDuration,
  setSessionDuration,
  levels,
  selectedLevelIds,
  toggleLevel,
}: BookingFiltersProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: "#374151",
          }}
        >
          Class Type
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={showPrivateSessions}
              onChange={(e) => setShowPrivateSessions(e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Private Sessions</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={showGroupClasses}
              onChange={(e) => setShowGroupClasses(e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Group Classes</span>
          </label>
        </div>
      </div>

      {showGroupClasses && levels.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: "#374151",
            }}
          >
            Filter by Level
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {levels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => toggleLevel(level.id)}
                style={{
                  padding: "6px 12px",
                  border: "2px solid",
                  borderColor: selectedLevelIds.includes(level.id)
                    ? "var(--wp--preset--color--accent, #10b981)"
                    : "#e5e7eb",
                  borderRadius: 6,
                  background: selectedLevelIds.includes(level.id)
                    ? "var(--wp--preset--color--accent-light, #f0fdf4)"
                    : "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: selectedLevelIds.includes(level.id)
                    ? "var(--wp--preset--color--accent, #10b981)"
                    : "#6b7280",
                  transition: "all 150ms ease",
                }}
              >
                {level.code}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="session-duration"
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: "#374151",
          }}
        >
          Session Duration
        </label>
        <select
          id="session-duration"
          value={sessionDuration}
          onChange={(e) => setSessionDuration(Number(e.target.value))}
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: "white",
            minWidth: 120,
          }}
        >
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
        </select>
      </div>
    </div>
  );
}
