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
  const { packagesResponse, totalRemaining, refetch: refetchCredits } =
    useStudentCredits();

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
        background: "var(--wp--preset--color--background)",
        flexShrink: 0,
      }}
    >
      {/* Session Time Header */}
      <div
        style={{
          padding: "1.5rem 2rem",
          background: "var(--wp--preset--color--accent, #f97316)",
          color: "white",
        }}
      >
        <div
          style={{
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            fontWeight: 600,
            fontSize: "0.75rem",
            opacity: 0.95,
            marginBottom: "0.5rem",
          }}
        >
          Session
        </div>
        <div
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {event?.startLocal}
          {event?.endLocal ? ` — ${event.endLocal}` : ""}
        </div>
      </div>
      {/* Packages Section */}
      {packagesResponse?.packages?.length ? (
        <div
          style={{
            padding: "2rem",
            background: "var(--wp--preset--color--background)",
            borderBottom: "1px solid var(--wp--preset--color--gray-200)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "2rem",
              alignItems: "start",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--wp--preset--color--foreground)",
                  marginBottom: "1rem",
                }}
              >
                Your Packages
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {packagesResponse.packages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    style={{
                      background: "var(--wp--preset--color--gray-50)",
                      borderRadius: 8,
                      padding: "1rem 1.25rem",
                      border: "1px solid var(--wp--preset--color--gray-200)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          marginBottom: "0.25rem",
                          color: "var(--wp--preset--color--foreground)",
                        }}
                      >
                        {pkg.packageName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--wp--preset--color--gray-600)",
                        }}
                      >
                        {pkg.remainingSessions} of {pkg.totalSessions} sessions remaining
                      </div>
                    </div>
                    <div>
                      {selectedTeacher ? (
                        <PackageBookingButton
                          pkg={pkg}
                          selectedTeacher={selectedTeacher}
                          event={event}
                          bookingUrl={bookingConfirmationUrl}
                          onBookingSuccess={refetchCredits}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--wp--preset--color--gray-500)",
                            fontStyle: "italic",
                          }}
                        >
                          Select a teacher →
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "var(--wp--preset--color--accent, #f97316)",
                color: "white",
                padding: "1.5rem",
                borderRadius: 8,
                textAlign: "center",
                minWidth: 200,
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  marginBottom: "0.5rem",
                }}
              >
                {totalRemaining}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  opacity: 0.95,
                  fontWeight: 600,
                }}
              >
                session{totalRemaining !== 1 ? "s" : ""} remaining
              </div>
              <a
                href="/packages"
                style={{
                  display: "inline-block",
                  marginTop: "1rem",
                  padding: "0.6rem 1rem",
                  background: "white",
                  borderRadius: 6,
                  color: "var(--wp--preset--color--accent, #f97316)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  textDecoration: "none",
                }}
              >
                Buy More
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* Teacher Selection Section */}
      <div
        style={{
          padding: "2rem",
          background: "var(--wp--preset--color--background)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: "var(--wp--preset--color--foreground)",
          }}
        >
          Choose which teacher you would like to book with
        </h3>
        <div
          style={{
            fontSize: "0.9rem",
            color: "var(--wp--preset--color--gray-600)",
            marginBottom: selectedTeacher ? "1rem" : "1.5rem",
          }}
        >
          {event?.teacherIds?.length ?? 0} teacher
          {(event?.teacherIds?.length ?? 0) !== 1 ? "s" : ""} available for this time
          slot
        </div>

        {selectedTeacher && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "var(--wp--preset--color--accent, #f97316)",
              color: "white",
              padding: "0.6rem 1rem",
              borderRadius: 8,
              marginBottom: "1.5rem",
            }}
            aria-live="polite"
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                fontWeight: 700,
              }}
            >
              {selectedTeacher?.name?.[0] ?? "T"}
            </span>
            <span style={{ fontWeight: 600 }}>Selected: {selectedTeacher?.name}</span>
            <button
              type="button"
              onClick={() => setSelectedTeacher(null)}
              style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
                padding: "0.3rem 0.75rem",
                borderRadius: 6,
                fontSize: "0.85rem",
              }}
            >
              Change
            </button>
          </div>
        )}

        <TeacherSelectionRow
          teachers={teachers}
          selectedTeacher={selectedTeacher}
          onTeacherSelect={setSelectedTeacher}
          loading={loadingTeachers}
        />
      </div>
    </header>
  );
}
