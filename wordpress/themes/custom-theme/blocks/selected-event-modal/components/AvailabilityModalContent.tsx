import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import type { AvailabilityEvent, Teacher } from "../../../types/calendar";

type ModalAvailabilityEvent = AvailabilityEvent & {
  startLocal?: string;
  endLocal?: string;
  user?: any;
  currentUser?: any;
};
import { useGetTeachers } from "../../hooks/get-teachers";
import { useGetCalendarContext } from "../../hooks/get-context";
import { TeacherSelectionRow, TeacherDetails } from "../../../components";

export default function AvailabilityModalContent({
  event,
}: {
  event: ModalAvailabilityEvent;
}) {
  console.log("AvailabilityModalContent render", { window });
  const context = useGetCalendarContext(".thrive-teacher-picker");
  const {
    getTeacherById,
    loading: loadingTeachers,
    teachers,
  } = useGetTeachers(context);

  console.log({ loadingTeachers, teachers });

  const hasCredits = useMemo(() => {
    const user = (event as any)?.user || (event as any)?.currentUser || {};
    return (
      (typeof user?.credits === "number" && user.credits > 0) ||
      Boolean(user?.hasPackage) ||
      Boolean((event as any)?.userHasPackage)
    );
  }, [event]);

  const [bookingState, setBookingState] = useState<null | string>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);

  // Smoothly reveal details when a teacher is selected
  useEffect(() => {
    if (selectedTeacher && detailsRef.current) {
      try {
        detailsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } catch {
        /* no-op */
      }
    }
  }, [selectedTeacher]);

  const onBook = (useCredits = false) => {
    if (!selectedTeacher) return;

    setBookingState("pending");
    try {
      window.dispatchEvent(
        new CustomEvent("thrive-calendar:book", {
          detail: { event, teacher: selectedTeacher, useCredits },
        })
      );
    } catch (err) {
      if ((selectedTeacher as any)?.bookingUrl)
        window.location.href = (selectedTeacher as any).bookingUrl;
    }
    setTimeout(() => setBookingState("done"), 600);
  };

  return (
    <div
      className="selected-event-modal__availability"
      style={{
        width: "95vw",
        maxWidth: 1200,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "var(--wp--preset--font-family--inter)",
        background: "var(--wp--preset--color--background)",
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "1.25rem 2rem 1rem",
          borderBottom: "1px solid var(--wp--preset--color--gray-200)",
          position: "sticky",
          top: 0,
          background: "var(--wp--preset--color--background)",
          zIndex: 10,
        }}
      >
        {/* Row 1: Session summary + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 240, flex: "1 1 auto" }}>
            <div
              style={{
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 600,
                fontSize: "0.8rem",
                color: "var(--wp--preset--color--accent)",
                marginBottom: ".25rem",
              }}
            >
              Session
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                color: "var(--wp--preset--color--foreground)",
                fontWeight: 700,
              }}
            >
              {event?.startLocal}
              {event?.endLocal ? ` — ${event.endLocal}` : ""}
            </div>
          </div>

          <div
            style={{
              minWidth: 160,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="btn btn--book"
              onClick={() => onBook(hasCredits)}
              disabled={!selectedTeacher || bookingState === "pending"}
              style={{
                border: "none",
                borderRadius: 50,
                padding: "12px 22px",
                fontWeight: 700,
                cursor: !selectedTeacher ? "not-allowed" : "pointer",
                background: selectedTeacher
                  ? "var(--wp--preset--color--accent)"
                  : "var(--wp--preset--color--gray-300)",
                color: selectedTeacher
                  ? "var(--wp--preset--color--background)"
                  : "var(--wp--preset--color--gray-700)",
                opacity: bookingState === "pending" ? 0.8 : 1,
                transition: "transform 120ms ease, opacity 120ms ease",
              }}
            >
              {bookingState === "pending" ? "Booking…" : "Book Now"}
            </button>
          </div>
        </div>

        {/* Row 2: Context chip(s) */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {selectedTeacher ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "var(--wp--preset--color--gray-50)",
                padding: "0.4rem 0.75rem",
                borderRadius: 999,
                fontWeight: 600,
                color: "var(--wp--preset--color--foreground)",
              }}
              aria-live="polite"
            >
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "var(--wp--preset--color--gray-200)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--wp--preset--color--gray-700)",
                }}
              >
                {selectedTeacher?.name?.[0] ?? "T"}
              </span>
              <span>Selected: {selectedTeacher?.name}</span>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                style={{
                  marginLeft: 6,
                  background: "transparent",
                  border: "none",
                  color: "var(--wp--preset--color--accent)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div
              style={{
                color: "var(--wp--preset--color--gray-700)",
                background: "var(--wp--preset--color--gray-50)",
                padding: "0.5rem 0.9rem",
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              Choose which teacher you would like to book with
            </div>
          )}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--wp--preset--color--gray-100)",
              padding: "0.4rem 0.8rem",
              borderRadius: 12,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--wp--preset--color--gray-700)",
            }}
          >
            {event?.teacherIds?.length ?? 0} Teacher
            {(event?.teacherIds?.length ?? 0) !== 1 ? "s" : ""} Available
          </div>

          {hasCredits && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "var(--wp--preset--color--gray-100)",
                padding: "0.4rem 0.8rem",
                borderRadius: 12,
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "var(--wp--preset--color--gray-700)",
              }}
            >
              Credits available
            </div>
          )}
        </div>
        <section>
          <TeacherSelectionRow
            teachers={teachers}
            selectedTeacher={selectedTeacher}
            onTeacherSelect={setSelectedTeacher}
            loading={loadingTeachers}
          />
        </section>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(90vh - 150px)",
          position: "sticky",
        }}
      >
        {/* Teacher Selection Row */}

        {/* Selected Teacher Details */}
        {selectedTeacher && (
          <section
            ref={detailsRef}
            style={{
              flex: 1,
              padding: "1.5rem 2rem 2rem",
              overflowY: "auto",
              background: "var(--wp--preset--color--gray-50)",
            }}
          >
            <div
              style={{
                background: "var(--wp--preset--color--background)",
                borderRadius: 16,
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                padding: "1.25rem 1.25rem 1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h3 style={{ margin: 0 }}>About {selectedTeacher.name}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedTeacher(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--wp--preset--color--accent)",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Change teacher
                </button>
              </div>
              <TeacherDetails teacher={selectedTeacher} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn--book"
                  onClick={() => onBook(hasCredits)}
                  disabled={!selectedTeacher || bookingState === "pending"}
                  style={{
                    border: "none",
                    borderRadius: 50,
                    padding: "12px 22px",
                    fontWeight: 700,
                    cursor: !selectedTeacher ? "not-allowed" : "pointer",
                    background: selectedTeacher
                      ? "var(--wp--preset--color--accent)"
                      : "var(--wp--preset--color--gray-300)",
                    color: selectedTeacher
                      ? "var(--wp--preset--color--background)"
                      : "var(--wp--preset--color--gray-700)",
                    opacity: bookingState === "pending" ? 0.8 : 1,
                    transition: "transform 120ms ease, opacity 120ms ease",
                  }}
                >
                  {bookingState === "pending" ? "Booking…" : "Book Now"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
