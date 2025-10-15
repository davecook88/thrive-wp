import { useState } from "@wordpress/element";
import { createPortal } from "react-dom";

interface WaitlistModalProps {
  sessionId: number;
  title: string;
  startAt: string;
  level?: { code: string; name: string };
  teacher?: { name: string };
  onClose: () => void;
  onJoin: () => void;
}

export function WaitlistModal({
  sessionId,
  title,
  startAt,
  level,
  teacher,
  onClose,
  onJoin,
}: WaitlistModalProps) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      const response = await fetch("/api/waitlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to join waitlist");
      }

      const result = await response.json();
      alert(
        `You've been added to the waitlist at position ${result.position}. We'll notify you if a spot opens up!`
      );
      onJoin();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to join waitlist"
      );
    } finally {
      setJoining(false);
    }
  }

  const sessionDate = new Date(startAt);

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "32px",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              fontSize: "24px",
            }}
          >
            ⏳
          </div>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: 0,
              marginBottom: "8px",
              color: "#111827",
            }}
          >
            Class is Full
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: 0,
            }}
          >
            This class is currently at capacity. Would you like to join the
            waitlist?
          </p>
        </div>

        {/* Class Details */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "4px",
              }}
            >
              {title}
            </div>
            {level && (
              <div
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  backgroundColor: "var(--wp--preset--color--accent-light, #f0fdf4)",
                  color: "var(--wp--preset--color--accent, #10b981)",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                {level.code}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📅</span>
              <span>{sessionDate.toLocaleDateString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🕐</span>
              <span>
                {sessionDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {teacher && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span>👨‍🏫</span>
                <span>{teacher.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            borderLeft: "4px solid #3b82f6",
            padding: "12px",
            marginBottom: "24px",
            borderRadius: "4px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "#1e40af",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            💡 <strong>How it works:</strong> If a spot becomes available,
            you'll be notified via email. You'll have 24 hours to claim the
            spot before it's offered to the next person on the waitlist.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              borderLeft: "4px solid #dc2626",
              padding: "12px",
              marginBottom: "16px",
              borderRadius: "4px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#991b1b",
                margin: 0,
              }}
            >
              ❌ {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={joining}
            style={{
              padding: "10px 20px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              backgroundColor: "white",
              color: "#374151",
              fontSize: "14px",
              fontWeight: 600,
              cursor: joining ? "not-allowed" : "pointer",
              opacity: joining ? 0.5 : 1,
              transition: "all 150ms ease",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "var(--wp--preset--color--accent, #10b981)",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: joining ? "not-allowed" : "pointer",
              opacity: joining ? 0.7 : 1,
              transition: "all 150ms ease",
            }}
          >
            {joining ? "Joining..." : "Join Waitlist"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function showWaitlistModal(props: Omit<WaitlistModalProps, "onClose">) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  function closeModal() {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  const root = (window as any).wp.element.createRoot
    ? (window as any).wp.element.createRoot(container)
    : null;

  if (root) {
    root.render(
      <WaitlistModal
        {...props}
        onClose={() => {
          closeModal();
          root.unmount();
        }}
      />
    );
  }
}
