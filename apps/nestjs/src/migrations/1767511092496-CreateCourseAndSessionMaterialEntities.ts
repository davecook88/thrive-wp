import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCourseAndSessionMaterialEntities1767511092496
  implements MigrationInterface
{
  name = "CreateCourseAndSessionMaterialEntities1767511092496";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE session_material (
    id int NOT NULL AUTO_INCREMENT,
    created_at datetime(3) NOT NULL COMMENT 'Record creation timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3),
    updated_at datetime(3) NOT NULL COMMENT 'Record last update timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
    session_id int NOT NULL COMMENT 'FK to session.id',
    title varchar(255) NOT NULL COMMENT 'Material title',
    description text NULL COMMENT 'Material description',
    type enum ('file', 'video_embed', 'rich_text') NOT NULL COMMENT 'Type of material',
    content text NOT NULL COMMENT 'URL for file, embed code for video, or markdown for rich text',
    created_by_id int NOT NULL COMMENT 'FK to user.id (admin who created it)',
    INDEX IDX_af1c579345933adaf651e680f9 (created_by_id),
    INDEX IDX_f92c40414c473f2cbb49113cee (session_id),
    PRIMARY KEY (id)
) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE course_step_material (
    id int NOT NULL AUTO_INCREMENT,
    created_at datetime(3) NOT NULL COMMENT 'Record creation timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3),
    updated_at datetime(3) NOT NULL COMMENT 'Record last update timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
    course_step_id int NOT NULL COMMENT 'FK to course_step.id',
    title varchar(255) NOT NULL COMMENT 'Material title',
    description text NULL COMMENT 'Material description',
    type enum ('file', 'video_embed', 'rich_text', 'question') NOT NULL COMMENT 'Type of material (e.g., file, video, rich text, or a question prompt)',
    content text NULL COMMENT 'URL for file, embed code for video, markdown for rich text. Null if type is \'question\'.',
    \`order\` smallint UNSIGNED NOT NULL COMMENT 'Ordering within the course step',
    created_by_id int NOT NULL COMMENT 'FK to user.id (admin who created it)',
    INDEX IDX_c51af2a9de8e172db605aa7af9 (created_by_id),
    INDEX IDX_a7e947c0a02dd9758ee8db3f20 (course_step_id, \`order\`),
    PRIMARY KEY (id)
) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE student_course_step_material_progress (
    id int NOT NULL AUTO_INCREMENT,
    created_at datetime(3) NOT NULL COMMENT 'Record creation timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3),
    updated_at datetime(3) NOT NULL COMMENT 'Record last update timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
    student_id int NOT NULL COMMENT 'FK to student.id',
    course_step_material_id int NOT NULL COMMENT 'FK to course_step_material.id',
    status enum ('not_started', 'in_progress', 'completed') NOT NULL COMMENT 'Status of student\'s progress on this material' DEFAULT 'not_started',
    completed_at datetime NULL COMMENT 'Timestamp when material was completed',
    student_package_id int NOT NULL COMMENT 'FK to student_package.id, linking to the specific enrollment',
    INDEX IDX_c180ff1ce880ffd586d71aa7e0 (student_package_id),
    UNIQUE INDEX IDX_ed8a0294a94b180bddcf295f08 (student_id, course_step_material_id),
    PRIMARY KEY (id)
) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE material_question (
    id int NOT NULL AUTO_INCREMENT,
    created_at datetime(3) NOT NULL COMMENT 'Record creation timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3),
    updated_at datetime(3) NOT NULL COMMENT 'Record last update timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
    course_step_material_id int NOT NULL COMMENT 'FK to course_step_material.id',
    question_text text NOT NULL COMMENT 'The question prompt',
    question_type enum ('multiple_choice', 'long_text', 'file_upload', 'video_upload') NOT NULL COMMENT 'Type of question, determining how it\'s answered and assessed',
    options json NULL COMMENT 'JSON array of options for multiple_choice questions',
    INDEX IDX_73216717604830cea6ee9c6496 (course_step_material_id),
    PRIMARY KEY (id)
) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE student_answer (
    id int NOT NULL AUTO_INCREMENT,
    created_at datetime(3) NOT NULL COMMENT 'Record creation timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3),
    updated_at datetime(3) NOT NULL COMMENT 'Record last update timestamp in UTC' DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at datetime(3) NULL COMMENT 'Soft delete timestamp in UTC',
    question_id int NOT NULL COMMENT 'FK to material_question.id',
    student_id int NOT NULL COMMENT 'FK to user.id (student)',
    answer_content text NOT NULL COMMENT 'The student\'s answer (text, or URL to uploaded file/video)',
    status enum ('pending_assessment', 'approved', 'needs_revision') NOT NULL COMMENT 'Status of the answer assessment' DEFAULT 'pending_assessment',
    assessed_by_id int NULL COMMENT 'FK to user.id (teacher who assessed it)',
    feedback text NULL COMMENT 'Teacher\'s feedback on the answer',
    INDEX IDX_3011b8c5a2efb5b4c0ead6d8a0 (assessed_by_id),
    UNIQUE INDEX IDX_b6e017eecda4016c69ec02807c (question_id, student_id),
    PRIMARY KEY (id)
) ENGINE=InnoDB`);
    await queryRunner.query(
      "ALTER TABLE session_material ADD CONSTRAINT FK_f92c40414c473f2cbb49113cee6 FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE session_material ADD CONSTRAINT FK_af1c579345933adaf651e680f9f FOREIGN KEY (created_by_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE course_step_material ADD CONSTRAINT FK_d1937b7380e10205465f174c18b FOREIGN KEY (course_step_id) REFERENCES course_step(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE course_step_material ADD CONSTRAINT FK_c51af2a9de8e172db605aa7af99 FOREIGN KEY (created_by_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE student_course_step_material_progress ADD CONSTRAINT FK_5f4cab887a10c88668df2c0bf8f FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE student_course_step_material_progress ADD CONSTRAINT FK_cb524ae671a6acb29e3bc188ef2 FOREIGN KEY (course_step_material_id) REFERENCES course_step_material(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE student_course_step_material_progress ADD CONSTRAINT FK_c180ff1ce880ffd586d71aa7e07 FOREIGN KEY (student_package_id) REFERENCES student_package(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE material_question ADD CONSTRAINT FK_73216717604830cea6ee9c64967 FOREIGN KEY (course_step_material_id) REFERENCES course_step_material(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE student_answer ADD CONSTRAINT FK_d86cf756d6879ed98a8089c26b1 FOREIGN KEY (question_id) REFERENCES material_question(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE student_.answer ADD CONSTRAINT FK_c2dee29ba5d778a14ec4675ad28 FOREIGN KEY (student_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await queryRunner.query(
      "ALTER TABLE student_answer ADD CONSTRAINT FK_3011b8c5a2efb5b4c0ead6d8a0e FOREIGN KEY (assessed_by_id) REFERENCES user(id) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE student_answer DROP FOREIGN KEY FK_3011b8c5a2efb5b4c0ead6d8a0e",
    );
    await queryRunner.query(
      "ALTER TABLE student_answer DROP FOREIGN KEY FK_c2dee29ba5d778a14ec4675ad28",
    );
    await queryRunner.query(
      "ALTER TABLE student_answer DROP FOREIGN KEY FK_d86cf756d6879ed98a8089c26b1",
    );
    await queryRunner.query(
      "ALTER TABLE material_question DROP FOREIGN KEY FK_73216717604830cea6ee9c64967",
    );
    await queryRunner.query(
      "ALTER TABLE student_course_step_material_progress DROP FOREIGN KEY FK_c180ff1ce880ffd586d71aa7e07",
    );
    await queryRunner.query(
      "ALTER TABLE student_course_step_material_progress DROP FOREIGN KEY FK_cb524ae671a6acb29e3bc188ef2",
    );
    await queryRunner.query(
      "ALTER TABLE student_course_step_material_progress DROP FOREIGN KEY FK_5f4cab887a10c88668df2c0bf8f",
    );
    await queryRunner.query(
      "ALTER TABLE course_step_material DROP FOREIGN KEY FK_c51af2a9de8e172db605aa7af99",
    );
    await queryRunner.query(
      "ALTER TABLE course_step_material DROP FOREIGN KEY FK_d1937b7380e10205465f174c18b",
    );
    await queryRunner.query(
      "ALTER TABLE session_material DROP FOREIGN KEY FK_af1c579345933adaf651e680f9f",
    );
    await queryRunner.query(
      "ALTER TABLE session_material DROP FOREIGN KEY FK_f92c40414c473f2cbb49113cee6",
    );
    await queryRunner.query("DROP TABLE student_answer");
    await queryRunner.query("DROP TABLE material_question");
    await queryRunner.query("DROP TABLE student_course_step_material_progress");
    await queryRunner.query("DROP TABLE course_step_material");
    await queryRunner.query("DROP TABLE session_material");
  }
}
