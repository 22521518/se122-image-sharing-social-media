import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAction } from '@prisma/client';

describe('AdminAuditLogsService', () => {
  let service: AdminAuditLogsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockAuditLogs = [
    {
      id: 'log-1',
      adminId: 'admin-1',
      targetUserId: 'user-1',
      action: AdminAction.ROLE_CHANGE,
      details: { previousRole: 'user', newRole: 'moderator' },
      createdAt: new Date('2025-12-27T10:00:00Z'),
    },
    {
      id: 'log-2',
      adminId: 'admin-1',
      targetUserId: 'user-2',
      action: AdminAction.ACCOUNT_LOCK,
      details: { previousLocked: false, newLocked: true },
      createdAt: new Date('2025-12-27T09:00:00Z'),
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminAuditLogsService>(AdminAuditLogsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuditLogs', () => {
    beforeEach(() => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockAuditLogs);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(2);
    });

    it('should return paginated audit logs with correct structure', async () => {
      const result = await service.getAuditLogs({ page: 1, limit: 50 });

      expect(result).toMatchObject({
        logs: expect.arrayContaining([
          expect.objectContaining({
            id: 'log-1',
            adminId: 'admin-1',
            targetUserId: 'user-1',
            action: AdminAction.ROLE_CHANGE,
          }),
        ]),
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should use default pagination values', async () => {
      await service.getAuditLogs({});

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        })
      );
    });

    it('should apply date range filter when startDate provided', async () => {
      const startDate = '2025-12-27T00:00:00Z';
      await service.getAuditLogs({ startDate });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: new Date(startDate),
            }),
          }),
        })
      );
    });

    it('should apply date range filter when endDate provided', async () => {
      const endDate = '2025-12-27T23:59:59Z';
      await service.getAuditLogs({ endDate });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lte: new Date(endDate),
            }),
          }),
        })
      );
    });

    it('should apply actionType filter', async () => {
      await service.getAuditLogs({ actionType: AdminAction.ROLE_CHANGE });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: AdminAction.ROLE_CHANGE,
          }),
        })
      );
    });

    it('should apply targetUserId filter', async () => {
      const targetUserId = 'user-123';
      await service.getAuditLogs({ targetUserId });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetUserId,
          }),
        })
      );
    });

    it('should apply adminId filter', async () => {
      const adminId = 'admin-123';
      await service.getAuditLogs({ adminId });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adminId,
          }),
        })
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      await service.getAuditLogs({
        startDate: '2025-12-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        actionType: AdminAction.ACCOUNT_LOCK,
        targetUserId: 'user-123',
      });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: new Date('2025-12-01T00:00:00Z'),
              lte: new Date('2025-12-31T23:59:59Z'),
            },
            action: AdminAction.ACCOUNT_LOCK,
            targetUserId: 'user-123',
          },
        })
      );
    });

    it('should order logs by createdAt descending', async () => {
      await service.getAuditLogs({});

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should calculate correct pagination', async () => {
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(125);

      const result = await service.getAuditLogs({ page: 2, limit: 50 });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        })
      );
      expect(result.totalPages).toBe(3);
    });
  });

  describe('getActionTypes', () => {
    it('should return all AdminAction enum values', () => {
      const actionTypes = service.getActionTypes();

      expect(actionTypes).toContain(AdminAction.ROLE_CHANGE);
      expect(actionTypes).toContain(AdminAction.ACCOUNT_LOCK);
      expect(actionTypes).toContain(AdminAction.ACCOUNT_UNLOCK);
    });
  });
});
