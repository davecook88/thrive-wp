import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddCancellationPolicies1759000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cancellation_policy table
    await queryRunner.createTable(
      new Table({
        name: 'cancellation_policy',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'allow_cancellation',
            type: 'boolean',
            default: true,
            comment: 'Whether students can cancel bookings',
          },
          {
            name: 'cancellation_deadline_hours',
            type: 'int',
            default: 24,
            comment: 'Hours before session start that cancellation is allowed',
          },
          {
            name: 'allow_rescheduling',
            type: 'boolean',
            default: true,
            comment: 'Whether students can reschedule bookings',
          },
          {
            name: 'rescheduling_deadline_hours',
            type: 'int',
            default: 24,
            comment: 'Hours before session start that rescheduling is allowed',
          },
          {
            name: 'max_reschedules_per_booking',
            type: 'int',
            default: 2,
            comment: 'Maximum number of times a booking can be rescheduled',
          },
          {
            name: 'penalty_type',
            type: 'enum',
            enum: ['NONE', 'CREDIT_LOSS', 'FEE'],
            default: "'NONE'",
            comment: 'Type of penalty for late cancellations',
          },
          {
            name: 'refund_credits_on_cancel',
            type: 'boolean',
            default: true,
            comment: 'Whether to refund package credits when student cancels',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            comment: 'Whether this policy is currently active',
          },
          {
            name: 'policy_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Descriptive name for this policy version',
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 3,
            default: 'CURRENT_TIMESTAMP(3)',
            comment: 'Creation timestamp (UTC)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 3,
            default: 'CURRENT_TIMESTAMP(3)',
            onUpdate: 'CURRENT_TIMESTAMP(3)',
            comment: 'Last update timestamp (UTC)',
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            precision: 3,
            isNullable: true,
            comment: 'Soft delete timestamp (UTC)',
          },
        ],
      }),
      true,
    );

    // Add new columns to booking table
    await queryRunner.addColumns('booking', [
      new TableColumn({
        name: 'rescheduled_count',
        type: 'int',
        default: 0,
        comment: 'Number of times this booking has been rescheduled',
      }),
      new TableColumn({
        name: 'original_session_id',
        type: 'int',
        isNullable: true,
        comment:
          'Original session ID if this booking was rescheduled from another session',
      }),
      new TableColumn({
        name: 'cancelled_by_student',
        type: 'boolean',
        default: false,
        comment: 'Whether the booking was cancelled by the student (vs admin)',
      }),
    ]);

    // Insert default policy
    await queryRunner.query(`
      INSERT INTO cancellation_policy (
        allow_cancellation,
        cancellation_deadline_hours,
        allow_rescheduling,
        rescheduling_deadline_hours,
        max_reschedules_per_booking,
        penalty_type,
        refund_credits_on_cancel,
        is_active,
        policy_name
      ) VALUES (
        true,
        24,
        true,
        24,
        2,
        'NONE',
        true,
        true,
        'Default Policy'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from booking table
    await queryRunner.dropColumn('booking', 'cancelled_by_student');
    await queryRunner.dropColumn('booking', 'original_session_id');
    await queryRunner.dropColumn('booking', 'rescheduled_count');

    // Drop cancellation_policy table
    await queryRunner.dropTable('cancellation_policy');
  }
}
