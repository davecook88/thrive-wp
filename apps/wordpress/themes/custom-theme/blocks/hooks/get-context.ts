import { useEffect, useState } from "@wordpress/element";
import type { ThriveCalendarContextApi } from "../teacher-picker/components/types";

/**
 * Hook to get calendar context from a DOM element via querySelector
 */
export function useGetCalendarContext(
  querySelector: string
): ThriveCalendarContextApi | null {
  const [context, setContext] = useState<ThriveCalendarContextApi | null>(null);

  useEffect(() => {
    const findContext = () => {
      const element = document.querySelector(querySelector);
      if (!element) {
        console.warn(`Calendar context element not found: ${querySelector}`);
        return null;
      }

      // Check if element has the calendar context API
      if ("getCalendarContext" in element && typeof element.getCalendarContext === "function") {
        try {
          return (element as any).getCalendarContext();
        } catch (error) {
          console.error("Error getting calendar context:", error);
          return null;
        }
      }

      console.warn(`Element found but does not have getCalendarContext method: ${querySelector}`);
      return null;
    };

    // Try to get context immediately
    const ctx = findContext();
    if (ctx) {
      setContext(ctx);
      return;
    }

    // If not found, set up observer to wait for element
    const observer = new MutationObserver(() => {
      const ctx = findContext();
      if (ctx) {
        setContext(ctx);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [querySelector]);

  return context;
}
