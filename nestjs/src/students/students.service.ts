import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Student } from './entities/student.entity.js';
import {
  CourseEnrollment,
  CourseEnrollmentStatus,
} from '../enrollments/entities/course-enrollment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Session } from '../sessions/entities/session.entity.js';
import { Booking, BookingStatus } from '../payments/entities/booking.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';

export interface CalendarEvent {
  id: string;
  title: string;
  startUtc: string;
  endUtc: string;
  type: 'class' | 'booking';
  teacherId?: number;
  studentId?: number;
  description?: string;
  classType?: 'PRIVATE' | 'GROUP' | 'COURSE';
  status?: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  courseId?: number;
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
      relations: ['user'],
    });
  }

  findOne(id: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  findByUserId(userId: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async getStudentSessions(
    userId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<CalendarEvent[]> {
    // Get all sessions for the student through bookings
    const result = await this.dataSource.query(
      `
      WITH student AS (SELECT id FROM student WHERE user_id = ?)
      -- All sessions through confirmed bookings (covers private, group, and course sessions)
      SELECT
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        s.status,
        s.teacher_id,
        s.course_id,
        s.capacity_max,
        s.visibility,
        s.requires_enrollment,
        s.created_at,
        s.updated_at,
        s.deleted_at,
        CASE
          WHEN s.type = 'PRIVATE' THEN 'private'
          WHEN s.type = 'GROUP' THEN 'group'
          WHEN s.type = 'COURSE' THEN 'course'
          ELSE 'unknown'
        END as session_source
      FROM session s
      JOIN booking b ON b.session_id = s.id
      WHERE b.student_id = (SELECT id FROM student)
      AND s.deleted_at IS NULL
      AND b.status = 'CONFIRMED'
      ${startDate ? 'AND s.start_at >= ?' : ''}
      ${endDate ? 'AND s.start_at <= ?' : ''}
      `,
      [
        userId,
        ...(startDate ? [startDate] : []),
        ...(endDate ? [endDate] : []),
      ],
    );

    // Transform results into CalendarEvent format
    const calendarEvents: CalendarEvent[] = result.map((row: any) => ({
      id: row.id.toString(),
      title: `${row.class_type} Session`,
      startUtc: row.start_at,
      endUtc: row.end_at,
      type: 'class' as const,
      teacherId: row.teacher_id,
      studentId: userId, // The student user ID
      classType: row.class_type as 'PRIVATE' | 'GROUP' | 'COURSE',
      status: row.status as 'SCHEDULED' | 'CANCELLED' | 'COMPLETED',
      courseId: row.course_id,
      description: `${row.session_source} session`,
    }));

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
    const nextSessionQuery = await this.dataSource.query(
      `
      SELECT
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        s.teacher_id,
        s.course_id,
        s.meeting_url,
        u.name as teacher_name
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

    const nextSession = nextSessionQuery.length > 0 ? nextSessionQuery[0] : null;

    // Get count of completed sessions
    const completedQuery = await this.dataSource.query(
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
    const scheduledQuery = await this.dataSource.query(
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
    const coursesQuery = await this.dataSource.query(
      `
      SELECT COUNT(*) as count
      FROM course_enrollment
      WHERE student_id = ?
      AND status = 'ACTIVE'
      `,
      [student.id],
    );

    return {
      nextSession: nextSession
        ? {
            id: nextSession.id,
            classType: nextSession.class_type,
            startAt: nextSession.start_at,
            endAt: nextSession.end_at,
            teacherId: nextSession.teacher_id,
            teacherName: nextSession.teacher_name,
            courseId: nextSession.course_id,
            meetingUrl: nextSession.meeting_url,
          }
        : null,
      totalCompleted: parseInt(completedQuery[0]?.count || '0', 10),
      totalScheduled: parseInt(scheduledQuery[0]?.count || '0', 10),
      activeCourses: parseInt(coursesQuery[0]?.count || '0', 10),
    };
  }

  async getUpcomingSessions(userId: number, limit: number = 5) {
    const student = await this.findByUserId(userId);
    if (!student) {
      return [];
    }

    const sessions = await this.dataSource.query(
      `
      SELECT
        s.id,
        s.type as class_type,
        s.start_at,
        s.end_at,
        s.teacher_id,
        s.course_id,
        s.meeting_url,
        s.status,
        u.name as teacher_name,
        c.name as course_name
      FROM session s
      JOIN booking b ON b.session_id = s.id
      JOIN teacher t ON t.id = s.teacher_id
      JOIN user u ON u.id = t.user_id
      LEFT JOIN course c ON c.id = s.course_id
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

    return sessions.map((session: any) => ({
      id: session.id,
      classType: session.class_type,
      startAt: session.start_at,
      endAt: session.end_at,
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

    const enrollments = await this.dataSource.query(
      `
      SELECT
        ce.id as enrollment_id,
        ce.status,
        ce.enrolled_at,
        c.id as course_id,
        c.name as course_name,
        c.description,
        c.start_date,
        c.end_date,
        (SELECT COUNT(*) FROM session s
         WHERE s.course_id = c.id
         AND s.deleted_at IS NULL
         AND s.status = 'SCHEDULED') as total_sessions,
        (SELECT COUNT(*) FROM session s
         JOIN booking b ON b.session_id = s.id
         WHERE s.course_id = c.id
         AND b.student_id = ?
         AND s.deleted_at IS NULL
         AND s.status = 'COMPLETED') as completed_sessions,
        (SELECT s.start_at FROM session s
         JOIN booking b ON b.session_id = s.id
         WHERE s.course_id = c.id
         AND b.student_id = ?
         AND s.deleted_at IS NULL
         AND b.status = 'CONFIRMED'
         AND s.status = 'SCHEDULED'
         AND s.start_at > NOW()
         ORDER BY s.start_at ASC
         LIMIT 1) as next_session_at
      FROM course_enrollment ce
      JOIN course c ON c.id = ce.course_id
      WHERE ce.student_id = ?
      AND ce.status = 'ACTIVE'
      ORDER BY ce.enrolled_at DESC
      `,
      [student.id, student.id, student.id],
    );

    return enrollments.map((enrollment: any) => ({
      enrollmentId: enrollment.enrollment_id,
      courseId: enrollment.course_id,
      courseName: enrollment.course_name,
      description: enrollment.description,
      status: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      startDate: enrollment.start_date,
      endDate: enrollment.end_date,
      totalSessions: parseInt(enrollment.total_sessions || '0', 10),
      completedSessions: parseInt(enrollment.completed_sessions || '0', 10),
      nextSessionAt: enrollment.next_session_at,
    }));
  }
}
