import { MigrationInterface, QueryRunner } from 'typeorm';

// NOTE: MySQL enum alteration requires recreating the enum column definition.
// We add DRAFT to session.status and PENDING to booking.status maintaining existing order where possible.
export class AddDraftStatuses1756431459161 implements MigrationInterface {
  name = 'AddDraftStatuses1756431459161';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // session.status: add 'DRAFT'
    await queryRunner.query(
      "ALTER TABLE `session` MODIFY `status` ENUM('DRAFT','SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED' COMMENT 'Session status'",
    );

    // booking.status: add 'PENDING'
    await queryRunner.query(
      "ALTER TABLE `booking` MODIFY `status` ENUM('INVITED','CONFIRMED','CANCELLED','NO_SHOW','FORFEIT','PENDING') NOT NULL DEFAULT 'CONFIRMED' COMMENT 'Booking status'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert booking.status
    await queryRunner.query(
      "ALTER TABLE `booking` MODIFY `status` ENUM('INVITED','CONFIRMED','CANCELLED','NO_SHOW','FORFEIT') NOT NULL DEFAULT 'CONFIRMED' COMMENT 'Booking status'",
    );
    // Revert session.status
    await queryRunner.query(
      "ALTER TABLE `session` MODIFY `status` ENUM('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED' COMMENT 'Session status'",
    );
  }
}
