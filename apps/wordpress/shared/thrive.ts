import { z } from "zod";
import {
  AvailabilityEvent,
  BookingEvent,
  ClassEvent,
  StudentPackageMyCreditsResponse,
  UpcomingSessionDto,
  UpcomingSessionsResponseSchema,
  SessionWithEnrollmentResponse,
  UpdateTeacherProfileDto,
  UserResponseSchema,
  PaginatedUsersResponseSchema,
  type UserResponse,
  type PaginatedUsersResponse,
} from "@thrive/shared";
import {
  PreviewAvailabilityResponseSchema,
  PublicTeacherSchema,
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

const apiPut = async <T>(
  url: string,
  data: Record<string, unknown> | undefined,
  schema?: z.ZodSchema<T>,
): Promise<T | null> => {
  const body = data ? JSON.stringify(data) : undefined;
  return apiRequest<T>(url, { method: "PUT", body }, schema);
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
  fetchTeacher: async (id: number): Promise<PublicTeacherDto | null> => {
    const raw = await apiGet(`/api/teachers/${encodeURIComponent(String(id))}`);
    if (!raw) return null;
    try {
      const parsed = PublicTeacherSchema.parse(raw);
      return parsed as unknown as PublicTeacherDto;
    } catch {
      const parsedApi = PublicTeacherSchema.parse(raw);

      return parsedApi;
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
    const data = await apiGet<PackageResponseDto[]>("/api/admin/packages");
    if (!Array.isArray(data)) {
      throw new Error("Invalid packages data");
    }
    return data.map((pkg) => PackageResponseSchema.parse(pkg));
  },

  createPackage: async (
    data: CreatePackageDto,
  ): Promise<PackageResponseDto> => {
    const result = await apiPost<PackageResponseDto>(
      "/api/admin/packages",
      data,
      PackageResponseSchema,
    );
    if (!result) throw new Error("Failed to create package");
    return result;
  },

  deactivatePackage: async (id: number): Promise<void> => {
    const result = await apiPost(
      `/api/admin/packages/${id}/deactivate`,
      undefined,
    );
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

  // User management methods
  getUsers: async (
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
  ): Promise<PaginatedUsersResponse | null> => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));
    if (search) params.append("search", search);
    if (role) params.append("role", role);

    return await apiGet<PaginatedUsersResponse>(
      `/api/users?${params.toString()}`,
      PaginatedUsersResponseSchema,
    );
  },

  promoteToAdmin: async (userId: number): Promise<UserResponse | null> => {
    return await apiPost<UserResponse>(
      `/api/users/${userId}/promote/admin`,
      undefined,
      UserResponseSchema,
    );
  },

  demoteFromAdmin: async (userId: number): Promise<UserResponse | null> => {
    return await apiPost<UserResponse>(
      `/api/users/${userId}/demote/admin`,
      undefined,
      UserResponseSchema,
    );
  },

  promoteToTeacher: async (
    userId: number,
    tier: number = 10,
  ): Promise<UserResponse | null> => {
    return await apiPost<UserResponse>(
      "/api/users/make-teacher",
      { userId, tier },
      UserResponseSchema,
    );
  },

  updateTeacherTier: async (
    userId: number,
    tier: number,
  ): Promise<UserResponse | null> => {
    return await apiPut<UserResponse>(
      `/api/users/${userId}/teacher/tier`,
      { tier },
      UserResponseSchema,
    );
  },
} as const;
