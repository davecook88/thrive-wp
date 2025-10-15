export type StudentPackageMyCreditsResponse = {
  packages: StudentPackage[];
  totalRemaining: 4;
};
export type StudentPackage = {
  id: number;
  packageName: string;
  totalSessions: number;
  remainingSessions: number;
  purchasedAt: string; // ISO date string
  expiresAt: string | null; // ISO date string or null
};
