import { Teacher, ThriveCalendarContextApi } from "../../types/calendar";
import { useEffect, useMemo, useState } from "@wordpress/element";

export const useGetTeachers = (context: ThriveCalendarContextApi | null) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);

  useEffect(() => {
    if (!context) return;
    const fetchTeachers = async () => {
      const data = await context.thriveClient.fetchTeachers();
      setTeachers(data);
      setLoading(false);
    };
    fetchTeachers();
  }, [context]);

  const selectedTeachers = useMemo(() => {
    if (!selectedTeacherIds.length) return teachers;
    return teachers.filter((teacher) =>
      selectedTeacherIds.includes(teacher.teacherId)
    );
  }, [teachers, selectedTeacherIds]);

  const selectTeacherId = (teacherId: number) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  return { teachers, loading, selectedTeachers, selectTeacherId };
};
