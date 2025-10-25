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
  // waitlist schemas/types
  JoinWaitlistSchema,
  WaitlistResponseSchema,
  PaginatedUsersResponseSchema,
  type UserResponse,
  type PaginatedUsersResponse,
  BookingCancellationResponse,
  BookingCancellationResponseSchema,
  WaitlistResponseDto,
  ServiceType,
  StripeKeyResponse,
  CreateSessionResponse,
  CreateSessionDto,
  StripeKeyResponseSchema,
  StudentPackageMyCreditsResponseSchema,
  // Course programs types
  CourseProgramDetailDto,
  CourseProgramDetailSchema,
  CreateCourseProgramDto,
  UpdateCourseProgramDto,
  CreateCourseStepDto,
  UpdateCourseStepDto,
  PublishCourseDto,
  AttachStepOptionDto,
  StepOptionDetailDto,
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
import {
  BookingResponseSchema,
  type BookingResponse,
  CreateBookingResponseSchema,
  type CreateBookingRequest,
  type CreateBookingResponse,
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
        StudentPackageMyCreditsResponseSchema,
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
        serviceType: ServiceType.GROUP,
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
  fetchAvailablePackages: async (
    sessionId?: string,
    serviceType?: ServiceType,
  ): Promise<PackageResponseDto[]> => {
    const urlQueryParams = new URLSearchParams();
    if (serviceType) {
      urlQueryParams.append("serviceType", serviceType);
    }
    if (sessionId) {
      urlQueryParams.append("sessionId", sessionId);
    }
    const url =
      urlQueryParams.toString().length > 0
        ? `/api/packages?${urlQueryParams.toString()}`
        : "/api/packages";
    const data = await apiGet<PackageResponseDto[]>(
      url,
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
  fetchCompatiblePackagesForBooking: async (
    serviceType: ServiceType,
    teacherTier: number,
  ): Promise<CompatiblePackagesForSessionResponseDto | null> => {
    const params = new URLSearchParams();
    params.append("serviceType", serviceType);
    params.append("teacherTier", String(teacherTier));
    return await apiGet<CompatiblePackagesForSessionResponseDto | null>(
      `/api/packages/compatible-for-booking?${params.toString()}`,
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

  // Booking helpers
  createBooking: async (
    data: CreateBookingRequest,
  ): Promise<CreateBookingResponse | null> => {
    const result = await apiPost<CreateBookingResponse>(
      "/api/bookings",
      data as Record<string, unknown>,
      CreateBookingResponseSchema,
    );
    return result;
  },

  cancelBooking: async (
    bookingId: number,
    reason?: string,
  ): Promise<BookingCancellationResponse | null> => {
    const payload = reason ? { reason } : undefined;
    const result = await apiPost<BookingCancellationResponse>(
      `/api/bookings/${bookingId}/cancel`,
      payload as Record<string, unknown> | undefined,
      // BookingCancellationResponseSchema is exported from @thrive/shared
      // cast here to satisfy TypeScript
      BookingCancellationResponseSchema,
    );
    return result;
  },

  // Create a new private session from bookingData and book it with package credits
  // Note: For booking existing sessions, use createBooking() instead
  usePackage: async (
    packageId: number,
    payload: Record<string, unknown>,
  ): Promise<BookingResponse | null> => {
    try {
      const res = await apiPost(
        `/api/packages/${encodeURIComponent(String(packageId))}/use`,
        payload,
      );
      if (!res) return null;
      try {
        return BookingResponseSchema.parse(res);
      } catch (err) {
        console.error("usePackage: response validation failed", err);
        return null;
      }
    } catch (err) {
      console.error("usePackage failed", err);
      return null;
    }
  },

  // Waitlist methods
  joinWaitlist: async (
    sessionId: number,
  ): Promise<WaitlistResponseDto | null> => {
    // validate request
    const payload = JoinWaitlistSchema.parse({ sessionId });

    const result = await apiPost<WaitlistResponseDto>(
      "/api/waitlists",
      payload as Record<string, unknown>,
      WaitlistResponseSchema,
    );

    return result;
  },

  // Payments helpers
  getStripeKey: async (): Promise<StripeKeyResponse | null> => {
    try {
      const res = await apiGet(`/api/payments/stripe-key`);
      if (!res) return null;
      const parsed = StripeKeyResponseSchema.parse(res);
      return parsed;
    } catch (err) {
      console.error("getStripeKey failed", err);
      return null;
    }
  },

  createPaymentSession: async (
    payload: CreateSessionDto,
  ): Promise<CreateSessionResponse | null> => {
    try {
      const res = await apiPost(`/api/payments/create-session`, payload);
      if (!res) return null;
      const parsed = (
        await import("@thrive/shared/types/payments")
      ).CreateSessionResponseSchema.parse(res);
      return parsed;
    } catch (err) {
      console.error("createPaymentSession failed", err);
      return null;
    }
  },

  // Check whether a booking can be modified (cancel/reschedule)
  canModifyBooking: async (
    bookingId: number,
  ): Promise<{
    canCancel: boolean;
    canReschedule: boolean;
    reason?: string | null;
    hoursUntilSession: number;
  } | null> => {
    const CanModifySchema = z.object({
      canCancel: z.boolean(),
      canReschedule: z.boolean(),
      reason: z.string().nullable().optional(),
      hoursUntilSession: z.number().int(),
    });

    const data = await apiGet(`/api/bookings/${bookingId}/can-modify`);
    if (!data) return null;
    try {
      return CanModifySchema.parse(data);
    } catch (err) {
      console.error("canModifyBooking: response validation failed", err);
      return null;
    }
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

  // Course Programs management methods
  getCoursePrograms: async (): Promise<CourseProgramDetailDto[]> => {
    const data = await apiGet(
      `/api/admin/course-programs`,
      z.array(CourseProgramDetailSchema),
    );
    return data || [];
  },

  getCourseProgram: async (
    id: number,
  ): Promise<CourseProgramDetailDto | null> => {
    return await apiGet(
      `/api/admin/course-programs/${id}`,
      CourseProgramDetailSchema,
    );
  },

  createCourseProgram: async (
    data: CreateCourseProgramDto,
  ): Promise<CourseProgramDetailDto | null> => {
    return await apiPost(
      `/api/admin/course-programs`,
      data as Record<string, unknown>,
      CourseProgramDetailSchema,
    );
  },

  updateCourseProgram: async (
    id: number,
    data: UpdateCourseProgramDto,
  ): Promise<CourseProgramDetailDto | null> => {
    return await apiPut(
      `/api/admin/course-programs/${id}`,
      data as Record<string, unknown>,
      CourseProgramDetailSchema,
    );
  },

  deleteCourseProgram: async (id: number): Promise<void> => {
    await apiRequest(`/api/admin/course-programs/${id}`, { method: "DELETE" });
  },

  // Course Steps management methods
  createCourseStep: async (data: CreateCourseStepDto): Promise<unknown> => {
    return await apiPost(
      `/api/admin/course-programs/${data.courseProgramId}/steps`,
      data as Record<string, unknown>,
    );
  },

  updateCourseStep: async (
    stepId: number,
    data: UpdateCourseStepDto,
  ): Promise<unknown> => {
    return await apiPut(
      `/api/admin/course-programs/steps/${stepId}`,
      data as Record<string, unknown>,
    );
  },

  deleteCourseStep: async (stepId: number): Promise<void> => {
    await apiRequest(`/api/admin/course-programs/steps/${stepId}`, {
      method: "DELETE",
    });
  },

  publishCourseToStripe: async (
    id: number,
    data: Omit<PublishCourseDto, "courseProgramId">,
  ): Promise<{ stripeProductId: string; stripePriceId: string }> => {
    const response = await apiRequest(
      `/api/admin/course-programs/${id}/publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    return response as { stripeProductId: string; stripePriceId: string };
  },

  // Step Options management methods
  attachStepOption: async (
    stepId: number,
    data: Omit<AttachStepOptionDto, "courseStepId">,
  ): Promise<StepOptionDetailDto> => {
    const response = await apiPost(
      `/api/admin/course-programs/steps/${stepId}/options`,
      { ...data, courseStepId: stepId } as Record<string, unknown>,
    );
    return response as StepOptionDetailDto;
  },

  detachStepOption: async (optionId: number): Promise<void> => {
    await apiRequest(`/api/admin/course-programs/steps/options/${optionId}`, {
      method: "DELETE",
    });
  },

  listStepOptions: async (stepId: number): Promise<StepOptionDetailDto[]> => {
    const response = await apiRequest(
      `/api/admin/course-programs/steps/${stepId}/options`,
    );
    return response as StepOptionDetailDto[];
  },

  // Group Classes management methods
  getAllGroupClasses: async (): Promise<
    Array<{
      id: number;
      title: string;
      description: string | null;
      isActive: boolean;
      levels: Array<{ id: number; code: string; name: string }>;
    }>
  > => {
    const response = await apiRequest(`/api/group-classes`);
    return response as Array<{
      id: number;
      title: string;
      description: string | null;
      isActive: boolean;
      levels: Array<{ id: number; code: string; name: string }>;
    }>;
  },
} as const;
