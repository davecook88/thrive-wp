import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import type { Order } from './order.entity.js';

export enum ItemType {
  SESSION = 'session',
  COURSE = 'course',
  PACKAGE = 'package',
  SERVICE = 'service',
}

/**
 * OrderItem entity represents individual line items in an order.
 * Contains snapshot data from Stripe prices for auditability.
 */
@Entity('order_item')
@Index(['orderId'])
@Index(['itemType', 'itemRef'])
export class OrderItem extends BaseEntity {
  @Column({
    name: 'order_id',
    type: 'int',
    comment: 'FK to order.id',
  })
  orderId: number;

  @Column({
    name: 'item_type',
    type: 'enum',
    enum: ItemType,
    comment: 'Type of item being purchased',
  })
  itemType: ItemType;

  @Column({
    name: 'item_ref',
    type: 'varchar',
    length: 120,
    comment: 'Reference key like ONE_ON_ONE, COURSE:123',
  })
  itemRef: string;

  @Column({
    name: 'title',
    type: 'varchar',
    length: 200,
    comment: 'Display title snapshot',
  })
  title: string;

  @Column({
    name: 'quantity',
    type: 'int',
    default: 1,
    comment: 'Quantity purchased',
  })
  quantity: number;

  @Column({
    name: 'amount_minor',
    type: 'int',
    comment: 'Unit amount in minor currency units',
  })
  amountMinor: number;

  @Column({
    name: 'currency',
    type: 'char',
    length: 3,
    default: 'USD',
    comment: 'Currency code',
  })
  currency: string;

  @Column({
    name: 'stripe_price_id',
    type: 'varchar',
    length: 64,
    comment: 'Stripe Price ID used',
  })
  stripePriceId: string;

  @Column({
    name: 'metadata',
    type: 'json',
    nullable: true,
    comment: 'Additional item metadata',
  })
  metadata?: any;

  @ManyToOne('Order', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
