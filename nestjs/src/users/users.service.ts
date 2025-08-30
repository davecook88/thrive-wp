import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, IsNull } from 'typeorm';
import { User } from './entities/user.entity.js';
import { Admin } from '../admin/entities/admin.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';
import {
  UserResponseDto,
  PaginatedUsersResponseDto,
} from './dto/user-response.dto.js';

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
  ): Promise<PaginatedUsersResponseDto> {
    const { page, limit, search, role } = options;
    const offset = (page - 1) * limit;

    let queryBuilder = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.admin', 'admin')
      .leftJoinAndSelect('user.teacher', 'teacher')
      .where('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    // Apply search filter
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply role filter
    if (role) {
      if (role === 'admin') {
        queryBuilder = queryBuilder.andWhere(
          'admin.id IS NOT NULL AND admin.isActive = 1',
        );
      } else if (role === 'teacher') {
        queryBuilder = queryBuilder.andWhere(
          'teacher.id IS NOT NULL AND teacher.isActive = 1',
        );
      }
    }

    // Get paginated results
    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: users.map((user) => UserResponseDto.fromEntity(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async makeUserAdmin(userId: number): Promise<UserResponseDto> {
    // Find the user
    const user = await this.usersRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ['admin', 'teacher'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already an admin
    if (user.admin) {
      throw new ConflictException('User is already an admin');
    }

    // Create admin record
    const admin = this.adminRepo.create({
      userId: user.id,
      role: 'admin',
      isActive: true,
    });

    await this.adminRepo.save(admin);

    // Reload user with admin relation
    const updatedUser = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['admin', 'teacher'],
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return UserResponseDto.fromEntity(updatedUser);
  }

  async makeUserTeacher(userId: number): Promise<UserResponseDto> {
    // Find the user
    const user = await this.usersRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ['admin', 'teacher'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a teacher
    if (user.teacher) {
      throw new ConflictException('User is already a teacher');
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
      relations: ['admin', 'teacher'],
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return UserResponseDto.fromEntity(updatedUser);
  }
}
