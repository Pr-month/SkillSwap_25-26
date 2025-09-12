import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { UsersService } from '../../users/users.service';
import { Gender, UserRole } from '../../users/enums';
import { Request } from 'express';

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
      id: 'uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      about: null,
      birthdate: null,
      city: null,
      gender: Gender.MALE,
      avatar: null,
      role: UserRole.USER,
      createdAt: new Date(),
    };
    jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

    const payload = {
      sub: 'uuid-123',
      email: 'test@example.com',
      role: 'user',
      tokenType: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const req = {
      cookies: {
        refreshToken: 'test-refresh-token',
      },
    } as Request;
    const result = await strategy.validate(req, payload);

    expect(result).toEqual({
      userId: 'uuid-123',
      email: 'test@example.com',
      role: UserRole.USER,
      refreshToken: 'test-refresh-token',
      tokenType: 'refresh',
    });
  });

  it('should throw UnauthorizedException for invalid token type', async () => {
    const payload = {
      sub: 'uuid-123',
      email: 'test@example.com',
      role: 'user',
      tokenType: 'access' as any, // Неверный тип токена
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const req = {
      cookies: {
        refreshToken: 'test-refresh-token',
      },
    } as Request;

    await expect(strategy.validate(req, payload)).rejects.toThrow(
      'Неверный тип токена',
    );
  });

  it('should throw UnauthorizedException when refresh token is missing', async () => {
    const payload = {
      sub: 'uuid-123',
      email: 'test@example.com',
      role: 'user',
      tokenType: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const req = {
      cookies: {},
    } as Request;

    await expect(strategy.validate(req, payload)).rejects.toThrow(
      'Refresh token not found',
    );
  });
});
