import type {
  AvailabilityEvent,
  Teacher,
} from "@thrive/shared/calendar";
import { StudentPackage } from "@thrive/shared/types/packages";
import PackageBookingButton from "./PackageBookingButton";

interface User {
  ID: number;
  user_login: string;
  user_email: string;
  display_name: string;
}

interface PackagesFooterProps {
  packages: StudentPackage[];
  selectedTeacher: Teacher | null;
  event: AvailabilityEvent & {
    startLocal?: string;
    endLocal?: string;
    user?: User;
    currentUser?: User;
  };
  bookingConfirmationUrl: string | null;
  totalRemaining: number;
  onBookingSuccess: () => Promise<void>;
}

export default function PackagesFooter({
  packages,
  selectedTeacher,
  event,
  bookingConfirmationUrl,
  totalRemaining,
  onBookingSuccess,
}: PackagesFooterProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--wp--preset--color--background)",
        borderTop: "1px solid var(--wp--preset--color--gray-200)",
        padding: "1rem 2rem",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <h4
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "var(--wp--preset--color--foreground)",
            }}
          >
            Your Packages
          </h4>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  background: "var(--wp--preset--color--gray-50)",
                  borderRadius: 6,
                  padding: "0.5rem 0.75rem",
                  border: "1px solid var(--wp--preset--color--gray-200)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--wp--preset--color--foreground)",
                    }}
                  >
                    {pkg.packageName}
                  </div>
                  <div
                    style={{
                      color: "var(--wp--preset--color--gray-600)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {pkg.remainingSessions}/{pkg.totalSessions} left
                  </div>
                </div>
                {selectedTeacher && (
                  <PackageBookingButton
                    pkg={pkg}
                    selectedTeacher={selectedTeacher}
                    event={event}
                    bookingUrl={bookingConfirmationUrl}
                    onBookingSuccess={onBookingSuccess}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "var(--wp--preset--color--accent, #f97316)",
            color: "white",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              opacity: 0.95,
              fontWeight: 600,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {totalRemaining}
            </span>{" "}
            session{totalRemaining !== 1 ? "s" : ""} remaining
          </div>
          <a
            href={bookingConfirmationUrl || undefined}
            style={{
              display: "inline-block",
              marginTop: "0.5rem",
              padding: "0.3rem 0.6rem",
              background: "white",
              borderRadius: 4,
              color: "var(--wp--preset--color--accent, #f97316)",
              fontWeight: 600,
              fontSize: "0.75rem",
              textDecoration: "none",
            }}
          >
            Buy More
          </a>
        </div>
      </div>
    </div>
  );
}
