import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { UsersService } from '../../users/users.service';
import { Gender, UserRole } from '../../users/enums';
import { Request } from 'express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;
  let usersService: UsersService;
  let refreshTokenRepository: any;

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
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<RefreshTokenStrategy>(RefreshTokenStrategy);
    usersService = module.get<UsersService>(UsersService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
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
      favoriteSkills: [],
    } as unknown as User;

    const mockTokenEntity = {
      id: 1,
      token: 'test-refresh-token',
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      user: mockUser,
      userId: 'uuid-123',
    };

    jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
    jest
      .spyOn(refreshTokenRepository, 'findOne')
      .mockResolvedValue(mockTokenEntity);

    const payload = {
      sub: 'uuid-123',
      email: 'test@example.com',
      role: 'user',
      tokenType: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const req = {
      headers: {
        authorization: 'Bearer test-refresh-token',
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
      headers: {
        authorization: 'Bearer test-refresh-token',
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
      body: {},
    } as Request;

    await expect(strategy.validate(req, payload)).rejects.toThrow(
      'Refresh token not found',
    );
  });

  it('should throw UnauthorizedException when token is not found in DB', async () => {
    const payload = {
      sub: 'uuid-123',
      email: 'test@example.com',
      role: 'user',
      tokenType: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(null);

    const req = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    } as Request;

    await expect(strategy.validate(req, payload)).rejects.toThrow(
      'Invalid refresh token',
    );
  });

  it('should throw UnauthorizedException when token is expired', async () => {
    const mockTokenEntity = {
      id: 1,
      token: 'expired-token',
      isActive: true,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      user: null,
      userId: 'uuid-123',
    };

    jest
      .spyOn(refreshTokenRepository, 'findOne')
      .mockResolvedValue(mockTokenEntity);
    jest
      .spyOn(refreshTokenRepository, 'save')
      .mockResolvedValue(mockTokenEntity);

    const payload = {
      sub: 'uuid-123',
      email: 'test@example.com',
      role: 'user',
      tokenType: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const req = {
      headers: {
        authorization: 'Bearer expired-token',
      },
    } as Request;

    await expect(strategy.validate(req, payload)).rejects.toThrow(
      'Refresh token expired',
    );
  });
});
