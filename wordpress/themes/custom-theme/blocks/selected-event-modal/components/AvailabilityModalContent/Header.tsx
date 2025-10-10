import { useMemo } from "@wordpress/element";
import { TeacherSelectionRow } from "../../../../components";
import { buildBookingUrl } from "../../../../utils/booking";
import type { Teacher } from "../../../../types/calendar";
import PackageBookingButton from "./PackageBookingButton";
import { useStudentCredits } from "../../../hooks/use-student-credits";

export default function Header({
  event,
  selectedTeacher,
  setSelectedTeacher,
  teachers,
  loadingTeachers,
}: {
  event: any;
  selectedTeacher: Teacher | null;
  setSelectedTeacher: (t: Teacher | null) => void;
  teachers: Teacher[];
  loadingTeachers: boolean;
}) {
  const { packagesResponse, totalRemaining } = useStudentCredits();

  const bookingConfirmationUrl = useMemo(() => {
    if (!selectedTeacher) return null;
    try {
      return buildBookingUrl({
        startUtc: event.startUtc,
        endUtc: event.endUtc,
        teacherId: selectedTeacher.teacherId,
        serviceType: event.type === "availability" ? "PRIVATE" : event.type,
      });
    } catch {
      return null;
    }
  }, [event, selectedTeacher]);

  const hasCredits = useMemo(() => {
    const user = (event as any)?.user || (event as any)?.currentUser || {};
    return (
      (typeof user?.credits === "number" && user.credits > 0) ||
      Boolean(user?.hasPackage) ||
      Boolean((event as any)?.userHasPackage)
    );
  }, [event]);

  return (
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
          {bookingConfirmationUrl && !packagesResponse?.packages?.length && (
            <a
              className="btn btn--book"
              href={bookingConfirmationUrl ?? "#"}
              style={{
                border: "none",
                borderRadius: 50,
                padding: "12px 22px",
                fontWeight: 700,
                textDecoration: "none",
                cursor: !selectedTeacher ? "not-allowed" : "pointer",
                background: selectedTeacher
                  ? "var(--wp--preset--color--accent)"
                  : "var(--wp--preset--color--gray-300)",
                color: selectedTeacher
                  ? "var(--wp--preset--color--background)"
                  : "var(--wp--preset--color--gray-700)",
                opacity: 1,
                transition: "transform 120ms ease, opacity 120ms ease",
              }}
            >
              Book Now
            </a>
          )}
          {packagesResponse?.packages?.length ? (
            <a
              className="btn btn--secondary"
              href="/packages"
              style={{
                border: "none",
                borderRadius: 50,
                padding: "12px 22px",
                fontWeight: 700,
                textDecoration: "none",
                background: "var(--wp--preset--color--gray-100)",
                color: "var(--wp--preset--color--foreground)",
              }}
            >
              Buy a new package
            </a>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1rem",
            gap: 12,
            alignItems: "center",
          }}
        >
          {packagesResponse?.packages?.length ? (
            <div style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>Your Packages</div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    color: "var(--wp--preset--color--gray-700)",
                  }}
                >
                  {totalRemaining} session{totalRemaining !== 1 ? "s" : ""}{" "}
                  remaining
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      borderBottom:
                        "1px solid var(--wp--preset--color--gray-200)",
                    }}
                  >
                    <th style={{ padding: "8px 6px" }}>Package</th>
                    <th style={{ padding: "8px 6px" }}>Remaining</th>
                    <th style={{ padding: "8px 6px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {packagesResponse.packages.map((pkg: any) => (
                    <tr
                      key={pkg.id}
                      style={{
                        borderBottom:
                          "1px solid var(--wp--preset--color--gray-100)",
                      }}
                    >
                      <td style={{ padding: "8px 6px" }}>{pkg.packageName}</td>
                      <td style={{ padding: "8px 6px" }}>
                        {pkg.remainingSessions}/{pkg.totalSessions}
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>
                        {bookingConfirmationUrl ? (
                          <PackageBookingButton
                            pkg={pkg}
                            selectedTeacher={selectedTeacher}
                            event={event}
                            bookingUrl={bookingConfirmationUrl}
                          />
                        ) : (
                          <span
                            style={{
                              color: "var(--wp--preset--color--gray-500)",
                            }}
                          >
                            Select a teacher to book
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

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

        <section>
          <TeacherSelectionRow
            teachers={teachers}
            selectedTeacher={selectedTeacher}
            onTeacherSelect={setSelectedTeacher}
            loading={loadingTeachers}
          />
        </section>
      </div>
    </header>
  );
}
