import type { AvailabilityEvent } from "@thrive/shared/calendar";
import type {
  StudentPackage,
  PackageAllowance,
} from "@thrive/shared/types/packages";
import PackageBookingButton from "./PackageBookingButton";
import Footer from "./Footer";
import { PublicTeacherDto } from "@thrive/shared";

interface User {
  ID: number;
  user_login: string;
  user_email: string;
  display_name: string;
}

interface PackageBalance {
  serviceType: string;
  teacherTier: number;
  creditUnitMinutes: number;
  totalCredits: number;
  remainingCredits: number;
}

interface StudentPackageExtended extends StudentPackage {
  allowances?: PackageAllowance[];
  balances?: PackageBalance[];
}

interface PackagesFooterProps {
  packages: StudentPackageExtended[];
  selectedTeacher: PublicTeacherDto | null;
  event: AvailabilityEvent & {
    startLocal?: string;
    endLocal?: string;
    user?: User;
    currentUser?: User;
    serviceType?: string;
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
  const right = (
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
  );

  return (
    <Footer right={right}>
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
        {packages.flatMap((pkg) => {
          // Get allowances for this package
          const allowances = (pkg as any).stripeProductMap?.allowances || [];

          // Filter to only show PRIVATE allowances for availability booking
          const privateAllowances = allowances.filter(
            (allowance: any) => allowance.serviceType === "PRIVATE"
          );

          // If no private allowances, skip this package
          if (privateAllowances.length === 0) {
            return [];
          }

          // Map each allowance to a booking option
          return privateAllowances.map((allowance: any) => {
            // Compute remaining credits for this specific allowance
            const uses = pkg.uses || [];
            const allowanceUses = uses.filter(
              (use: any) => use.allowanceId === allowance.id
            );
            const totalUsed = allowanceUses.reduce(
              (sum: number, use: any) => sum + (use.creditsUsed || 1),
              0
            );
            const remainingCredits = Math.max(0, allowance.credits - totalUsed);

            // Skip if no credits remaining
            if (remainingCredits <= 0) {
              return null;
            }

            const packageName = (pkg.metadata?.name as string) || (pkg as any).stripeProductMap?.metadata?.name || "Package";
            const allowanceLabel = allowance.teacherTier > 0
              ? "Premium Private Credit"
              : "Private Credit";

            return (
              <div
                key={`${pkg.id}-${allowance.id}`}
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
                    {packageName} - {allowanceLabel}
                  </div>
                  <div
                    style={{
                      color: "var(--wp--preset--color--gray-600)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {remainingCredits}/{allowance.credits} credits remaining • {allowance.creditUnitMinutes}min
                  </div>
                </div>
                {selectedTeacher && (
                  <PackageBookingButton
                    pkg={pkg}
                    allowance={allowance}
                    selectedTeacher={selectedTeacher}
                    event={event}
                    bookingUrl={bookingConfirmationUrl}
                    onBookingSuccess={onBookingSuccess}
                  />
                )}
              </div>
            );
          }).filter(Boolean);
        })}
      </div>
    </Footer>
  );
}
