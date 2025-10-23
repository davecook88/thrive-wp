import { useEffect, useState } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import type { PackageResponseDto, ServiceType } from "@thrive/shared";

interface PackageSelectionProps {
  showCredits?: boolean;
  showExpiry?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  noPackagesMessage?: string;
  initialPackageId?: string;
  initialPriceId?: string;
  sessionId?: string;
  serviceType?: ServiceType;
}

export default function PackageSelection({
  showCredits = true,
  showExpiry = true,
  loadingMessage = "Loading available packages...",
  errorMessage = "Unable to load packages at this time. Please refresh and try again.",
  noPackagesMessage = "No packages are currently available.",
  initialPackageId,
  initialPriceId,
  sessionId,
  serviceType,
}: PackageSelectionProps) {
  const [packages, setPackages] = useState<PackageResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<{
    id: string;
    priceId: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        console.log("Fetching packages for session:", sessionId);
        const data = await thriveClient.fetchAvailablePackages(
          sessionId,
          serviceType,
        );
        setPackages(data);

        // Set initial selection if provided
        if (initialPackageId || initialPriceId) {
          const initialPkg = data.find(
            (pkg) =>
              pkg.id.toString() === initialPackageId ||
              pkg.stripe.priceId === initialPriceId,
          );
          if (initialPkg) {
            const selection = {
              id: initialPkg.id.toString(),
              priceId: initialPkg.stripe.priceId,
              name: initialPkg.name,
            };
            setSelectedPackage(selection);
            // Dispatch event for checkout-context or other consumers
            document.dispatchEvent(
              new CustomEvent("custom-theme:packageSelected", {
                detail: selection,
              }),
            );
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchPackages();
  }, [sessionId, initialPackageId, initialPriceId]);

  const formatPrice = (amountMinor: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountMinor / 100);
  };

  const handlePackageClick = (pkg: PackageResponseDto) => {
    const selection = {
      id: pkg.id.toString(),
      priceId: pkg.stripe.priceId,
      name: pkg.name,
    };
    setSelectedPackage(selection);

    // Dispatch custom event for payment component and any consumers
    document.dispatchEvent(
      new CustomEvent("custom-theme:packageSelected", { detail: selection }),
    );
  };

  if (loading) {
    return (
      <div className="package-selection-container loading">
        <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
          {loadingMessage}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="package-selection-container error">
        <div style={{ textAlign: "center", padding: "20px", color: "#dc2626" }}>
          {errorMessage}
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="package-selection-container empty">
        <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
          {noPackagesMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="package-selection-container">
      <style>{`
        .package-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s;
          background: #fff;
        }

        .package-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .package-card.selected {
          border-color: #3b82f6;
          background: #f0f9ff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .package-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .package-name {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .package-price {
          font-size: 20px;
          font-weight: 700;
          color: #059669;
        }

        .package-description {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 8px;
          font-style: italic;
        }

        .package-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 14px;
          color: #6b7280;
        }

        .package-detail {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .package-detail-label {
          font-weight: 500;
        }

        .package-allowances {
          grid-column: 1 / -1;
        }

        .package-allowances-label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
        }

        .allowance-badge {
          display: inline-block;
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 6px;
          margin-bottom: 4px;
        }
      `}</style>

      <div id="packages-container">
        {packages.map((pkg) => {
          const isSelected =
            selectedPackage?.id === pkg.id.toString() ||
            selectedPackage?.priceId === pkg.stripe.priceId;

          return (
            <div
              key={pkg.id}
              className={`package-card ${isSelected ? "selected" : ""}`}
              onClick={() => handlePackageClick(pkg)}
            >
              <div className="package-header">
                <div className="package-name">{pkg.name}</div>
                <div className="package-price">
                  {formatPrice(pkg.stripe.unitAmount, pkg.stripe.currency)}
                </div>
              </div>

              {pkg.bundleDescription && (
                <div className="package-description">
                  {pkg.bundleDescription}
                </div>
              )}

              <div className="package-details">
                {showCredits && pkg.allowances && pkg.allowances.length > 0 && (
                  <div className="package-detail package-allowances">
                    <span className="package-allowances-label">Includes:</span>
                    <div>
                      {pkg.allowances.map((allowance, idx) => (
                        <span key={idx} className="allowance-badge">
                          {allowance.credits} {allowance.serviceType} (
                          {allowance.creditUnitMinutes}min)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {showExpiry && pkg.expiresInDays && (
                  <div className="package-detail">
                    <span className="package-detail-label">Expires:</span>
                    <span>{pkg.expiresInDays} days</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
