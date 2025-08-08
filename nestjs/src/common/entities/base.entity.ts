import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BaseEntity as TypeOrmBaseEntity,
} from 'typeorm';

/**
 * Base entity class with common fields for all entities
 * Provides id, createdAt, updatedAt, and soft delete functionality
 */
export abstract class BaseEntity extends TypeOrmBaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    comment: 'Record creation timestamp in UTC',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'datetime',
    precision: 3,
    comment: 'Record last update timestamp in UTC',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'Soft delete timestamp in UTC',
  })
  deletedAt?: Date;
}
