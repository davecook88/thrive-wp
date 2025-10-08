import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @IsString()
  startTime: string; // 'HH:mm'

  @IsString()
  endTime: string; // 'HH:mm'
}

export class AvailabilityExceptionDto {
  @IsString()
  date: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  startTime?: string; // 'HH:mm'

  @IsOptional()
  @IsString()
  endTime?: string; // 'HH:mm'

  @IsOptional()
  isBlackout?: boolean;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityRuleDto)
  rules: AvailabilityRuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityExceptionDto)
  exceptions?: AvailabilityExceptionDto[];
}

export class PreviewMyAvailabilityDto {
  @IsString()
  start: string; // ISO date

  @IsString()
  end: string; // ISO date
}

export class PreviewAvailabilityDto {
  @IsString()
  start: string; // ISO date

  @IsString()
  end: string; // ISO date

  @IsArray()
  teacherIds: number[];
}
