import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";

export class TeacherLocationDto {
  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class UpdateTeacherProfileDto {
  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.avatarUrl !== null && o.avatarUrl !== "")
  @IsString()
  @Matches(/^https?:\/\/.+/, {
    message: "avatarUrl must be a valid URL starting with http:// or https://",
  })
  avatarUrl?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => TeacherLocationDto)
  birthplace?: TeacherLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TeacherLocationDto)
  currentLocation?: TeacherLocationDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesSpoken?: string[];
}
