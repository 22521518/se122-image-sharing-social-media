import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockTokens = {
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
  };

  const mockResponse = {
    cookie: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register user and return access token', async () => {
      authService.register.mockResolvedValue(mockTokens);

      const result = await controller.register(
        { email: 'test@example.com', password: 'password123' },
        mockResponse,
      );

      expect(authService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock_refresh_token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: 'mock_access_token' });
    });
  });

  describe('login', () => {
    it('should login user and return access token', async () => {
      authService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(
        { email: 'test@example.com', password: 'password123' },
        mockResponse,
      );

      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock_refresh_token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: 'mock_access_token' });
    });
  });
});
