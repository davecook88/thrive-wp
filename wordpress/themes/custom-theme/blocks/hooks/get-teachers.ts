import { Teacher, ThriveCalendarContextApi } from "../../types/calendar";
import { useEffect, useMemo, useState } from "@wordpress/element";
import CacheStore from "../utils/CacheStore";
import { thriveClient } from "../../clients/thrive";

const teachersCache = new CacheStore("thrive-teachers", 1000 * 60 * 15);

export const useGetTeachers = (opts?: {
  forceRefresh?: boolean;
  id?: string;
}) => {
  console.trace("useGetTeachers", { opts });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      const key = opts?.id ? `ctx-${opts.id}` : "global";

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
        const data = await thriveClient.fetchTeachers();
        setTeachers(data);
        teachersCache.write(key, data);
      } catch (err) {
        // leave teachers as-is on error
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [opts?.forceRefresh]);

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
    const key = opts?.id ? `ctx-${opts.id}` : "global";
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
    try {
      const t = await thriveClient.fetchTeacher(teacherId);
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
