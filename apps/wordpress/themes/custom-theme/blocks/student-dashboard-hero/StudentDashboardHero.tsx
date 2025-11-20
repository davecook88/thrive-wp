import { useEffect, useState } from "react";
import { thriveClient } from "../../../../shared/thrive";
import { DashboardSummaryDto } from "@thrive/shared";

export default function StudentDashboardHero() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await thriveClient.getDashboardSummary();
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch dashboard summary", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchSummary();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 0",
          background: "linear-gradient(to right, #f0fdf4, #dcfce7)",
          borderRadius: 16,
          marginBottom: 32,
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      ></div>
    );
  }

  if (!summary) return null;

  const { studentName, nextSession, creditBalance, recommendedAction } =
    summary;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div
      className="student-dashboard-hero"
      style={{
        padding: "40px",
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        borderRadius: 16,
        marginBottom: 32,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 24,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ flex: 1, minWidth: "300px" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            color: "#064e3b",
            marginBottom: "8px",
            lineHeight: 1.2,
          }}
        >
          {getGreeting()}, {studentName}!
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#065f46", marginBottom: 0 }}>
          Welcome back to your learning journey.
        </p>
      </div>

      <div
        className="hero-actions"
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Primary Action Card */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
            minWidth: "240px",
          }}
        >
          {recommendedAction === "JOIN_CLASS" && nextSession ? (
            <>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#059669",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                HAPPENING NOW
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 12,
                }}
              >
                Class starting soon!
              </div>
              <a
                href={nextSession.joinUrl || "#"}
                style={{
                  display: "inline-block",
                  width: "100%",
                  textAlign: "center",
                  background: "#059669",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                Join Class →
              </a>
            </>
          ) : recommendedAction === "BOOK_SESSION" ? (
            <>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#059669",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                NEXT STEP
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 12,
                }}
              >
                Book your next session
              </div>
              <a
                href="/booking"
                style={{
                  display: "inline-block",
                  width: "100%",
                  textAlign: "center",
                  background: "#059669",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                Book Now
              </a>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#059669",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                CREDITS
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: 12,
                }}
              >
                {creditBalance} credits remaining
              </div>
              <a
                href="/packages"
                style={{
                  display: "inline-block",
                  width: "100%",
                  textAlign: "center",
                  background: "#059669",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}
              >
                Buy More
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
