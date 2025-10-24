import { useEffect, useState } from "react";
import type {
  PackageAllowance,
  StudentPackageMyCreditsResponse,
} from "@thrive/shared/types/packages";
import { thriveClient } from "../../../../shared/thrive";

interface StudentPackageDetailsProps {
  viewMode?: "compact" | "detailed";
  showExpired?: boolean;
}

export default function StudentPackageDetails({
  viewMode = "detailed",
  showExpired = false,
}: StudentPackageDetailsProps) {
  const [packagesData, setPackagesData] =
    useState<StudentPackageMyCreditsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await thriveClient.fetchStudentCredits();

        setPackagesData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchPackages();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(expiresAt).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const formatServiceType = (serviceType: string) => {
    return serviceType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatTierDisplay = (tier: number) => {
    const tierNames: Record<number, string> = {
      1: "Tier 1",
      2: "Tier 2",
      3: "Tier 3",
      4: "Tier 4",
    };
    return tierNames[tier] || `Tier ${tier}`;
  };

  if (loading) {
    return (
      <div className="student-package-details loading">
        <p>Loading packages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-package-details error">
        <p>Error loading packages: {error}</p>
      </div>
    );
  }

  if (!packagesData || packagesData.packages.length === 0) {
    return (
      <div className="student-package-details empty">
        <p>No active packages found.</p>
        <a href="/booking" className="button">
          Purchase a Package
        </a>
      </div>
    );
  }

  const filteredPackages = showExpired
    ? packagesData.packages
    : packagesData.packages.filter((pkg) => !isExpired(pkg.expiresAt));

  console.log("Filtered Packages:", filteredPackages);

  return (
    <div className={`student-package-details ${viewMode}-view`}>
      <div className="package-summary">
        <h3>Your Packages</h3>
        <div className="total-credits">
          <strong>{packagesData.totalRemaining}</strong> credits remaining
        </div>
      </div>

      <div className="packages-list">
        {filteredPackages.map((pkg) => {
          const expired = isExpired(pkg.expiresAt);
          const expiringSoon = isExpiringSoon(pkg.expiresAt);

          return (
            <div
              key={pkg.id}
              className={`package-card ${expired ? "expired" : ""} ${
                expiringSoon ? "expiring-soon" : ""
              }`}
            >
              <div className="package-header">
                <h4 className="package-name">{pkg.packageName}</h4>
              </div>

              {/* Display credits breakdown for bundle packages */}
              {pkg.allowances && pkg.allowances.length > 0 ? (
                <div className="package-balances">
                  <div className="balances-list">
                    {pkg.allowances.map(
                      (allowance: PackageAllowance, idx: number) => {
                        const usedCredits =
                          allowance.credits - (allowance.remainingCredits ?? 0);
                        const balanceProgress =
                          (usedCredits / allowance.credits) * 100;
                        return (
                          <div key={idx} className="balance-item">
                            <div className="balance-header">
                              <div className="balance-type-info">
                                <span className="balance-type">
                                  {formatServiceType(allowance.serviceType)}
                                </span>
                                <span className="balance-tier">
                                  {formatTierDisplay(allowance.teacherTier)}
                                </span>
                              </div>
                              <span className="balance-duration">
                                {allowance.creditUnitMinutes} min
                              </span>
                            </div>
                            <div className="balance-progress">
                              <div className="progress-bar-container">
                                <div
                                  className="progress-bar"
                                  style={{ width: `${balanceProgress}%` }}
                                ></div>
                              </div>
                              <div className="balance-count">
                                <span className="remaining">
                                  {allowance.remainingCredits}
                                </span>
                                <span className="separator">/</span>
                                <span className="total">
                                  {allowance.credits}
                                </span>
                                <span className="unit">remaining</span>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : (
                <div className="package-progress">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${((pkg.totalSessions - pkg.remainingSessions) / pkg.totalSessions) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {pkg.remainingSessions} of {pkg.totalSessions} sessions
                    remaining
                  </div>
                </div>
              )}

              {viewMode === "detailed" && (
                <div className="package-details">
                  <div className="detail-row">
                    <span className="label">Purchased:</span>
                    <span className="value">{formatDate(pkg.purchasedAt)}</span>
                  </div>
                  {pkg.expiresAt && (
                    <div className="detail-row">
                      <span className="label">Expires:</span>
                      <span
                        className={`value ${expiringSoon ? "warning" : ""}`}
                      >
                        {formatDate(pkg.expiresAt)}
                        {expiringSoon && " (Soon!)"}
                        {expired && " (Expired)"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
