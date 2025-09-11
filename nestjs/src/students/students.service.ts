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
}
