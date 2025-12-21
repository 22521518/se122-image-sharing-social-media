import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { User, PrivacyLevel } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const mockUser: User = {
    id: 'uuid-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    name: 'Test User',
    bio: null,
    avatarUrl: null,
    googleId: null,
    defaultPrivacy: 'private' as PrivacyLevel,
    privacySettings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null if not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('uuid-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid-123' } });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create and return new user', async () => {
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update user and return updated user', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, name: 'Updated Name' });

      const result = await service.update('uuid-123', { name: 'Updated Name' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: { name: 'Updated Name' },
      });
      expect(result?.name).toBe('Updated Name');
    });
  });
});
