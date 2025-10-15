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
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    comment: 'Record creation timestamp in UTC',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
    comment: 'Record last update timestamp in UTC',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    comment: 'Soft delete timestamp in UTC',
  })
  deletedAt?: Date;
}
