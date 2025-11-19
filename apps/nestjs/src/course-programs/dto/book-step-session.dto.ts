import { IsNumber, IsOptional, IsString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for booking a single course step session
 */
export class BookStepSessionDto {
  @IsNumber()
  courseStepOptionId: number;
}

/**
 * DTO for changing an existing course step session
 */
export class ChangeStepSessionDto {
  @IsNumber()
  courseStepOptionId: number;
}

/**
 * DTO for cancelling a course step booking
 */
export class CancelStepBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Individual step selection for bulk booking
 */
export class StepSelectionDto {
  @IsNumber()
  courseStepId: number;

  @IsNumber()
  courseStepOptionId: number;
}

/**
 * DTO for bulk booking multiple course step sessions
 */
export class BulkBookSessionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepSelectionDto)
  selections: StepSelectionDto[];
}
