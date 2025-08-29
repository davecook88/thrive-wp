import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { Teacher } from '../teachers/entities/teacher.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Repository<User>;
  let adminRepo: Repository<Admin>;
  let teacherRepo: Repository<Teacher>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Admin),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Teacher),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    adminRepo = module.get<Repository<Admin>>(getRepositoryToken(Admin));
    teacherRepo = module.get<Repository<Teacher>>(getRepositoryToken(Teacher));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsersPaginated', () => {
    it('should return paginated users with admin and teacher joins', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        admin: {
          id: 1,
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        teacher: null,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      jest
        .spyOn(userRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUsersPaginated({
        page: 1,
        limit: 10,
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.users[0].email).toBe('test@example.com');
      expect(result.users[0].admin?.role).toBe('admin');
    });

    it('should apply search filter', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(userRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.getUsersPaginated({
        page: 1,
        limit: 10,
        search: 'john',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: '%john%' },
      );
    });

    it('should apply role filter for admin', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(userRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.getUsersPaginated({
        page: 1,
        limit: 10,
        role: 'admin',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'admin.id IS NOT NULL AND admin.isActive = 1',
      );
    });
  });
});
