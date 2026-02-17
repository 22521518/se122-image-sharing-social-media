import { Test, TestingModule } from '@nestjs/testing';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from '../services/admin-reports.service';
import { ReportStatus, TargetType, ModerationAction } from '@prisma/client';

/**
 * Admin Reports Controller Tests (Story 8.3)
 * Tests HTTP layer logic, guards, and request handling
 */
describe('AdminReportsController', () => {
  let controller: AdminReportsController;
  let service: AdminReportsService;

  const mockAdminReportsService = {
    getReports: jest.fn(),
    banUser: jest.fn(),
    warnUser: jest.fn(),
    dismissReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReportsController],
      providers: [
        {
          provide: AdminReportsService,
          useValue: mockAdminReportsService,
        },
      ],
    }).compile();

    controller = module.get<AdminReportsController>(AdminReportsController);
    service = module.get<AdminReportsService>(AdminReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getReports', () => {
    const mockReportsResponse = {
      reports: [
        {
          id: 'report-1',
          targetType: TargetType.POST,
          targetId: 'post-1',
          reason: 'SPAM',
          description: null,
          status: ReportStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          reporter: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
          moderationHistory: [],
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    it('should call service with default pagination when no params provided', async () => {
      mockAdminReportsService.getReports.mockResolvedValue(mockReportsResponse);

      await controller.getReports({});

      expect(service.getReports).toHaveBeenCalledWith('ALL', 1, 20);
    });

    it('should parse status filter correctly', async () => {
      mockAdminReportsService.getReports.mockResolvedValue(mockReportsResponse);

      await controller.getReports({ status: 'PENDING' });

      expect(service.getReports).toHaveBeenCalledWith('PENDING', 1, 20);
    });

    it('should parse page and limit correctly', async () => {
      mockAdminReportsService.getReports.mockResolvedValue(mockReportsResponse);

      await controller.getReports({ status: 'ALL', page: 2, limit: 10 });

      expect(service.getReports).toHaveBeenCalledWith('ALL', 2, 10);
    });

    it('should use default values for missing params', async () => {
      mockAdminReportsService.getReports.mockResolvedValue(mockReportsResponse);

      await controller.getReports({ status: 'PENDING' });

      expect(service.getReports).toHaveBeenCalledWith('PENDING', 1, 20);
    });
  });

  describe('banUser', () => {
    const mockBanResult = { success: true, bannedUntil: null };
    const mockRequest = { user: { id: 'admin-1' } };

    it('should call service with admin id from request', async () => {
      mockAdminReportsService.banUser.mockResolvedValue(mockBanResult);

      await controller.banUser(mockRequest, 'user-1', { reason: 'Spam' });

      expect(service.banUser).toHaveBeenCalledWith('admin-1', 'user-1', { reason: 'Spam' });
    });

    it('should pass duration for temporary ban', async () => {
      mockAdminReportsService.banUser.mockResolvedValue({ success: true, bannedUntil: new Date() });

      await controller.banUser(mockRequest, 'user-1', { reason: 'Spam', duration: 7 });

      expect(service.banUser).toHaveBeenCalledWith('admin-1', 'user-1', { reason: 'Spam', duration: 7 });
    });
  });

  describe('warnUser', () => {
    const mockWarnResult = { success: true };
    const mockRequest = { user: { id: 'admin-1' } };

    it('should call service with admin id and warning reason', async () => {
      mockAdminReportsService.warnUser.mockResolvedValue(mockWarnResult);

      await controller.warnUser(mockRequest, 'user-1', { reason: 'First warning' });

      expect(service.warnUser).toHaveBeenCalledWith('admin-1', 'user-1', { reason: 'First warning' });
    });
  });

  describe('dismissReport', () => {
    const mockDismissResult = { success: true };
    const mockRequest = { user: { id: 'admin-1' } };

    it('should call service with admin id and report id', async () => {
      mockAdminReportsService.dismissReport.mockResolvedValue(mockDismissResult);

      await controller.dismissReport(mockRequest, 'report-1', { notes: 'False alarm' });

      expect(service.dismissReport).toHaveBeenCalledWith('admin-1', 'report-1', 'False alarm');
    });

    it('should handle dismiss without notes', async () => {
      mockAdminReportsService.dismissReport.mockResolvedValue(mockDismissResult);

      await controller.dismissReport(mockRequest, 'report-1', {});

      expect(service.dismissReport).toHaveBeenCalledWith('admin-1', 'report-1', undefined);
    });
  });
});
