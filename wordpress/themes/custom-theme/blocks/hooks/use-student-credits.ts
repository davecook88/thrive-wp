import { useEffect, useState } from "@wordpress/element";
import { thriveClient } from "../../../../../shared/clients/thrive";
import { StudentPackageMyCreditsResponse } from "../../../../../shared/types/packages";

export const useStudentCredits = () => {
  const [packagesResponse, setPackagesResponse] =
    useState<StudentPackageMyCreditsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    setLoading(true);
    const response = await thriveClient.fetchStudentCredits();
    setPackagesResponse(response);
    setLoading(false);
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const totalRemaining = packagesResponse?.totalRemaining ?? 0;

  return { packagesResponse, totalRemaining, loading, refetch: fetchCredits };
};
