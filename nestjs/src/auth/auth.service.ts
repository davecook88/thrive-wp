import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Admin } from '../admin/entities/admin.entity.js';
import { Teacher } from '../teachers/entities/teacher.entity.js';

interface GoogleProfileLike {
  id: string;
  emails?: { value: string }[];
  name?: { givenName?: string; familyName?: string };
  displayName?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}

  private checkDirtyGoogleUser(
    profile: GoogleProfileLike,
    user: User,
  ): User | null {
    let dirty = false;

    if (user.firstName !== profile.name?.givenName) {
      user.firstName = profile.name?.givenName ?? '';
      dirty = true;
    }
    if (user.lastName !== profile.name?.familyName) {
      user.lastName = profile.name?.familyName ?? '';
      dirty = true;
    }
    return dirty ? user : null;
  }

  async validateGoogleUser(profile: GoogleProfileLike): Promise<User> {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    console.log('Google profile:', profile);
    if (!email) {
      throw new Error('Google profile missing email');
    }

    // Use upsert to handle both create and update in a single query
    const firstName = profile.name?.givenName ?? '';
    const lastName = profile.name?.familyName ?? '';

    await this.usersRepo.upsert(
      {
        email,
        firstName,
        lastName,
      },
      {
        conflictPaths: ['email'],
        skipUpdateIfNoValuesChanged: true,
      },
    );

    // Fetch the user (will exist after upsert)
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new Error('Failed to create or find user');
    }

    this.logger.log(`Processed Google user ${email}`);
    return user;
  }

  async registerLocal(
    email: string,
    password: string,
    firstName = '',
    lastName = '',
  ): Promise<User> {
    email = email.toLowerCase();

    // Check if user already exists with password
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing && existing.passwordHash) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
      // Update existing user with password
      existing.passwordHash = passwordHash;
      if (firstName) existing.firstName = firstName;
      if (lastName) existing.lastName = lastName;
      const user = await this.usersRepo.save(existing);
      this.logger.log(`Updated local user ${email}`);
      return user;
    } else {
      // Create new user
      const user = this.usersRepo.create({
        email,
        firstName,
        lastName,
        passwordHash,
      });
      const savedUser = await this.usersRepo.save(user);
      this.logger.log(`Created new local user ${email}`);
      return savedUser;
    }
  }

  async validateLocal(email: string, password: string): Promise<User> {
    email = email.toLowerCase();
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async getUserRoles(userId: number): Promise<string[]> {
    const roles: string[] = [];

    // Single query using UNION to check both admin and teacher roles
    const result = await this.usersRepo.query(
      `
      SELECT 'admin' as role FROM admin WHERE userId = ? AND isActive = 1
      UNION ALL
      SELECT 'teacher' as role FROM teacher WHERE userId = ? AND isActive = 1
    `,
      [userId, userId],
    );

    // Extract roles from the result
    for (const row of result) {
      roles.push(row.role);
    }

    return roles;
  }
}
