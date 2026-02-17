import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, AdminAction } from '@prisma/client';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    refreshToken: {
      updateMany: jest.Mock;
    };
  };

  const mockAdmin = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.admin,
    isLocked: false,
    tokenVersion: 0,
  };

  const mockUser = {
    id: 'user-uuid',
    email: 'user@example.com',
    name: 'Regular User',
    role: UserRole.user,
    isLocked: false,
    tokenVersion: 0,
    createdAt: new Date(),
    _count: { posts: 5, memories: 3, followers: 10, following: 8 },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should return paginated users', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.searchUsers('user', 1, 20);

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('should search by email or name', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.searchUsers('test@example.com', 1, 20);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { email: { contains: 'test@example.com' } },
              { name: { contains: 'test@example.com' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('getUserDetails', () => {
    it('should return user details', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserDetails('user-uuid');

      expect(result.id).toBe('user-uuid');
      expect(result.postCount).toBe(5);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetails('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRoles', () => {
    it('should update user role successfully', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockAdmin) // Admin lookup
        .mockResolvedValueOnce(mockUser); // Target user lookup
      prisma.user.update.mockResolvedValue({ ...mockUser, role: UserRole.moderator });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateRoles('admin-uuid', 'user-uuid', [UserRole.moderator]);

      expect(result.success).toBe(true);
      expect(result.role).toBe(UserRole.moderator);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AdminAction.ROLE_CHANGE,
          }),
        }),
      );
    });

    it('should throw ForbiddenException when admin tries to remove own admin role (AC 7)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        service.updateRoles('admin-uuid', 'admin-uuid', [UserRole.user]),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateRoles('admin-uuid', 'admin-uuid', [UserRole.user]),
      ).rejects.toThrow('Cannot remove your own admin role');
    });

    it('should allow admin to keep own admin role', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdmin);
      prisma.user.update.mockResolvedValue(mockAdmin);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateRoles('admin-uuid', 'admin-uuid', [UserRole.admin]);

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if target user not found', async () => {
      // Since adminId !== targetUserId, the self-check is skipped
      // Only one findUnique call is made for the target user
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRoles('admin-uuid', 'invalid-id', [UserRole.moderator]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setAccountLock', () => {
    it('should lock user account and increment tokenVersion (AC 4)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, isLocked: true, tokenVersion: 1 });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.setAccountLock('admin-uuid', 'user-uuid', true);

      expect(result.success).toBe(true);
      expect(result.isLocked).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isLocked: true,
            tokenVersion: 1, // Incremented for immediate logout
          }),
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-uuid' },
          data: { revoked: true },
        }),
      );
    });

    it('should unlock user account without changing tokenVersion', async () => {
      const lockedUser = { ...mockUser, isLocked: true, tokenVersion: 1 };
      prisma.user.findUnique.mockResolvedValue(lockedUser);
      prisma.user.update.mockResolvedValue({ ...lockedUser, isLocked: false });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.setAccountLock('admin-uuid', 'user-uuid', false);

      expect(result.success).toBe(true);
      expect(result.isLocked).toBe(false);
      // tokenVersion should NOT be incremented on unlock
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isLocked: false }, // No tokenVersion change
        }),
      );
    });

    it('should throw ForbiddenException when trying to lock own account', async () => {
      await expect(
        service.setAccountLock('admin-uuid', 'admin-uuid', true),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.setAccountLock('admin-uuid', 'admin-uuid', true),
      ).rejects.toThrow('Cannot lock your own account');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setAccountLock('admin-uuid', 'invalid-id', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log account lock action to AuditLog (AC 6)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, isLocked: true });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.auditLog.create.mockResolvedValue({});

      await service.setAccountLock('admin-uuid', 'user-uuid', true);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId: 'admin-uuid',
            targetUserId: 'user-uuid',
            action: AdminAction.ACCOUNT_LOCK,
          }),
        }),
      );
    });
  });

  describe('getAuditLog', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: 'log-1', action: AdminAction.ROLE_CHANGE, createdAt: new Date() },
      ];
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLog(undefined, 1, 50);

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by targetUserId', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLog('user-uuid', 1, 50);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetUserId: 'user-uuid' },
        }),
      );
    });
  });
});
