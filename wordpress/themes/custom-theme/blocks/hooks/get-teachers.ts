import { Teacher, ThriveCalendarContextApi } from "../../types/calendar";
import { useEffect, useMemo, useState } from "@wordpress/element";
import CacheStore from "../utils/CacheStore";

const teachersCache = new CacheStore("thrive-teachers", 1000 * 60 * 15);

export const useGetTeachers = (
  context: ThriveCalendarContextApi | null,
  opts?: { forceRefresh?: boolean }
) => {
  console.trace("useGetTeachers", { context, opts });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);

  useEffect(() => {
    if (!context) return;
    const key = context?.id ? `ctx-${context.id}` : "global";

    const fetchTeachers = async () => {
      setLoading(true);

      if (!opts?.forceRefresh) {
        const cached = teachersCache.read<Teacher[]>(key);
        console.log("Teachers cache read:", { key, cached });
        if (cached && cached.length) {
          setTeachers(cached);
          setLoading(false);
          return;
        }
      }

      try {
        const data = await context.thriveClient.fetchTeachers();
        setTeachers(data);
        teachersCache.write(key, data);
      } catch (err) {
        // leave teachers as-is on error
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [context, opts?.forceRefresh]);

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

  const invalidate = (forceKey?: string) => {
    const key = context?.id ? `ctx-${context.id}` : "global";
    teachersCache.invalidate(forceKey || key);
  };

  const getTeacherById = async (
    teacherId: number,
    opts?: { forceRefresh?: boolean }
  ) => {
    const tkey = `teacher-${teacherId}`;
    if (!opts?.forceRefresh) {
      const cached = teachersCache.read<Teacher>(tkey);
      if (cached) return cached;
    }
    if (!context) return null;
    try {
      const t = await context.thriveClient.fetchTeacher(teacherId);
      if (t) teachersCache.write(tkey, t);
      return t;
    } catch (err) {
      return null;
    }
  };

  return {
    teachers,
    loading,
    selectedTeachers,
    selectTeacherId,
    invalidate,
    getTeacherById,
  };
};
