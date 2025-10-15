import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service.js';
import { User } from '../users/entities/user.entity.js';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserRoles', () => {
    it('should return admin role when user is admin', async () => {
      // Mock the query method to return admin role
      jest.spyOn(userRepo, 'query').mockResolvedValue([{ role: 'admin' }]);

      const roles = await service.getUserRoles(1);
      expect(roles).toEqual(['admin']);
    });

    it('should return teacher role when user is teacher', async () => {
      // Mock the query method to return teacher role
      jest.spyOn(userRepo, 'query').mockResolvedValue([{ role: 'teacher' }]);

      const roles = await service.getUserRoles(1);
      expect(roles).toEqual(['teacher']);
    });

    it('should return both roles when user is admin and teacher', async () => {
      // Mock the query method to return both roles
      jest
        .spyOn(userRepo, 'query')
        .mockResolvedValue([{ role: 'admin' }, { role: 'teacher' }]);

      const roles = await service.getUserRoles(1);
      expect(roles).toEqual(['admin', 'teacher']);
    });

    it('should return empty array when user has no roles', async () => {
      // Mock the query method to return empty result
      jest.spyOn(userRepo, 'query').mockResolvedValue([]);

      const roles = await service.getUserRoles(1);
      expect(roles).toEqual([]);
    });
  });
});
