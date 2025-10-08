import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

/**
 * Waitlist entity represents queued students for a full session.
 */
@Entity('waitlist')
@Unique(['sessionId', 'studentId'])
@Index(['sessionId', 'position'])
export class Waitlist extends BaseEntity {
  @Column({
    name: 'session_id',
    type: 'int',
    comment: 'FK to session.id',
  })
  sessionId: number;

  @ManyToOne(() => 'Session', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: any;

  @Column({
    name: 'student_id',
    type: 'int',
    comment: 'FK to student.id',
  })
  studentId: number;

  @ManyToOne(() => 'Student', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: any;

  @Column({
    name: 'position',
    type: 'int',
    comment: 'Position in the waitlist queue',
  })
  position: number;
}
