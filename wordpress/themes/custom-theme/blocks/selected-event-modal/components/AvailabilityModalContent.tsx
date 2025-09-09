import {
  createElement,
  useEffect,
  useMemo,
  useState,
} from "@wordpress/element";
import type { AvailabilityEvent, Teacher } from "../../../types/calendar";

type ModalAvailabilityEvent = AvailabilityEvent & {
  startLocal?: string;
  endLocal?: string;
  user?: any;
  currentUser?: any;
};
import { useGetTeachers } from "../../hooks/get-teachers";
import { useGetCalendarContext } from "../../hooks/get-context";

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

  const onBook = (teacher: Teacher, useCredits = false) => {
    setBookingState("pending");
    try {
      window.dispatchEvent(
        new CustomEvent("thrive-calendar:book", {
          detail: { event, teacher, useCredits },
        })
      );
    } catch (err) {
      if ((teacher as any)?.bookingUrl)
        window.location.href = (teacher as any).bookingUrl;
    }
    setTimeout(() => setBookingState("done"), 600);
  };

  return (
    <div
      className="selected-event-modal__availability"
      style={{
        width: "80vw",
        maxWidth: 1100,
        maxHeight: "80vh",
        overflowY: "auto",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{event?.title || "Available times"}</h2>
          <div style={{ color: "#666", marginTop: 6 }}>
            {event?.startLocal}
            {event?.endLocal ? ` — ${event.endLocal}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#888" }}>Limited spots</div>
          <div style={{ fontWeight: 600, color: "#222" }}>
            {event?.teacherIds?.length ?? 0} teacher
            {(event?.teacherIds?.length ?? 0) !== 1 ? "s" : ""} available
          </div>
        </div>
      </header>

      <section style={{ marginTop: 18 }}>
        <p style={{ color: "#444" }}>
          Choose a teacher below — we’ll reserve the spot when you complete
          booking. Prefer a particular teacher? Select them and continue to the
          booking flow.
        </p>

        <div
          className="availability__grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {loadingTeachers ? (
            <div>Loading teachers…</div>
          ) : teachers.length ? (
            teachers.map((t) => (
              <div
                key={t.teacherId}
                className="teacher-card"
                style={{
                  border: "1px solid #e6e6e6",
                  borderRadius: 8,
                  padding: 12,
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img
                      src={(t as any)?.avatar || ""}
                      alt={t.name}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 999,
                        objectFit: "cover",
                        marginRight: 12,
                        background: "#f2f2f2",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>
                        {t.firstName} {t.lastName}
                      </div>
                    </div>
                  </div>

                  {t.bio && (
                    <p style={{ marginTop: 10, color: "#444", fontSize: 13 }}>
                      {t.bio}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button
                    className="button button-primary"
                    onClick={() => onBook(t, false)}
                    style={{ flex: 1 }}
                    aria-label={`Book with ${t.name}`}
                  >
                    Book now
                  </button>

                  {hasCredits ? (
                    <button
                      className="button button-secondary"
                      onClick={() => onBook(t, true)}
                      style={{ flex: 0 }}
                      aria-label={`Book with credits with ${t.name}`}
                    >
                      Use credits
                    </button>
                  ) : (
                    <button
                      className="button button-secondary"
                      onClick={() =>
                        window.alert(
                          "No credits found — add credits in your account."
                        )
                      }
                      aria-label="No credits"
                    >
                      No credits
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "#666" }}>
              No teachers available for this slot.
            </div>
          )}
        </div>
      </section>

      <footer style={{ marginTop: 18, color: "#666", fontSize: 13 }}>
        <div>
          Quick tip: bookings are first-come, first-served. If you have package
          credits, selecting "Use credits" will attempt to reserve from your
          balance.
        </div>
        {bookingState === "pending" && (
          <div style={{ marginTop: 8, color: "#0a84ff" }}>
            Reserving your spot…
          </div>
        )}
        {bookingState === "done" && (
          <div style={{ marginTop: 8, color: "#0a8f3b" }}>
            Booked — check your email for details.
          </div>
        )}
      </footer>
    </div>
  );
}
