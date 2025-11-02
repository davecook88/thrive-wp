import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Student } from "./entities/student.entity.js";

export interface CalendarEvent {
  id: string;
  title: string;
  startUtc: Date;
  endUtc: Date;
  type: "class" | "booking";
  teacherId?: number;
  teacherName?: string;
  classType?: "PRIVATE" | "GROUP" | "COURSE";
  status?: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  courseId?: number;
  courseName?: string;
  meetingUrl?: string;
  bookingId?: number; // Add bookingId for booking events
  description?: string;
}

interface SessionQueryResult {
  id: number;
  booking_id: number;
  class_type: string;
  start_at: Date;
  end_at: Date;
  status: string;
  teacher_id: number;
  course_id: number | null;
  session_source: string;
  teacher_name: string;
  meeting_url?: string;
  course_name?: string;
}

interface SessionCountResult {
  count: string;
}

interface CourseCountResult {
  count: string;
}

interface StudentPackageQueryResult {
  package_id: string;
  package_name: string;
  purchased_at: Date | string;
  expires_at: Date | string | null;
  course_program_id: string;
  course_code: string | null;
  cohort_name: string | null;
  course_title: string | null;
  course_code_from_program: string | null;
  total_steps: string;
  completed_steps: string;
}

interface ProgressQueryResult {
  step_id: string;
  step_label: string;
  step_title: string;
  step_order: string;
  status: string;
  booked_at: Date | string | null;
  completed_at: Date | string | null;
  session_id: string | null;
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,

    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Student[]> {
    return this.studentRepository.find({
      relations: ["user"],
    });
  }

  findOne(id: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { id },
      relations: ["user"],
    });
  }

  findByUserId(userId: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { userId },
      relations: ["user"],
    });
  }

  async getStudentSessions(
    userId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<CalendarEvent[]> {
    // Get all sessions for the student through bookings
    const result: SessionQueryResult[] = await this.dataSource.query(
      `
      WITH student AS (SELECT id FROM student WHERE user_id = ?)
      -- All sessions through confirmed bookings (covers private and group sessions)
      SELECT
        b.id as booking_id,
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        s.status,
        s.teacher_id,
        NULL as course_id,
        s.capacity_max,
        s.visibility,
        s.requires_enrollment,
        s.created_at,
        s.updated_at,
        s.deleted_at,
        concat(first_name,' ',last_name) as teacher_name,
        CASE
          WHEN s.type = 'PRIVATE' THEN 'private'
          WHEN s.type = 'GROUP' THEN 'group'
          ELSE 'unknown'
        END as session_source
      FROM session s
      JOIN booking b ON b.session_id = s.id
      JOIN teacher t ON t.id = s.teacher_id
      JOIN user u ON u.id = t.user_id
      WHERE b.student_id = (SELECT id FROM student)
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      ${startDate ? "AND s.start_at >= ?" : ""}
      ${endDate ? "AND s.start_at <= ?" : ""}
      `,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    const calendarEvents: CalendarEvent[] = result.map(
      (row: SessionQueryResult) => ({
        id: `booking-${row.booking_id}`,
        title: `${row.class_type} Session with ${row.teacher_name}`,
        startUtc: row.start_at,
        endUtc: row.end_at,
        type: "booking" as const,
        teacherId: row.teacher_id,
        teacherName: row.teacher_name,
        classType: row.class_type as "PRIVATE" | "GROUP" | "COURSE",
        status: row.status as "SCHEDULED" | "CANCELLED" | "COMPLETED",
        courseId: row.course_id || undefined,
        bookingId: row.booking_id,
        description: `${row.session_source} session`,
      }),
    );

    return calendarEvents;
  }

  async getStudentStats(userId: number) {
    const student = await this.findByUserId(userId);
    if (!student) {
      return {
        nextSession: null,
        totalCompleted: 0,
        totalScheduled: 0,
        activeCourses: 0,
      };
    }

    // Get next upcoming session
    const nextSessionQuery = await this.dataSource.query<SessionQueryResult[]>(
      `
      SELECT
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        s.teacher_id,
        NULL as course_id,
        s.meeting_url,
        concat(u.first_name,' ',u.last_name) as teacher_name
      FROM session s
      JOIN booking b ON b.session_id = s.id
      JOIN teacher t ON t.id = s.teacher_id
      JOIN user u ON u.id = t.user_id
      WHERE b.student_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      AND s.status = 'SCHEDULED'
      AND s.start_at > NOW()
      ORDER BY s.start_at ASC
      LIMIT 1
      `,
      [student.id],
    );

    const nextSession =
      nextSessionQuery.length > 0 ? nextSessionQuery[0] : null;

    // Get count of completed sessions
    const completedQuery = await this.dataSource.query<SessionCountResult[]>(
      `
      SELECT COUNT(*) as count
      FROM session s
      JOIN booking b ON b.session_id = s.id
      WHERE b.student_id = ?
      AND s.deleted_at IS NULL
      AND s.status = 'COMPLETED'
      `,
      [student.id],
    );

    // Get count of scheduled sessions
    const scheduledQuery = await this.dataSource.query<SessionCountResult[]>(
      `
      SELECT COUNT(*) as count
      FROM session s
      JOIN booking b ON b.session_id = s.id
      WHERE b.student_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      AND s.status = 'SCHEDULED'
      AND s.start_at > NOW()
      `,
      [student.id],
    );

    // Get count of active course enrollments
    const coursesQuery = await this.dataSource.query<CourseCountResult[]>(
      `
      SELECT COUNT(*) as count
      FROM student_package
      WHERE student_id = ?
      AND JSON_EXTRACT(metadata, '$.courseProgramId') IS NOT NULL
      AND (expires_at IS NULL OR expires_at > NOW())
      `,
      [student.id],
    );

    return {
      nextSession: nextSession
        ? {
            id: nextSession.id,
            classType: nextSession.class_type,
            startAt:
              nextSession.start_at instanceof Date
                ? nextSession.start_at.toISOString()
                : nextSession.start_at,
            endAt:
              nextSession.end_at instanceof Date
                ? nextSession.end_at.toISOString()
                : nextSession.end_at,
            teacherId: nextSession.teacher_id,
            teacherName: nextSession.teacher_name,
            courseId: nextSession.course_id,
            meetingUrl: nextSession.meeting_url,
          }
        : null,
      totalCompleted: parseInt(completedQuery[0]?.count || "0", 10),
      totalScheduled: parseInt(scheduledQuery[0]?.count || "0", 10),
      activeCourses: parseInt(coursesQuery[0]?.count || "0", 10),
    };
  }

  async getUpcomingSessions(userId: number, limit: number = 5) {
    const student = await this.findByUserId(userId);
    if (!student) {
      return [];
    }

    const sessions = await this.dataSource.query<SessionQueryResult[]>(
      `
      SELECT
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        s.teacher_id,
        NULL as course_id,
        s.meeting_url,
        s.status,
        CONCAT(u.first_name, ' ', u.last_name) as teacher_name,
        NULL as course_name
      FROM session s
      JOIN booking b ON b.session_id = s.id
      JOIN teacher t ON t.id = s.teacher_id
      JOIN user u ON u.id = t.user_id
      WHERE b.student_id = ?
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      AND s.status = 'SCHEDULED'
      AND s.start_at > NOW()
      ORDER BY s.start_at ASC
      LIMIT ?
      `,
      [student.id, limit],
    );

    const fmt = (d: unknown) => {
      if (d instanceof Date) return d.toISOString();
      if (d === null || d === undefined) return d;
      if (
        typeof d === "string" ||
        typeof d === "number" ||
        typeof d === "boolean"
      )
        return String(d);
      // Fallback: return as-is (shouldn't happen for our DB fields)
      return d;
    };

    return sessions.map((session) => ({
      id: session.id,
      classType: session.class_type,
      startAt: fmt(session.start_at),
      endAt: fmt(session.end_at),
      teacherId: session.teacher_id,
      teacherName: session.teacher_name,
      courseId: session.course_id,
      courseName: session.course_name,
      meetingUrl: session.meeting_url,
      status: session.status,
    }));
  }

  async getStudentEnrollments(userId: number) {
    const student = await this.findByUserId(userId);
    if (!student) {
      return [];
    }

    // Get course enrollments from student_package with course metadata
    const enrollments = await this.dataSource.query<
      StudentPackageQueryResult[]
    >(
      `
      SELECT
        sp.id as package_id,
        sp.package_name,
        sp.purchased_at,
        sp.expires_at,
        JSON_UNQUOTE(JSON_EXTRACT(sp.metadata, '$.courseProgramId')) as course_program_id,
        JSON_UNQUOTE(JSON_EXTRACT(sp.metadata, '$.courseCode')) as course_code,
        JSON_UNQUOTE(JSON_EXTRACT(sp.metadata, '$.cohortName')) as cohort_name,
        cp.title as course_title,
        cp.code as course_code_from_program,
        COUNT(cs.id) as total_steps,
        COUNT(scsp.id) as completed_steps
      FROM student_package sp
      LEFT JOIN course_program cp ON cp.id = JSON_UNQUOTE(JSON_EXTRACT(sp.metadata, '$.courseProgramId'))
      LEFT JOIN course_step cs ON cs.course_program_id = cp.id
      LEFT JOIN student_course_step_progress scsp ON scsp.student_package_id = sp.id 
        AND scsp.status = 'COMPLETED'
      WHERE sp.student_id = ?
        AND JSON_EXTRACT(sp.metadata, '$.courseProgramId') IS NOT NULL
        AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
        AND sp.deleted_at IS NULL
      GROUP BY sp.id, cp.id
      ORDER BY sp.purchased_at DESC
      `,
      [student.id],
    );

    // Get progress details for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progress = await this.dataSource.query<ProgressQueryResult[]>(
          `
          SELECT
            cs.id as step_id,
            cs.label as step_label,
            cs.title as step_title,
            cs.step_order,
            COALESCE(scsp.status, 'UNBOOKED') as status,
            scsp.booked_at,
            scsp.completed_at,
            scsp.session_id
          FROM course_step cs
          LEFT JOIN student_course_step_progress scsp ON scsp.course_step_id = cs.id 
            AND scsp.student_package_id = ?
          WHERE cs.course_program_id = ?
          ORDER BY cs.step_order ASC
          `,
          [enrollment.package_id, enrollment.course_program_id],
        );

        return {
          packageId: parseInt(enrollment.package_id),
          packageName: enrollment.package_name,
          courseProgramId: parseInt(enrollment.course_program_id),
          courseCode:
            enrollment.course_code || enrollment.course_code_from_program,
          courseTitle: enrollment.course_title,
          purchasedAt:
            enrollment.purchased_at instanceof Date
              ? enrollment.purchased_at.toISOString()
              : enrollment.purchased_at,
          expiresAt:
            enrollment.expires_at instanceof Date
              ? enrollment.expires_at.toISOString()
              : enrollment.expires_at,
          progress: progress.map((p) => ({
            stepId: parseInt(p.step_id),
            stepLabel: p.step_label,
            stepTitle: p.step_title,
            stepOrder: parseInt(p.step_order),
            status: p.status,
            bookedAt:
              p.booked_at instanceof Date
                ? p.booked_at.toISOString()
                : p.booked_at,
            completedAt:
              p.completed_at instanceof Date
                ? p.completed_at.toISOString()
                : p.completed_at,
            sessionId: p.session_id ? parseInt(p.session_id) : null,
          })),
          completedSteps: parseInt(enrollment.completed_steps),
          totalSteps: parseInt(enrollment.total_steps),
        };
      }),
    );

    return enrollmentsWithProgress;
  }
}
