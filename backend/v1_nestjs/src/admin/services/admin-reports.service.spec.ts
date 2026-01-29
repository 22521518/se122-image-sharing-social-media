import { Test, TestingModule } from '@nestjs/testing';
import { AdminReportsService } from './admin-reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ReportStatus, TargetType, AdminAction, ModerationAction } from '@prisma/client';

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    report: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    moderationLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AdminReportsService>(AdminReportsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getReports', () => {
    it('should return paginated reports with full moderation history (AC 2)', async () => {
      const mockReports = [
        {
          id: 'report-1',
          targetType: TargetType.POST,
          targetId: 'post-1',
          reason: 'SPAM',
          description: 'Test description',
          status: ReportStatus.PENDING,
          reporterId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockReporter = { id: 'user-1', name: 'Test User', email: 'test@test.com' };
      const mockPost = {
        id: 'post-1',
        content: 'Test post',
        author: { id: 'author-1', name: 'Author', email: 'author@test.com' },
      };
      const mockModerationLogs = [
        {
          id: 'log-1',
          action: ModerationAction.APPROVE,
          notes: 'Test notes',
          moderatorId: 'mod-1',
          createdAt: new Date(),
        },
      ];
      const mockModerator = { name: 'Moderator' };

      mockPrismaService.report.findMany.mockResolvedValue(mockReports);
      mockPrismaService.report.count.mockResolvedValue(1);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockReporter)
        .mockResolvedValueOnce(mockModerator);
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.moderationLog.findMany.mockResolvedValue(mockModerationLogs);

      const result = await service.getReports('ALL', 1, 20);

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].moderationHistory).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by status when specified', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);
      mockPrismaService.report.count.mockResolvedValue(0);

      await service.getReports(ReportStatus.PENDING, 1, 20);

      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ReportStatus.PENDING },
        }),
      );
    });
  });

  describe('banUser', () => {
    const adminId = 'admin-1';
    const targetUserId = 'user-1';

    it('should prevent self-ban (AC 3 security)', async () => {
      await expect(
        service.banUser(adminId, adminId, { reason: 'Self-ban attempt' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.banUser(adminId, targetUserId, { reason: 'Ban reason' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should ban user permanently when no duration specified (AC 5)', async () => {
      const mockUser = { id: targetUserId, isBanned: false, tokenVersion: 0, role: 'user' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isBanned: true });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.banUser(adminId, targetUserId, { reason: 'Permanent ban' });

      expect(result.success).toBe(true);
      expect(result.bannedUntil).toBeNull();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBanned: true,
            bannedUntil: null,
          }),
        }),
      );
    });

    it('should ban user temporarily when duration specified (AC 5)', async () => {
      const mockUser = { id: targetUserId, isBanned: false, tokenVersion: 0, role: 'user' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isBanned: true });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.banUser(adminId, targetUserId, { reason: 'Temp ban', duration: 7 });

      expect(result.success).toBe(true);
      expect(result.bannedUntil).toBeInstanceOf(Date);
    });

    it('should log ban action in AuditLog (AC 6)', async () => {
      const mockUser = { id: targetUserId, isBanned: false, tokenVersion: 0, role: 'user' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isBanned: true });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.banUser(adminId, targetUserId, { reason: 'Ban reason' });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId,
            targetUserId,
            action: AdminAction.USER_BAN,
          }),
        }),
      );
    });

    it('should send SYSTEM_WARN notification to banned user (Story 9.2 AC 3-4)', async () => {
      const mockUser = { id: targetUserId, isBanned: false, tokenVersion: 0, role: 'user' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isBanned: true });
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.banUser(adminId, targetUserId, { reason: 'Violation of ToS', duration: 7 });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: targetUserId,
          type: 'SYSTEM_WARN',
          title: 'Account Banned',
          message: expect.stringContaining('Violation of ToS'),
        }),
      );
    });
  });

  describe('warnUser', () => {
    const adminId = 'admin-1';
    const targetUserId = 'user-1';

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.warnUser(adminId, targetUserId, { reason: 'Warning' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log warning in AuditLog (AC 6)', async () => {
      const mockUser = { id: targetUserId };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.warnUser(adminId, targetUserId, { reason: 'Warning reason' });

      expect(result.success).toBe(true);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adminId,
            targetUserId,
            action: AdminAction.USER_WARN,
          }),
        }),
      );
    });

    it('should send SYSTEM_WARN notification to warned user (Story 9.2 AC 3-4)', async () => {
      const mockUser = { id: targetUserId };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.warnUser(adminId, targetUserId, { reason: 'Inappropriate behavior' });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: targetUserId,
          type: 'SYSTEM_WARN',
          title: 'Account Warning ⚠️',
          message: expect.stringContaining('Inappropriate behavior'),
        }),
      );
    });
  });

  describe('dismissReport', () => {
    const adminId = 'admin-1';
    const reportId = 'report-1';

    it('should throw NotFoundException for non-existent report', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);

      await expect(
        service.dismissReport(adminId, reportId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update report status to DISMISSED (AC 4)', async () => {
      const mockReport = {
        id: reportId,
        targetType: TargetType.POST,
        targetId: 'post-1',
        status: ReportStatus.PENDING,
      };
      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaService.report.update.mockResolvedValue({ ...mockReport, status: ReportStatus.DISMISSED });
      mockPrismaService.moderationLog.create.mockResolvedValue({});

      const result = await service.dismissReport(adminId, reportId, 'Dismissed notes');

      expect(result.success).toBe(true);
      expect(mockPrismaService.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ReportStatus.DISMISSED },
        }),
      );
    });

    it('should create moderation log entry', async () => {
      const mockReport = {
        id: reportId,
        targetType: TargetType.POST,
        targetId: 'post-1',
        status: ReportStatus.PENDING,
      };
      mockPrismaService.report.findUnique.mockResolvedValue(mockReport);
      mockPrismaService.report.update.mockResolvedValue({ ...mockReport, status: ReportStatus.DISMISSED });
      mockPrismaService.moderationLog.create.mockResolvedValue({});

      await service.dismissReport(adminId, reportId);

      expect(mockPrismaService.moderationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            moderatorId: adminId,
            reportId,
            action: ModerationAction.APPROVE,
          }),
        }),
      );
    });
  });
});
