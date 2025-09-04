import { useEffect, useState } from "@wordpress/element";
import { Button } from "@wordpress/components";

import type { CalendarEvent, Teacher } from "../../../types/calendar";
import { useGetCalendarContext } from "../../hooks/get-context";
import { useGetTeachers } from "../../hooks/get-teachers";

interface TeacherPickerProps {
  heading: string;
  showFilters: boolean;
  querySelector: string;
}

export default function TeacherPicker({
  heading,
  showFilters,
  querySelector,
}: TeacherPickerProps) {
  console.log("TeacherPicker context:", querySelector);
  const context = useGetCalendarContext(querySelector);

  const { teachers, loading, selectTeacherId, selectedTeachers } =
    useGetTeachers(context);
  const handleTeacherSelect = (teacher: Teacher) => {
    selectTeacherId(teacher.userId);
  };

  const getInitials = (teacher: Teacher) => {
    return (teacher.firstName || teacher.name || "T").slice(0, 1).toUpperCase();
  };

  // Register callback for date range changes
  useEffect(() => {
    if (!context) {
      console.warn("Teacher Availability: API not available");
      return;
    }

    console.log("Teacher Availability: Registering date range change callback");

    const handleDateRangeChange = async (start: Date, end: Date) => {
      console.log(
        "Teacher Availability: Date range change callback called",
        start,
        end
      );
      try {
        // Fetch availability preview for the new date range
        const _events = await context.thriveClient.fetchAvailabilityPublic({
          start,
          end,
          teacherIds: selectedTeachers.map((t) => t.userId),
        });

        console.log(
          "Teacher Availability: Fetched events",
          _events.length,
          _events
        );

        const events: CalendarEvent[] = _events.flatMap((w) => {
          const start = new Date(w.startUtc);
          const end = new Date(w.endUtc);
          const chunks: CalendarEvent[] = [];
          let current = new Date(start);
          while (current < end) {
            const chunkEnd = new Date(current.getTime() + 30 * 60 * 1000); // 30 minutes
            if (chunkEnd > end) {
              chunkEnd.setTime(end.getTime());
            }
            chunks.push({
              id: `avail:${current.toISOString()}|${chunkEnd.toISOString()}`,
              title: "Available",
              startUtc: current.toISOString(),
              endUtc: chunkEnd.toISOString(),
              type: "availability" as const,
            });
            current = new Date(chunkEnd);
          }
          return chunks;
        });

        console.log(
          "Teacher Availability: Updating events",
          events.length,
          events
        );

        return events;
      } catch (error) {
        console.warn(
          "Failed to update availability preview on date range change",
          error
        );
        return [];
      }
    };

    // Register the callback
    context.registerDateRangeChangeCallback(handleDateRangeChange);

    // Cleanup: unregister the callback when component unmounts
    return () => {
      console.log(
        "Teacher Availability: Unregistering date range change callback"
      );
      context.unregisterDateRangeChangeCallback(handleDateRangeChange);
    };
  }, [context, selectedTeachers]); // Depend on api

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div>Loading teachers...</div>
      </div>
    );
  }

  return (
    <div className="thrive-teacher-picker__wrap">
      <h3 style={{ margin: "0 0 8px 0" }}>{heading}</h3>

      {showFilters && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <Button variant="primary">Private</Button>
          <Button variant="secondary" disabled>
            Group
          </Button>
          <Button variant="secondary" disabled>
            Semi-Private
          </Button>
        </div>
      )}

      {!teachers.length ? (
        <div
          style={{
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          No teachers available yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          {teachers.map((teacher) => (
            <button
              key={teacher.userId}
              type="button"
              onClick={() => handleTeacherSelect(teacher)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: selectedTeachers.some(
                  (t) => t.userId === teacher.userId
                )
                  ? "#f3f4f6"
                  : "white",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedTeachers.some(
                  (t) => t.userId === teacher.userId
                )
                  ? "#f3f4f6"
                  : "white";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#374151",
                  fontWeight: "700",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {getInitials(teacher)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    marginBottom: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {teacher.name ||
                    `${teacher.firstName} ${teacher.lastName}`.trim()}
                </div>
                {teacher.bio && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {teacher.bio}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
