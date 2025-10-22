import { z } from "zod";
import { Teacher } from "./calendar.js";
import {
  AvailabilityEvent,
  BookingEvent,
  ClassEvent,
  StudentPackageMyCreditsResponse,
  UpcomingSessionDto,
  UpcomingSessionsResponseSchema,
  SessionWithEnrollmentResponse,
  UpdateTeacherProfileDto,
} from "@thrive/shared";
import {
  PreviewAvailabilityResponseSchema,
  PublicTeacherSchema,
  PublicTeacherApiSchema,
  PublicTeacherDto,
  LevelDto,
  LevelSchema,
  CompatiblePackagesForSessionResponseDto,
  CompatiblePackagesForSessionResponseSchema,
  PackageResponseSchema,
  CreatePackageDto,
  PackageResponseDto,
} from "@thrive/shared";

const options: Partial<RequestInit> = {
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin",
};

// Generic API helper functions
const apiRequest = async <T>(
  url: string,
  requestOptions: RequestInit = {},
  schema?: z.ZodSchema<T>,
): Promise<T | null> => {
  try {
    const res = await fetch(url, { ...options, ...requestOptions });
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    return schema ? schema.parse(raw) : (raw as T);
  } catch (err) {
    console.error(`API request failed for ${url}:`, err);
    return null;
  }
};

const apiGet = async <T>(
  url: string,
  schema?: z.ZodSchema<T>,
): Promise<T | null> => {
  return apiRequest<T>(url, { method: "GET" }, schema);
};

const apiPost = async <T>(
  url: string,
  data: Record<string, unknown> | undefined,
  schema?: z.ZodSchema<T>,
): Promise<T | null> => {
  const body = data ? JSON.stringify(data) : undefined;
  return apiRequest<T>(url, { method: "POST", body }, schema);
};

const apiPatch = async <T>(
  url: string,
  data: Record<string, unknown> | undefined,
  schema?: z.ZodSchema<T>,
): Promise<T | null> => {
  const body = data ? JSON.stringify(data) : undefined;
  return apiRequest<T>(url, { method: "PATCH", body }, schema);
};

export interface TeacherLocation {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface TeacherProfile {
  userId: number;
  teacherId: number;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  birthplace: TeacherLocation | null;
  currentLocation: TeacherLocation | null;
  specialties: string[] | null;
  yearsExperience: number | null;
  languagesSpoken: string[] | null;
  tier: number;
  isActive: boolean;
}

export const thriveClient = {
  fetchAvailabilityPreview: async (
    start: Date,
    end: Date,
  ): Promise<AvailabilityEvent[]> => {
    const data = await apiPost(
      `/api/teachers/me/availability/preview`,
      {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      PreviewAvailabilityResponseSchema,
    );
    if (!data) return [];
    return data.windows.map((w) => ({
      id: `avail:${w.start}|${w.end}`,
      title: "Available",
      startUtc: w.start,
      endUtc: w.end,
      type: "availability",
      teacherIds: [],
    }));
  },

  fetchAvailabilityPublic: async ({
    teacherIds,
    start,
    end,
  }: {
    teacherIds?: number[];
    start: Date;
    end: Date;
  }): Promise<AvailabilityEvent[]> => {
    // TODO: This is searching by userId. I need to make sure that the selected teacher IDs are correct
    const data = await apiPost(
      `/api/teachers/availability/preview`,
      {
        teacherIds,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      PreviewAvailabilityResponseSchema,
    );
    if (!data) return [];
    return data.windows.map((w) => ({
      id: `avail:${w.start}|${w.end}`,
      title: "Available",
      startUtc: w.start,
      endUtc: w.end,
      type: "availability",
      teacherIds: w.teacherIds,
    }));
  },

  fetchStudentCalendarEvents: async (
    start: Date,
    end: Date,
  ): Promise<BookingEvent[]> => {
    const data = await apiGet<BookingEvent[]>(
      `/api/students/me/sessions?start=${encodeURIComponent(
        start.toISOString(),
      )}&end=${encodeURIComponent(end.toISOString())}`,
    );
    return Array.isArray(data) ? data : [];
  },

  fetchStudentUpcomingSessions: async (
    limit: number = 5,
  ): Promise<UpcomingSessionDto[]> => {
    const data = await apiGet<UpcomingSessionDto[]>(
      `/api/students/me/upcoming?limit=${encodeURIComponent(String(limit))}`,
      UpcomingSessionsResponseSchema,
    );
    return Array.isArray(data) ? data : [];
  },

  fetchTeachers: async (): Promise<PublicTeacherDto[]> => {
    const data = await apiGet<PublicTeacherDto[]>(
      "/api/teachers",
      z.array(PublicTeacherSchema),
    );
    return data || [];
  },
  fetchTeacher: async (id: number): Promise<Teacher | null> => {
    const raw = await apiGet(`/api/teachers/${encodeURIComponent(String(id))}`);
    if (!raw) return null;
    try {
      const parsed = PublicTeacherSchema.parse(raw);
      return parsed as unknown as Teacher;
    } catch {
      const parsedApi = PublicTeacherApiSchema.parse(raw);
      const mapped: Teacher = {
        userId: parsedApi.userId,
        teacherId: parsedApi.teacherId,
        firstName: parsedApi.firstName || parsedApi.name || "",
        lastName: parsedApi.lastName || "",
        name:
          parsedApi.name ||
          `${parsedApi.firstName || ""} ${parsedApi.lastName || ""}`.trim(),
        bio: parsedApi.bio ?? null,
        avatarUrl: parsedApi.avatarUrl ?? null,
        birthplace: parsedApi.birthplace ?? null,
        currentLocation: parsedApi.currentLocation ?? null,
        specialties: parsedApi.specialties ?? null,
        yearsExperience: parsedApi.yearsExperience ?? null,
        languagesSpoken: parsedApi.languagesSpoken ?? null,
      };
      return mapped;
    }
  },
  fetchStudentCredits:
    async (): Promise<StudentPackageMyCreditsResponse | null> => {
      return await apiGet<StudentPackageMyCreditsResponse>(
        "/api/packages/my-credits",
      );
    },
  fetchAvailableGroupSessions: async ({
    levelId,
    startDate,
    endDate,
    teacherId,
  }: {
    levelId?: number;
    startDate?: Date;
    endDate?: Date;
    teacherId?: number;
  } = {}): Promise<ClassEvent[]> => {
    const params = new URLSearchParams();
    if (levelId) params.append("levelId", String(levelId));
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    if (teacherId) params.append("teacherId", String(teacherId));

    const data = await apiGet<SessionWithEnrollmentResponse[]>(
      `/api/group-classes/available?${params.toString()}`,
    );
    if (!Array.isArray(data)) return [];

    // Map to CalendarEvent format
    return data
      .filter((s) => s.groupClass !== null)
      .map((s) => ({
        id: `group-session-${s.id}`,
        type: "class" as const,
        serviceType: "GROUP" as const,
        title: s.groupClass?.title ?? "",
        startUtc: s.startAt,
        endUtc: s.endAt,
        sessionId: String(s.id),
        groupClassId: s.groupClass?.id,
        level: s.groupClass?.level,
        teacher: s.teacher || undefined,
        capacityMax: s.capacityMax,
        enrolledCount: s.enrolledCount,
        availableSpots: s.availableSpots,
        isFull: s.isFull,
        canJoinWaitlist: s.canJoinWaitlist,
        meetingUrl: s.meetingUrl || undefined,
        status: "SCHEDULED" as const,
      }));
  },
  fetchLevels: async (): Promise<LevelDto[]> => {
    const data = await apiGet<LevelDto[]>("/api/levels");
    if (!Array.isArray(data)) return [];
    return data.map((level) => LevelSchema.parse(level));
  },
  fetchAvailablePackages: async (): Promise<PackageResponseDto[]> => {
    const data = await apiGet<PackageResponseDto[]>(
      "/api/packages",
      z.array(PackageResponseSchema),
    );
    if (!Array.isArray(data)) return [];
    return data.map((pkg) => PackageResponseSchema.parse(pkg));
  },
  fetchCompatiblePackagesForSession: async (
    sessionId: number,
  ): Promise<CompatiblePackagesForSessionResponseDto | null> => {
    return await apiGet<CompatiblePackagesForSessionResponseDto | null>(
      `/api/packages/compatible-for-session/${sessionId}`,
      CompatiblePackagesForSessionResponseSchema,
    );
  },

  getPackages: async (): Promise<PackageResponseDto[]> => {
    const data = await apiGet<PackageResponseDto[]>("/admin/packages");
    if (!Array.isArray(data)) {
      throw new Error("Invalid packages data");
    }
    return data.map((pkg) => PackageResponseSchema.parse(pkg));
  },

  createPackage: async (
    data: CreatePackageDto,
  ): Promise<PackageResponseDto> => {
    const result = await apiPost<PackageResponseDto>(
      "/admin/packages",
      data,
      PackageResponseSchema,
    );
    if (!result) throw new Error("Failed to create package");
    return result;
  },

  deactivatePackage: async (id: number): Promise<void> => {
    const result = await apiPost(`/admin/packages/${id}/deactivate`, undefined);
    if (!result) throw new Error("Failed to deactivate package");
  },

  fetchTeacherProfile: async (): Promise<PublicTeacherDto | null> => {
    return await apiGet<PublicTeacherDto>(
      "/api/teachers/me/profile",
      PublicTeacherSchema,
    );
  },

  updateTeacherProfile: async (
    data: UpdateTeacherProfileDto,
  ): Promise<PublicTeacherDto | null> => {
    return await apiPatch<PublicTeacherDto>(
      "/api/teachers/me/profile",
      data as Record<string, unknown>,
      PublicTeacherSchema,
    );
  },
} as const;
