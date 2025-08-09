import { Injectable, Logger } from '@nestjs/common';
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
}
