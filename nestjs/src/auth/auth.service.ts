import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

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

    let user = await this.usersRepo.findOne({ where: { email } });
    if (user) {
      const updatedUser = this.checkDirtyGoogleUser(profile, user);
      if (updatedUser) {
        await this.usersRepo.save(updatedUser);
        this.logger.log(`Updated Google user ${email}`);
      }
      return user; // No extended fields to update in minimal schema
    }

    user = this.usersRepo.create({
      email,
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
    });
    await this.usersRepo.save(user);
    this.logger.log(`Created new Google user ${email}`);
    return user;
  }

  async registerLocal(
    email: string,
    password: string,
    firstName = '',
    lastName = '',
  ): Promise<User> {
    email = email.toLowerCase();
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing && existing.passwordHash) {
      throw new BadRequestException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    let user: User;
    if (existing) {
      existing.passwordHash = passwordHash;
      if (firstName) existing.firstName = firstName;
      if (lastName) existing.lastName = lastName;
      user = await this.usersRepo.save(existing);
    } else {
      user = this.usersRepo.create({
        email,
        firstName,
        lastName,
        passwordHash,
      });
      await this.usersRepo.save(user);
    }
    return user;
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
}
