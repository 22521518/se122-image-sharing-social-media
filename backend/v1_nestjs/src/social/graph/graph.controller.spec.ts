import { Test, TestingModule } from '@nestjs/testing';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

describe('GraphController', () => {
  let controller: GraphController;
  let service: GraphService;

  const mockGraphService = {
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphController],
      providers: [
        { provide: GraphService, useValue: mockGraphService },
      ],
    }).compile();

    controller = module.get<GraphController>(GraphController);
    service = module.get<GraphService>(GraphService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('followUser', () => {
    it('should call service.followUser', async () => {
      const followerId = 'user1';
      const followingId = 'user2';
      // Mock request object to get followerId (usually from JWT/limit)
      // Assuming controller uses @Req() or @User() decorator. 
      // For now, let's assume standard auth pattern.
      const mockRequest = { user: { id: followerId } };

      await controller.followUser(followingId, mockRequest);
      expect(service.followUser).toHaveBeenCalledWith(followerId, followingId);
    });
  });

  describe('unfollowUser', () => {
    it('should call service.unfollowUser', async () => {
      const followerId = 'user1';
      const followingId = 'user2';
      const mockRequest = { user: { id: followerId } };

      await controller.unfollowUser(followingId, mockRequest);
      expect(service.unfollowUser).toHaveBeenCalledWith(followerId, followingId);
    });
  });
});
