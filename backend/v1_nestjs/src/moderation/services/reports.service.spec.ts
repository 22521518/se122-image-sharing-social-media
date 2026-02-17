import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TargetType, ReportReason } from '@prisma/client';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    report: {
      create: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    const reporterId = 'reporter-uuid';
    const dto = {
      targetType: 'POST' as TargetType,
      targetId: 'post-uuid',
      reason: 'SPAM' as ReportReason,
      description: 'This is spam content',
    };

    it('should create a report successfully for a post', async () => {
      // Mock post exists
      mockPrismaService.post.findUnique.mockResolvedValue({
        id: dto.targetId,
        deletedAt: null,
      });

      // Mock report creation
      const mockReport = {
        id: 'report-uuid',
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.createReport(reporterId, dto);

      expect(result).toEqual({
        id: mockReport.id,
        targetType: mockReport.targetType,
        targetId: mockReport.targetId,
        reason: mockReport.reason,
        description: mockReport.description,
        status: mockReport.status,
        createdAt: mockReport.createdAt,
      });
      expect(mockPrismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: dto.targetId },
        select: { id: true, deletedAt: true },
      });
    });

    it('should create a report successfully for a comment', async () => {
      const commentDto = {
        ...dto,
        targetType: 'COMMENT' as TargetType,
        targetId: 'comment-uuid',
      };

      mockPrismaService.comment.findUnique.mockResolvedValue({
        id: commentDto.targetId,
        deletedAt: null,
      });

      const mockReport = {
        id: 'report-uuid',
        reporterId,
        targetType: commentDto.targetType,
        targetId: commentDto.targetId,
        reason: commentDto.reason,
        description: commentDto.description,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.createReport(reporterId, commentDto);

      expect(result.targetType).toBe('COMMENT');
      expect(mockPrismaService.comment.findUnique).toHaveBeenCalled();
    });

    it('should create a report successfully for a user', async () => {
      const userDto = {
        ...dto,
        targetType: 'USER' as TargetType,
        targetId: 'user-uuid',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userDto.targetId,
        deletedAt: null,
      });

      const mockReport = {
        id: 'report-uuid',
        reporterId,
        targetType: userDto.targetType,
        targetId: userDto.targetId,
        reason: userDto.reason,
        description: userDto.description,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.report.create.mockResolvedValue(mockReport);

      const result = await service.createReport(reporterId, userDto);

      expect(result.targetType).toBe('USER');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate report (AC 6)', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        id: dto.targetId,
        deletedAt: null,
      });

      // Simulate unique constraint violation
      mockPrismaService.report.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['reporterId', 'targetType', 'targetId'] },
      });

      await expect(service.createReport(reporterId, dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createReport(reporterId, dto)).rejects.toThrow(
        'You have already reported this content',
      );
    });

    it('should throw NotFoundException when target post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.createReport(reporterId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createReport(reporterId, dto)).rejects.toThrow(
        'post not found or has been deleted',
      );
    });

    it('should throw NotFoundException when target post is deleted', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        id: dto.targetId,
        deletedAt: new Date(), // Soft deleted
      });

      await expect(service.createReport(reporterId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to self-report', async () => {
      const selfReportDto = {
        ...dto,
        targetType: 'USER' as TargetType,
        targetId: reporterId, // Same as reporter
      };

      await expect(
        service.createReport(reporterId, selfReportDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createReport(reporterId, selfReportDto),
      ).rejects.toThrow('You cannot report yourself');
    });
  });

  describe('getContentAuthorId', () => {
    it('should return authorId for a post', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        authorId: 'author-uuid',
      });

      const result = await service.getContentAuthorId('POST', 'post-uuid');

      expect(result).toBe('author-uuid');
    });

    it('should return userId for a comment', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        userId: 'commenter-uuid',
      });

      const result = await service.getContentAuthorId('COMMENT', 'comment-uuid');

      expect(result).toBe('commenter-uuid');
    });

    it('should return targetId for a user (the user themselves)', async () => {
      const result = await service.getContentAuthorId('USER', 'user-uuid');

      expect(result).toBe('user-uuid');
    });

    it('should return null when post is not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      const result = await service.getContentAuthorId('POST', 'nonexistent-uuid');

      expect(result).toBeNull();
    });
  });
});
