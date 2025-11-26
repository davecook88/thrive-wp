import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAvatarUrlToUser1774000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "user",
      new TableColumn({
        name: "avatar_url",
        type: "varchar",
        length: "500",
        isNullable: true,
        comment: "URL to user profile picture",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("user", "avatar_url");
  }
}
