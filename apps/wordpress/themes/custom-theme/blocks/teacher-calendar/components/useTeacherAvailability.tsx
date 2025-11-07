import { AvailabilityException, WeeklyAvailabilityRule } from "@thrive/shared";
import { useState, useCallback, useEffect } from "react";
import { thriveClient } from "../../../../../shared/thrive";

export const useTeacherAvailability = () => {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<WeeklyAvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);

  const loadAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const data = await thriveClient.getTeacherAvailability();

      if (data) {
        const mappedExceptions: AvailabilityException[] = (
          data.exceptions || []
        ).map((e) => ({
          id: e.id,
          date: e.date,
          isBlackout: e.isBlackout,
          startTimeMinutes: undefined,
          endTimeMinutes: undefined,
        }));

        setRules(data.rules || []);
        setExceptions(mappedExceptions);
      } else {
        setRules([]);
        setExceptions([]);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
      setRules([]);
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  return {
    loadAvailability,
    rules,
    loading,
    exceptions,
    setRules,
    setExceptions,
  };
};
