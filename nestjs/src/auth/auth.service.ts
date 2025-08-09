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

  async validateGoogleUser(profile: GoogleProfileLike): Promise<User> {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) {
      throw new Error('Google profile missing email');
    }

    let user = await this.usersRepo.findOne({ where: { email } });
    if (user) {
      let dirty = false;
      return user; // No extended fields to update in minimal schema
    }

    user = this.usersRepo.create({ email });
    await this.usersRepo.save(user);
    this.logger.log(`Created new Google user ${email}`);
    return user;
  }
}
