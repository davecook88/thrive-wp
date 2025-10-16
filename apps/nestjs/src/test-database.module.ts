import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TestDataSource } from "./test-data-source.js";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({}),
      dataSourceFactory: async () => {
        if (!TestDataSource.isInitialized) {
          await TestDataSource.initialize();
        }
        return TestDataSource;
      },
    }),
  ],
})
export class TestDatabaseModule {}
