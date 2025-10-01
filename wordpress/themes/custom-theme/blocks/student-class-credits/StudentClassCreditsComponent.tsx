import React from "react";
import { useStudentCredits } from "../hooks/use-student-credits";

/**
 * StudentClassCreditsComponent
 *
 * A small React component to display a student's outstanding class credits.
 * This is a boilerplate intended for the WordPress block in the theme.
 *
 * Contract:
 * - Props:
 *   - credits?: number | null  // outstanding credits (optional, may be loaded async)
 *   - loading?: boolean        // true when credits are being fetched
 *   - className?: string       // optional wrapper class
 * - Output: Rendered markup showing credits or a friendly fallback
 * - Error modes: If credits are null and not loading, shows "—" placeholder
 *
 * Notes:
 * - Integrate with WordPress PHP render or client-side fetch as needed.
 * - Keep presentation logic here; data fetching can be done by parent or via
 *   a small useEffect hook that calls a REST endpoint (not implemented).
 */

export type StudentClassCreditsProps = {
  credits?: number | null;
  loading?: boolean;
  className?: string;
};

export const StudentClassCreditsComponent: React.FC<
  StudentClassCreditsProps
> = ({ credits = null, loading = false, className = "" }) => {
  const creditLabel = (n: number) => `${n} credit${n === 1 ? "" : "s"}`;
  const {
    packagesResponse,
    totalRemaining,
    loading: fetching,
  } = useStudentCredits();

  return (
    <div className={`student-class-credits ${className}`.trim()}>
      {fetching ? (
        <span className="student-class-credits__loading">Loading credits…</span>
      ) : (
        <span className="student-class-credits__value">
          {totalRemaining > 0 ? creditLabel(totalRemaining) : "—"}
        </span>
      )}
    </div>
  );
};

export default StudentClassCreditsComponent;
