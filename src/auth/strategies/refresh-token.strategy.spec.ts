import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { UsersService } from '../../users/users.service';

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<RefreshTokenStrategy>(RefreshTokenStrategy);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate refresh token payload correctly', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      createdAt: new Date(),
    };
    jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

    const payload = {
      sub: 1,
      email: 'test@example.com',
      tokenType: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const req = {};
    const result = await strategy.validate(req, payload);

    expect(result).toEqual({
      userId: 1,
      email: 'test@example.com',
    });
  });

  it('should throw UnauthorizedException for invalid token type', async () => {
    const payload = {
      sub: 1,
      email: 'test@example.com',
      tokenType: 'access' as any, // Неверный тип токена
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const req = {};

    await expect(strategy.validate(req, payload)).rejects.toThrow(
      'Неверный тип токена',
    );
  });
});
