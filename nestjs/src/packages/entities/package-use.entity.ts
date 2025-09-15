import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { StudentPackage } from './student-package.entity.js';

@Entity('package_use')
@Index(['studentPackageId'])
export class PackageUse extends BaseEntity {
  @Column({ name: 'student_package_id', type: 'int' })
  studentPackageId: number;

  @ManyToOne(() => StudentPackage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_package_id' })
  studentPackage: StudentPackage;

  @Column({ name: 'booking_id', type: 'int', nullable: true })
  bookingId: number | null;

  @Column({ name: 'session_id', type: 'int', nullable: true })
  sessionId: number | null;

  @Column({ name: 'used_at', type: 'datetime', precision: 3 })
  usedAt: Date;

  @Column({ name: 'used_by', type: 'int', nullable: true })
  usedBy: number | null;

  @Column({ name: 'note', type: 'varchar', length: 500, nullable: true })
  note: string | null;
}
