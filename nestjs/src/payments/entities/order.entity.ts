import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import type { Student } from '../../students/entities/student.entity.js';
import type { OrderItem } from './order-item.entity.js';

export enum OrderStatus {
  PENDING = 'pending',
  REQUIRES_PAYMENT = 'requires_payment',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

/**
 * Order entity represents a purchase transaction.
 * Links to Stripe PaymentIntents and contains OrderItems for auditability.
 */
@Entity('order')
@Index(['stripePaymentIntentId'], { unique: true })
@Index(['studentId'])
@Index(['status'])
export class Order extends BaseEntity {
  @Column({
    name: 'student_id',
    type: 'int',
    comment: 'FK to student.id',
  })
  studentId: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    comment: 'Order status',
  })
  status: OrderStatus;

  @Column({
    name: 'currency',
    type: 'char',
    length: 3,
    default: 'USD',
    comment: 'Currency code',
  })
  currency: string;

  @Column({
    name: 'subtotal_minor',
    type: 'int',
    comment: 'Subtotal in minor currency units (cents)',
  })
  subtotalMinor: number;

  @Column({
    name: 'discount_minor',
    type: 'int',
    default: 0,
    comment: 'Discount in minor currency units',
  })
  discountMinor: number;

  @Column({
    name: 'tax_minor',
    type: 'int',
    default: 0,
    comment: 'Tax in minor currency units',
  })
  taxMinor: number;

  @Column({
    name: 'total_minor',
    type: 'int',
    comment: 'Total in minor currency units',
  })
  totalMinor: number;

  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Stripe PaymentIntent ID',
  })
  stripePaymentIntentId?: string;

  @Column({
    name: 'stripe_customer_id',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Stripe Customer ID',
  })
  stripeCustomerId?: string;

  @ManyToOne('Student', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @OneToMany('OrderItem', 'order', { cascade: true })
  items: OrderItem[];
}
