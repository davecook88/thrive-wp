import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add profile fields to teacher table to support rich teacher profiles
 * - avatar_url: Profile picture URL
 * - birthplace: JSON object with city, country, lat, lng for birthplace
 * - current_location: JSON object with city, country, lat, lng for current location
 * - specialties: JSON array of teaching specialties
 * - years_experience: Years of teaching experience
 * - languages_spoken: JSON array of languages spoken
 */
export class AddTeacherProfileFields1759000000004
  implements MigrationInterface
{
  name = 'AddTeacherProfileFields1759000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to teacher table
    await queryRunner.query(`
      ALTER TABLE teacher
      ADD COLUMN avatar_url VARCHAR(500) NULL COMMENT 'URL to teacher profile picture',
      ADD COLUMN birthplace TEXT NULL COMMENT 'JSON object with city, country, lat, lng for birthplace',
      ADD COLUMN current_location TEXT NULL COMMENT 'JSON object with city, country, lat, lng for current location',
      ADD COLUMN specialties TEXT NULL COMMENT 'JSON array of teaching specialties',
      ADD COLUMN years_experience SMALLINT UNSIGNED NULL COMMENT 'Years of teaching experience',
      ADD COLUMN languages_spoken TEXT NULL COMMENT 'JSON array of languages spoken'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns if rolling back
    await queryRunner.query(`
      ALTER TABLE teacher
      DROP COLUMN avatar_url,
      DROP COLUMN birthplace,
      DROP COLUMN current_location,
      DROP COLUMN specialties,
      DROP COLUMN years_experience,
      DROP COLUMN languages_spoken
    `);
  }
}
