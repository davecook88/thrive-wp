import { IsInt, IsPositive } from 'class-validator';

export class MakeAdminDto {
  @IsInt()
  @IsPositive()
  userId: number;
}

export class MakeTeacherDto {
  @IsInt()
  @IsPositive()
  userId: number;
}
