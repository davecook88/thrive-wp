import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class RemoveCourseCohortDates1769000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the check constraint that references start_date and end_date
    // We use a try-catch block because the constraint might not exist in all environments
    // or might have a different name if it was auto-generated, but here we know it is chk_date_order
    try {
      await queryRunner.query(
        "ALTER TABLE course_cohort DROP CONSTRAINT chk_date_order",
      );
    } catch (e) {
      // Ignore if constraint doesn't exist
      console.warn(
        "Could not drop constraint chk_date_order, it might not exist",
        e,
      );
    }

    // Remove the start_date and end_date columns from course_cohort
    // These will now be dynamically calculated from the sessions assigned to the cohort
    await queryRunner.dropColumn("course_cohort", "start_date");
    await queryRunner.dropColumn("course_cohort", "end_date");

    // Also remove the index that referenced start_date
    // Note: dropColumn might have already removed the index if it was created on the column
    // But we'll keep this just in case, wrapped in try-catch
    try {
      await queryRunner.query(
        "ALTER TABLE course_cohort DROP INDEX IDX_course_cohort_start_date",
      );
    } catch (e) {
      // Ignore if index doesn't exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the columns for rollback
    await queryRunner.addColumn(
      "course_cohort",
      new TableColumn({
        name: "start_date",
        type: "date",
        isNullable: false,
        comment:
          "First session date of cohort (derived from assigned sessions)",
      }),
    );

    await queryRunner.addColumn(
      "course_cohort",
      new TableColumn({
        name: "end_date",
        type: "date",
        isNullable: false,
        comment: "Last session date of cohort (derived from assigned sessions)",
      }),
    );

    // Re-add the index
    await queryRunner.query(
      "ALTER TABLE course_cohort ADD INDEX IDX_course_cohort_start_date (start_date)",
    );

    // Re-add the check constraint
    await queryRunner.query(
      "ALTER TABLE course_cohort ADD CONSTRAINT chk_date_order CHECK (end_date >= start_date)",
    );
  }
}
