import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { UserResponse, PaginatedUsersResponse } from "@thrive/shared";
import { User } from "./entities/user.entity.js";
import { Admin } from "./entities/admin.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";

export interface GetUsersOptions {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}

  async getUsersPaginated(
    options: GetUsersOptions,
  ): Promise<PaginatedUsersResponse> {
    const { page, limit, search, role } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = this.usersRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.admin", "admin")
      .leftJoinAndSelect("user.teacher", "teacher")
      .where("user.deletedAt IS NULL")
      .orderBy("user.createdAt", "DESC")
      .skip(offset)
      .take(limit);

    // Apply search filter
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        "(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)",
        { search: `%${search}%` },
      );
    }

    // Apply role filter
    if (role) {
      if (role === "admin") {
        queryBuilder = queryBuilder.andWhere(
          "admin.id IS NOT NULL AND admin.isActive = 1",
        );
      } else if (role === "teacher") {
        queryBuilder = queryBuilder.andWhere(
          "teacher.id IS NOT NULL AND teacher.isActive = 1",
        );
      }
    }

    // Get paginated results
    const [_users, total] = await queryBuilder.getManyAndCount();

    const users: UserResponse[] = _users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      admin: u.admin
        ? {
            id: u.admin.id,
            role: u.admin.role,
            isActive:
              typeof u.admin.isActive === "number"
                ? Boolean(u.admin.isActive)
                : u.admin.isActive,
            createdAt: u.admin.createdAt.toISOString(),
            updatedAt: u.admin.updatedAt.toISOString(),
          }
        : undefined,
      teacher: u.teacher ? u.teacher.toPublicDto() : undefined,
    }));

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async makeUserAdmin(userId: number): Promise<UserResponse> {
    // Find the user
    const user = await this.usersRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ["admin", "teacher"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is already an admin
    if (user.admin) {
      throw new ConflictException("User is already an admin");
    }

    // Create admin record
    const admin = this.adminRepo.create({
      userId: user.id,
      role: "admin",
      isActive: true,
    });

    await this.adminRepo.save(admin);

    // Reload user with admin relation
    const updatedUser = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ["admin", "teacher"],
    });

    if (!updatedUser) {
      throw new NotFoundException("User not found after update");
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      admin: updatedUser.admin
        ? {
            id: updatedUser.admin.id,
            role: updatedUser.admin.role,
            isActive:
              typeof updatedUser.admin.isActive === "number"
                ? Boolean(updatedUser.admin.isActive)
                : updatedUser.admin.isActive,
            createdAt: updatedUser.admin.createdAt.toISOString(),
            updatedAt: updatedUser.admin.updatedAt.toISOString(),
          }
        : undefined,
      teacher: updatedUser.teacher
        ? updatedUser.teacher.toPublicDto()
        : undefined,
    };
  }

  async makeUserTeacher(userId: number): Promise<UserResponse> {
    // Find the user
    const user = await this.usersRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ["admin", "teacher"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is already a teacher
    if (user.teacher) {
      throw new ConflictException("User is already a teacher");
    }

    // Create teacher record
    const teacher = this.teacherRepo.create({
      userId: user.id,
      tier: 10, // Default tier
      bio: null,
      isActive: true,
    });

    await this.teacherRepo.save(teacher);

    // Reload user with teacher relation
    const updatedUser = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ["admin", "teacher"],
    });

    if (!updatedUser) {
      throw new NotFoundException("User not found after update");
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      admin: updatedUser.admin
        ? {
            id: updatedUser.admin.id,
            role: updatedUser.admin.role,
            isActive:
              typeof updatedUser.admin.isActive === "number"
                ? Boolean(updatedUser.admin.isActive)
                : updatedUser.admin.isActive,
            createdAt: updatedUser.admin.createdAt.toISOString(),
            updatedAt: updatedUser.admin.updatedAt.toISOString(),
          }
        : undefined,
      teacher: updatedUser.teacher
        ? updatedUser.teacher.toPublicDto()
        : undefined,
    };
  }

  async findById(userId: number): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ["admin", "teacher", "student"],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ["admin", "teacher"],
    });
  }

  async demoteFromTeacher(userId: number): Promise<UserResponse> {
    // Find the user
    const user = await this.usersRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ["admin", "teacher"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is a teacher
    if (!user.teacher) {
      throw new ConflictException("User is not a teacher");
    }

    // Set teacher as inactive
    user.teacher.isActive = false;
    await this.teacherRepo.save(user.teacher);

    // Reload user with updated relation
    const updatedUser = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ["admin", "teacher"],
    });

    if (!updatedUser) {
      throw new NotFoundException("User not found after update");
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      admin: updatedUser.admin
        ? {
            id: updatedUser.admin.id,
            role: updatedUser.admin.role,
            isActive:
              typeof updatedUser.admin.isActive === "number"
                ? Boolean(updatedUser.admin.isActive)
                : updatedUser.admin.isActive,
            createdAt: updatedUser.admin.createdAt.toISOString(),
            updatedAt: updatedUser.admin.updatedAt.toISOString(),
          }
        : undefined,
      teacher: updatedUser.teacher
        ? updatedUser.teacher.toPublicDto()
        : undefined,
    };
  }

  async updateProfile(
    userId: number,
    dto: { firstName?: string; lastName?: string; avatarUrl?: string | null },
  ): Promise<UserResponse> {
    const user = await this.usersRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ["admin", "teacher"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    const updatedUser = await this.usersRepo.save(user);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      avatarUrl: updatedUser.avatarUrl,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      admin: updatedUser.admin
        ? {
            id: updatedUser.admin.id,
            role: updatedUser.admin.role,
            isActive:
              typeof updatedUser.admin.isActive === "number"
                ? Boolean(updatedUser.admin.isActive)
                : updatedUser.admin.isActive,
            createdAt: updatedUser.admin.createdAt.toISOString(),
            updatedAt: updatedUser.admin.updatedAt.toISOString(),
          }
        : undefined,
      teacher: updatedUser.teacher
        ? updatedUser.teacher.toPublicDto()
        : undefined,
    };
  }
}
