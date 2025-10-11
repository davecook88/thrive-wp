import { useEffect, useState } from "@wordpress/element";
import { ThriveCalendarContextApi } from "../../../../shared/types/calendar";
import { getCalendarContextSafe } from "../../../../shared/types/calendar-utils";

export const useGetCalendarContext = (querySelector: string) => {
  const [cxt, setCxt] = useState<ThriveCalendarContextApi | null>(null);

  useEffect(() => {
    const container = document.querySelector<HTMLElement>(querySelector);
    if (container) {
      const contextApi = getCalendarContextSafe(container);
      setCxt(contextApi);
    }
  }, [querySelector]);

  return cxt;
};
