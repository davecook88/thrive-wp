import { User } from "../entities/user.entity.js";
import { Admin } from "../entities/admin.entity.js";
import { Teacher } from "../../teachers/entities/teacher.entity.js";

export class UserResponseDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
  admin?: AdminResponseDto;
  teacher?: TeacherResponseDto;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;

    if (user.admin) {
      dto.admin = AdminResponseDto.fromEntity(user.admin);
    }

    if (user.teacher) {
      dto.teacher = TeacherResponseDto.fromEntity(user.teacher);
    }

    return dto;
  }
}

export class AdminResponseDto {
  id: number;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(admin: Admin): AdminResponseDto {
    const dto = new AdminResponseDto();
    dto.id = admin.id;
    dto.role = admin.role;
    dto.isActive = admin.isActive;
    dto.createdAt = admin.createdAt;
    dto.updatedAt = admin.updatedAt;
    return dto;
  }
}

export class TeacherResponseDto {
  id: number;
  tier: number;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(teacher: Teacher): TeacherResponseDto {
    const dto = new TeacherResponseDto();
    dto.id = teacher.id;
    dto.tier = teacher.tier;
    dto.bio = teacher.bio;
    dto.isActive = teacher.isActive;
    dto.createdAt = teacher.createdAt;
    dto.updatedAt = teacher.updatedAt;
    return dto;
  }
}

export class PaginatedUsersResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
