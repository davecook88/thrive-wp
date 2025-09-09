import type { Teacher } from "../types/calendar";

interface BookingSectionProps {
  selectedTeacher: Teacher | null;
  hasCredits: boolean;
  bookingState: string | null;
  onBook: (useCredits: boolean) => void;
}

export default function BookingSection({
  selectedTeacher,
  hasCredits,
  bookingState,
  onBook,
}: BookingSectionProps) {
  return (
    <section
      style={{
        padding: "2rem",
        borderTop: "1px solid var(--wp--preset--color--gray-200)",
        background: "white",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {selectedTeacher ? (
          <>
            <div
              style={{
                marginBottom: "1.5rem",
                fontSize: "1.1rem",
                color: "var(--wp--preset--color--gray-600)",
              }}
            >
              Ready to book with <strong>{selectedTeacher.name}</strong>?
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => onBook(false)}
                disabled={bookingState === "pending"}
                style={{
                  background: "var(--wp--preset--color--primary)",
                  border: "none",
                  borderRadius: "var(--wp--custom--border-radius)",
                  padding: "1rem 2rem",
                  color: "white",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  cursor:
                    bookingState === "pending" ? "not-allowed" : "pointer",
                  opacity: bookingState === "pending" ? 0.7 : 1,
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(255, 87, 34, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (bookingState !== "pending") {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(255, 87, 34, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (bookingState !== "pending") {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(255, 87, 34, 0.3)";
                  }
                }}
              >
                {bookingState === "pending"
                  ? "🔄 Booking..."
                  : "🎯 Book Class Now"}
              </button>

              {hasCredits && (
                <button
                  onClick={() => onBook(true)}
                  disabled={bookingState === "pending"}
                  className="wp-block-button__link thrive-outline"
                  style={{
                    background: "transparent",
                    border: `2px solid var(--wp--preset--color--primary)`,
                    borderRadius: "var(--wp--custom--border-radius)",
                    padding: "1rem 2rem",
                    color: "var(--wp--preset--color--primary)",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    cursor:
                      bookingState === "pending" ? "not-allowed" : "pointer",
                    opacity: bookingState === "pending" ? 0.7 : 1,
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (bookingState !== "pending") {
                      e.currentTarget.style.background =
                        "var(--wp--preset--color--primary)";
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (bookingState !== "pending") {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color =
                        "var(--wp--preset--color--primary)";
                    }
                  }}
                >
                  💎 Use Credits
                </button>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              padding: "2rem",
              background: "var(--wp--preset--color--gray-50)",
              borderRadius: "var(--wp--custom--border-radius)",
              color: "var(--wp--preset--color--gray-600)",
            }}
          >
            <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>👆</div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Select a teacher above to continue
            </div>
            <div style={{ fontSize: "0.9rem" }}>
              Choose your preferred teacher to see their details and book your
              class
            </div>
          </div>
        )}

        {/* Status Messages */}
        {bookingState === "pending" && (
          <div
            style={{
              marginTop: "1.5rem",
              color: "var(--wp--preset--color--primary)",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ marginRight: "0.5rem" }}>⏳</div>
            Securing your spot…
          </div>
        )}
        {bookingState === "done" && (
          <div
            style={{
              marginTop: "1.5rem",
              color: "var(--wp--preset--color--secondary)",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ marginRight: "0.5rem" }}>✅</div>
            Booked! Check your email for details.
          </div>
        )}
      </div>
    </section>
  );
}
