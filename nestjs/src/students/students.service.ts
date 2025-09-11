import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Student } from './entities/student.entity.js';
import {
  CourseEnrollment,
  CourseEnrollmentStatus,
} from '../enrollments/entities/course-enrollment.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Session } from 'inspector/promises';

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
    @InjectRepository(CourseEnrollment)
    private readonly courseEnrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
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
    // in future we'll have to get sessions attached to courses and groups that the student is enrolled in too.
    // for now just return booked private sessions
    const result = await this.dataSource.query<Session[]>(
      `
      WITH student AS (SELECT id FROM student WHERE user_id = ?)
      SELECT * FROM session
      WHERE student_id = (SELECT id FROM student)
      AND deleted_at IS NULL;
      `,
      [userId],
    );

    console.log('getStudentSessions result:', result);
    return [];
  }
}
