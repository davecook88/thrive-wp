import { useEffect, useState } from "@wordpress/element";
import type { AvailabilityEvent } from "../../types/calendar";
import { thriveClient } from "../../clients/thrive";

interface UseAvailabilitySlotsOptions {
  start: Date | null;
  end: Date | null;
  selectedTeacherIds: number[];
  sessionDuration: number;
  slotDuration: number;
}

export const useAvailabilitySlots = ({
  start,
  end,
  selectedTeacherIds,
  sessionDuration,
  slotDuration,
}: UseAvailabilitySlotsOptions) => {
  const [availabilitySlots, setAvailabilitySlots] = useState<
    AvailabilityEvent[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!start || !end || selectedTeacherIds.length === 0 || end < new Date()) {
      setAvailabilitySlots([]);
      return;
    }

    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);

      try {
        const avail = await thriveClient.fetchAvailabilityPublic({
          start,
          end,
          teacherIds: selectedTeacherIds.length
            ? selectedTeacherIds
            : undefined,
        });

        // Chunk windows into session-sized availability events
        const sessionMinutes = sessionDuration;
        const chunks: AvailabilityEvent[] = avail.flatMap((w) => {
          const winStart = new Date(w.startUtc);
          const winEnd = new Date(w.endUtc);
          const out: AvailabilityEvent[] = [];
          let current = new Date(winStart);

          while (current < winEnd) {
            const sessionEnd = new Date(
              current.getTime() + sessionMinutes * 60 * 1000
            );

            if (sessionEnd <= winEnd) {
              out.push({
                id: `avail:${current.toISOString()}|${sessionEnd.toISOString()}`,
                title: "Available",
                startUtc: current.toISOString(),
                endUtc: sessionEnd.toISOString(),
                type: "availability",
                teacherIds: w.teacherIds,
              });
            }

            current = new Date(
              current.getTime() + Math.max(5, slotDuration || 30) * 60 * 1000
            );
          }
          return out;
        });

        // Filter chunks in the past
        const now = new Date();
        const futureChunks = chunks.filter((e) => new Date(e.endUtc) >= now);
        setAvailabilitySlots(futureChunks);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch availability"
        );
        setAvailabilitySlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [start, end, selectedTeacherIds, sessionDuration, slotDuration]);

  return { availabilitySlots, loading, error };
};
