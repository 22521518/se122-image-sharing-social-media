import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ModerationService', () => {
  let service: ModerationService;

  const mockPrismaService = {
    report: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    moderationLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPostQueue', () => {
    it('should return posts sorted by report count', async () => {
      const mockReports = [
        { id: 'r1', targetType: 'POST', targetId: 'p1', reporterId: 'u1', reason: 'SPAM', status: 'PENDING', createdAt: new Date() },
        { id: 'r2', targetType: 'POST', targetId: 'p1', reporterId: 'u2', reason: 'SPAM', status: 'PENDING', createdAt: new Date() },
        { id: 'r3', targetType: 'POST', targetId: 'p2', reporterId: 'u3', reason: 'HARASSMENT', status: 'PENDING', createdAt: new Date() },
      ];

      mockPrismaService.report.findMany.mockResolvedValue(mockReports);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', name: 'User 1', email: 'u1@test.com' });
      mockPrismaService.post.findUnique.mockResolvedValue({
        id: 'p1',
        content: 'Test post',
        author: { id: 'a1', name: 'Author 1' },
      });

      const result = await service.getPostQueue('PENDING');

      expect(result).toHaveLength(2);
      expect(result[0].reportCount).toBe(2); // p1 has 2 reports
      expect(result[1].reportCount).toBe(1); // p2 has 1 report
    });

    it('should filter by status', async () => {
      mockPrismaService.report.findMany.mockResolvedValue([]);

      await service.getPostQueue('RESOLVED');

      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetType: 'POST', status: 'RESOLVED' },
        })
      );
    });
  });

  describe('resolveReport', () => {
    const moderatorId = 'mod-uuid';
    const reportId = 'report-uuid';
    const dto = { action: 'HIDE' as const, notes: 'Spam content' };

    it('should resolve report and log action', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'POST',
        targetId: 'post-uuid',
        status: 'PENDING',
      });

      mockPrismaService.report.update.mockResolvedValue({
        id: reportId,
        status: 'RESOLVED',
      });

      mockPrismaService.report.updateMany.mockResolvedValue({ count: 0 });

      mockPrismaService.post.update.mockResolvedValue({});

      mockPrismaService.moderationLog.create.mockResolvedValue({
        id: 'log-uuid',
        moderatorId,
        action: 'HIDE',
      });

      const result = await service.resolveReport(reportId, moderatorId, dto);

      expect(result.action).toBe('HIDE');
      expect(result.status).toBe('RESOLVED');
      expect(result.logId).toBe('log-uuid');
      expect(mockPrismaService.moderationLog.create).toHaveBeenCalled();
    });

    it('should dismiss report when action is APPROVE', async () => {
      const approveDto = { action: 'APPROVE' as const };

      mockPrismaService.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'POST',
        targetId: 'post-uuid',
        status: 'PENDING',
      });

      mockPrismaService.report.update.mockResolvedValue({
        id: reportId,
        status: 'DISMISSED',
      });

      mockPrismaService.report.updateMany.mockResolvedValue({ count: 0 });

      mockPrismaService.moderationLog.create.mockResolvedValue({
        id: 'log-uuid',
      });

      const result = await service.resolveReport(reportId, moderatorId, approveDto);

      expect(result.status).toBe('DISMISSED');
    });

    it('should throw NotFoundException for non-existent report', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveReport(reportId, moderatorId, dto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already resolved report', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({
        id: reportId,
        status: 'RESOLVED',
      });

      await expect(
        service.resolveReport(reportId, moderatorId, dto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should soft delete post when action is HIDE or DELETE', async () => {
      mockPrismaService.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'POST',
        targetId: 'post-uuid',
        status: 'PENDING',
      });

      mockPrismaService.report.update.mockResolvedValue({ id: reportId, status: 'RESOLVED' });
      mockPrismaService.report.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.post.update.mockResolvedValue({});
      mockPrismaService.moderationLog.create.mockResolvedValue({ id: 'log-uuid' });

      await service.resolveReport(reportId, moderatorId, { action: 'DELETE' });

      expect(mockPrismaService.post.update).toHaveBeenCalledWith({
        where: { id: 'post-uuid' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('getCommentQueue', () => {
    it('should return comments sorted by report count', async () => {
      const mockReports = [
        { id: 'r1', targetType: 'COMMENT', targetId: 'c1', reporterId: 'u1', reason: 'HARASSMENT', status: 'PENDING', createdAt: new Date() },
      ];

      mockPrismaService.report.findMany.mockResolvedValue(mockReports);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', name: 'User 1', email: 'u1@test.com' });
      mockPrismaService.comment.findUnique.mockResolvedValue({
        id: 'c1',
        content: 'Test comment',
        user: { id: 'a1', name: 'Author 1' },
        post: { id: 'p1', content: 'Parent post' },
      });

      const result = await service.getCommentQueue('PENDING');

      expect(result).toHaveLength(1);
      expect(result[0].content?.text).toBe('Test comment');
    });
  });

  describe('lockPostComments', () => {
    it('should create a moderation log for locking', async () => {
      const postId = 'post-uuid';
      const moderatorId = 'mod-uuid';

      mockPrismaService.post.findUnique.mockResolvedValue({ id: postId });
      mockPrismaService.moderationLog.create.mockResolvedValue({});

      await service.lockPostComments(postId, moderatorId);

      expect(mockPrismaService.moderationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          moderatorId,
          targetType: 'POST',
          targetId: postId,
          action: 'LOCK',
        }),
      });
    });

    it('should throw NotFoundException for non-existent post', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(
        service.lockPostComments('nonexistent', 'mod-uuid')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
