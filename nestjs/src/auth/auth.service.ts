import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AuthProvider, UserRole } from '../users/entities/user.entity.js';

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
      if (!user.externalId) {
        user.externalId = profile.id;
        dirty = true;
      }
      if (user.authProvider !== AuthProvider.GOOGLE) {
        user.authProvider = AuthProvider.GOOGLE;
        dirty = true;
      }
      if (dirty) {
        await this.usersRepo.save(user);
      }
      return user;
    }

    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;

    user = this.usersRepo.create({
      email,
      firstName,
      lastName,
      authProvider: AuthProvider.GOOGLE,
      externalId: profile.id,
      role: UserRole.STUDENT,
      emailVerified: true,
      isActive: true,
      preferredLanguage: 'en',
    });
    await this.usersRepo.save(user);
    this.logger.log(`Created new Google user ${email}`);
    return user;
  }
}
