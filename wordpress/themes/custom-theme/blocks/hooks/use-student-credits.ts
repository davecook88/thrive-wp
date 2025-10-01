import { useEffect, useState } from "@wordpress/element";
import { thriveClient } from "../../clients/thrive";
import { StudentPackageMyCreditsResponse } from "../../types/packages";

export const useStudentCredits = () => {
  const [packagesResponse, setPackagesResponse] =
    useState<StudentPackageMyCreditsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      setLoading(true);
      const response = await thriveClient.fetchStudentCredits();
      setPackagesResponse(response);
      setLoading(false);
    };
    fetchCredits();
  }, []);

  const totalRemaining = packagesResponse?.totalRemaining ?? 0;

  return { packagesResponse, totalRemaining, loading };
};
