import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsString()
  teacher: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
