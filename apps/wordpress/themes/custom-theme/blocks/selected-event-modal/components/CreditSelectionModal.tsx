import { useState } from "@wordpress/element";
import type {
  CompatibleCreditsResponse,
  CompatiblePackage,
  HigherTierPackage,
} from "../../hooks/use-compatible-credits";

interface CreditSelectionModalProps {
  compatible: CompatibleCreditsResponse;
  sessionDuration: number; // in minutes
  onSelectPackage: (
    packageId: number,
    allowanceId: number,
    requiresConfirmation: boolean,
  ) => void;
  onPayWithoutCredits: () => void;
  onCancel: () => void;
}

export default function CreditSelectionModal({
  compatible,
  sessionDuration,
  onSelectPackage,
  onPayWithoutCredits,
  onCancel,
}: CreditSelectionModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Use composite key: "packageId-allowanceId" to uniquely identify each option
  const getOptionKey = (pkg: CompatiblePackage) =>
    `${pkg.id}-${pkg.allowanceId}`;

  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (compatible.recommended) {
      const recommendedPkg = [
        ...compatible.exactMatch,
        ...compatible.higherTier,
      ].find((pkg) => pkg.id === compatible.recommended);
      return recommendedPkg ? getOptionKey(recommendedPkg) : null;
    }
    return compatible.exactMatch.length > 0
      ? getOptionKey(compatible.exactMatch[0])
      : null;
  });

  const hasExactMatch = compatible.exactMatch.length > 0;
  const hasHigherTier = compatible.higherTier.length > 0;

  const selectedPackage = [
    ...compatible.exactMatch,
    ...compatible.higherTier,
  ].find((pkg) => getOptionKey(pkg) === selectedKey);

  const isHigherTier =
    selectedKey !== null &&
    compatible.higherTier.some((pkg) => getOptionKey(pkg) === selectedKey);

  function handleConfirm() {
    if (!selectedKey || !selectedPackage) return;
    onSelectPackage(
      selectedPackage.id,
      selectedPackage.allowanceId,
      isHigherTier,
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "20px",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            Select Payment Method
          </h3>
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            Choose which credit package to use for this booking
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Exact Match Section */}
          {hasExactMatch && (
            <div style={{ marginBottom: "20px" }}>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Recommended
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {compatible.exactMatch.map((pkg) => (
                  <PackageOption
                    key={getOptionKey(pkg)}
                    package={pkg}
                    sessionDuration={sessionDuration}
                    isSelected={selectedKey === getOptionKey(pkg)}
                    isRecommended={pkg.id === compatible.recommended}
                    onSelect={() => setSelectedKey(getOptionKey(pkg))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Higher Tier Section */}
          {hasHigherTier && (
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: showAdvanced ? "12px" : 0,
                }}
              >
                <span>
                  {hasExactMatch
                    ? "Use a Different Credit Type"
                    : "Available Credits"}
                </span>
                <span style={{ fontSize: "18px" }}>
                  {showAdvanced ? "▼" : "▶"}
                </span>
              </button>

              {showAdvanced && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  {compatible.higherTier.map((pkg) => (
                    <PackageOption
                      key={getOptionKey(pkg)}
                      package={pkg}
                      sessionDuration={sessionDuration}
                      isSelected={selectedKey === getOptionKey(pkg)}
                      isRecommended={
                        !hasExactMatch && pkg.id === compatible.recommended
                      }
                      onSelect={() => setSelectedKey(getOptionKey(pkg))}
                      warningMessage={pkg.warningMessage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No credits available */}
          {!hasExactMatch && !hasHigherTier && (
            <div
              style={{
                padding: "20px",
                backgroundColor: "#fef2f2",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0, color: "#991b1b", fontSize: "14px" }}>
                You don't have any compatible credits for this session.
                <br />
                Please purchase a package to continue.
              </p>
            </div>
          )}

          {/* Pay without credits option (only show if credits exist) */}
          {(hasExactMatch || hasHigherTier) && (
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "20px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Other Options
                </h4>
                <button
                  onClick={onPayWithoutCredits}
                  style={{
                    width: "100%",
                    padding: "16px",
                    backgroundColor: "#f9fafb",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#374151",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                    e.currentTarget.style.borderColor = "#d1d5db";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                      💳 Pay with a new package
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      Purchase and use a new package for this booking
                    </div>
                  </div>
                  <span style={{ fontSize: "18px", color: "#9ca3af" }}>→</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedKey}
            style={{
              padding: "10px 20px",
              backgroundColor: selectedKey ? "#3b82f6" : "#d1d5db",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              color: "white",
              cursor: selectedKey ? "pointer" : "not-allowed",
            }}
          >
            {isHigherTier ? "Confirm & Book" : "Book Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PackageOptionProps {
  package: CompatiblePackage | HigherTierPackage;
  sessionDuration: number;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
  warningMessage?: string;
}

function PackageOption({
  package: pkg,
  sessionDuration,
  isSelected,
  isRecommended,
  onSelect,
  warningMessage,
}: PackageOptionProps) {
  const creditsNeeded = Math.ceil(sessionDuration / pkg.creditUnitMinutes);
  const hasMismatch = sessionDuration !== pkg.creditUnitMinutes;

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "16px",
        border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
        borderRadius: "8px",
        cursor: "pointer",
        backgroundColor: isSelected ? "#eff6ff" : "white",
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "8px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              {pkg.packageName} - {pkg.label}
            </span>
            {isRecommended && (
              <span
                style={{
                  padding: "2px 8px",
                  backgroundColor: "#10b981",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  textTransform: "uppercase",
                }}
              >
                Recommended
              </span>
            )}
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
            {pkg.remainingSessions} credit
            {pkg.remainingSessions !== 1 ? "s" : ""} remaining •{" "}
            {pkg.creditUnitMinutes} min each
          </div>
          {pkg.expiresAt && (
            <div
              style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}
            >
              Expires:{" "}
              {new Date(pkg.expiresAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
        </div>
      </div>

      {/* Warning for cross-tier */}
      {warningMessage && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 12px",
            backgroundColor: "#fef3c7",
            borderRadius: "4px",
            fontSize: "13px",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>⚠️</span>
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Duration mismatch warning */}
      {hasMismatch && !warningMessage && (
        <div
          style={{
            marginTop: "8px",
            padding: "8px 12px",
            backgroundColor: "#f0f9ff",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#075985",
          }}
        >
          ℹ️ This session is {sessionDuration} minutes. Using {creditsNeeded}{" "}
          credit{creditsNeeded !== 1 ? "s" : ""} (
          {creditsNeeded * pkg.creditUnitMinutes} min total).
        </div>
      )}
    </div>
  );
}
