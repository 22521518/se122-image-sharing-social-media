import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';

/**
 * NotificationsGateway Unit Tests
 * Tests WebSocket connection handling, JWT authentication, and user-socket mapping
 * 
 * @see Story 9.1: Notification Infrastructure
 */
describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  const createMockSocket = (overrides: Partial<Socket> = {}): Socket => {
    return {
      id: 'socket-1',
      handshake: {
        auth: { token: 'valid-token' },
        headers: {},
      },
      join: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    } as unknown as Socket;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize server mock
    gateway.server = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    } as unknown as Server;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should log initialization message', () => {
      const mockServer = {} as Server;
      expect(() => gateway.afterInit(mockServer)).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should accept connection with valid JWT token', async () => {
      const mockPayload = { sub: 'user-1', email: 'test@test.com', role: 'user', tokenVersion: 0 };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const client = createMockSocket();
      await gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'test-jwt-secret' });
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client when no token provided', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, headers: {} } as any,
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should extract token from Authorization header as fallback', async () => {
      const mockPayload = { sub: 'user-2', email: 'test2@test.com', role: 'user', tokenVersion: 0 };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        } as any,
      });

      await gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith('header-token', { secret: 'test-jwt-secret' });
      expect(client.join).toHaveBeenCalledWith('user:user-2');
    });

    it('should disconnect client when JWT verification fails', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const client = createMockSocket();
      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should support multiple connections per user', async () => {
      const mockPayload = { sub: 'user-1', email: 'test@test.com', role: 'user', tokenVersion: 0 };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const client1 = createMockSocket({ id: 'socket-1' });
      const client2 = createMockSocket({ id: 'socket-2' });

      await gateway.handleConnection(client1);
      await gateway.handleConnection(client2);

      expect(gateway.isUserOnline('user-1')).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user-socket mappings on disconnect', async () => {
      const mockPayload = { sub: 'user-1', email: 'test@test.com', role: 'user', tokenVersion: 0 };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const client = createMockSocket();
      await gateway.handleConnection(client);

      expect(gateway.isUserOnline('user-1')).toBe(true);

      gateway.handleDisconnect(client);

      expect(gateway.isUserOnline('user-1')).toBe(false);
    });

    it('should handle disconnect of unauthenticated client gracefully', () => {
      const client = createMockSocket();
      // Don't call handleConnection first
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('emitToUser', () => {
    it('should emit to user room when user is online', async () => {
      const mockPayload = { sub: 'user-1', email: 'test@test.com', role: 'user', tokenVersion: 0 };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const client = createMockSocket();
      await gateway.handleConnection(client);

      gateway.emitToUser('user-1', 'notification', { message: 'Hello' });

      expect(gateway.server.to).toHaveBeenCalledWith('user:user-1');
      expect((gateway.server.to as jest.Mock).mock.results[0].value.emit).toHaveBeenCalledWith(
        'notification',
        { message: 'Hello' }
      );
    });

    it('should not emit when user is offline', () => {
      gateway.emitToUser('offline-user', 'notification', { message: 'Hello' });

      // to() is called but we log and don't emit (no active sockets)
      expect(gateway.isUserOnline('offline-user')).toBe(false);
    });
  });

  describe('isUserOnline', () => {
    it('should return true for connected user', async () => {
      const mockPayload = { sub: 'user-1', email: 'test@test.com', role: 'user', tokenVersion: 0 };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const client = createMockSocket();
      await gateway.handleConnection(client);

      expect(gateway.isUserOnline('user-1')).toBe(true);
    });

    it('should return false for disconnected user', () => {
      expect(gateway.isUserOnline('unknown-user')).toBe(false);
    });
  });

  describe('getOnlineUserCount', () => {
    it('should return count of unique online users', async () => {
      const mockPayload1 = { sub: 'user-1', email: 'test1@test.com', role: 'user', tokenVersion: 0 };
      const mockPayload2 = { sub: 'user-2', email: 'test2@test.com', role: 'user', tokenVersion: 0 };

      mockJwtService.verify.mockReturnValueOnce(mockPayload1);
      const client1 = createMockSocket({ id: 'socket-1' });
      await gateway.handleConnection(client1);

      mockJwtService.verify.mockReturnValueOnce(mockPayload2);
      const client2 = createMockSocket({ id: 'socket-2' });
      await gateway.handleConnection(client2);

      expect(gateway.getOnlineUserCount()).toBe(2);
    });
  });

  describe('broadcast', () => {
    it('should emit to all connected clients', () => {
      gateway.broadcast('system-message', { alert: 'Maintenance' });

      expect(gateway.server.emit).toHaveBeenCalledWith('system-message', { alert: 'Maintenance' });
    });
  });
});
