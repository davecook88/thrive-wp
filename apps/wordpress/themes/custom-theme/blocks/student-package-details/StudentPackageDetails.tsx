import { useEffect, useState } from "react";
import type { StudentPackage } from "@thrive/shared/types/packages";

interface PackageBalance {
  serviceType: string;
  teacherTier: number;
  creditUnitMinutes: number;
  totalCredits: number;
  remainingCredits: number;
}

interface StudentPackageWithBalances extends StudentPackage {
  allowances?: Array<{
    serviceType: string;
    teacherTier: number;
    credits: number;
    creditUnitMinutes: number;
  }>;
  balances?: PackageBalance[];
}

interface PackagesData {
  packages: StudentPackageWithBalances[];
  totalRemaining: number;
}

interface StudentPackageDetailsProps {
  viewMode?: "compact" | "detailed";
  showExpired?: boolean;
}

export default function StudentPackageDetails({
  viewMode = "detailed",
  showExpired = false,
}: StudentPackageDetailsProps) {
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch("/api/packages/my-credits", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch packages");
        }

        const data = await response.json();
        setPackagesData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
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
          const usedSessions = pkg.totalSessions - pkg.remainingSessions;
          const progressPercent = (usedSessions / pkg.totalSessions) * 100;
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

              {/* Display balances breakdown for bundle packages */}
              {pkg.balances && pkg.balances.length > 0 ? (
                <div className="package-balances">
                  {pkg.balances.map((balance: PackageBalance, idx: number) => {
                    const usedCredits =
                      balance.totalCredits - balance.remainingCredits;
                    const balanceProgress =
                      (usedCredits / balance.totalCredits) * 100;
                    return (
                      <div key={idx} className="balance-item">
                        <div className="balance-header">
                          <span className="balance-type">
                            {balance.serviceType} ({balance.creditUnitMinutes}
                            min)
                          </span>
                          <span className="balance-count">
                            {balance.remainingCredits} of {balance.totalCredits}{" "}
                            remaining
                          </span>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar"
                            style={{ width: `${balanceProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="package-progress">
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${progressPercent}%` }}
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

      <div className="package-actions">
        <a href="/booking" className="button">
          Book a Session
        </a>
        <a href="/packages" className="button secondary">
          Buy More Credits
        </a>
      </div>
    </div>
  );
}
