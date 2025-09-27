import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Gender, UserRole } from '../users/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

// Мокаем bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Helper функция для создания mock пользователя
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-123',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedpassword',
  about: 'Test about',
  birthdate: new Date('1990-01-01'),
  city: 'Test City',
  gender: Gender.MALE,
  avatar: 'test-avatar.jpg',
  role: UserRole.USER,
  skills: [],
  wantToLearn: [],
  favoriteSkills: [],
  ...overrides,
});

// Helper функция для создания mock refresh token
const createMockRefreshToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
  id: 1,
  token: 'refresh-token-123',
  isActive: true,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
  createdAt: new Date(),
  user: createMockUser(),
  userId: 'uuid-123',
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByEmailWithPassword: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register user successfully and return tokens', async () => {
      const registerDto: RegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        about: 'Test about',
        birthdate: new Date('1990-01-01'),
        city: 'Test City',
        gender: Gender.MALE,
        avatar: 'test-avatar.jpg',
      };

      const hashedPassword = 'hashedPassword123';
      const mockUser = createMockUser({ id: 'new-user-id' });
      const expectedTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      };

      // Мокаем bcrypt.hash
      (mockedBcrypt.hash as any).mockResolvedValue(hashedPassword);
      // Мокаем создание пользователя
      mockUsersService.create.mockResolvedValue(mockUser);
      // Мокаем generateTokens через spy
      const generateTokensSpy = jest.spyOn(service as any, 'generateTokens').mockResolvedValue(expectedTokens);

      const result = await service.register(registerDto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
        birthdate: new Date(registerDto.birthdate),
        gender: registerDto.gender,
      });
      expect(generateTokensSpy).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(expectedTokens);
    });

    it('should throw error if user creation fails', async () => {
      const registerDto: RegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        about: 'Test about',
        birthdate: new Date('1990-01-01'),
        city: 'Test City',
        gender: Gender.MALE,
        avatar: 'test-avatar.jpg',
      };

      (mockedBcrypt.hash as any).mockResolvedValue('hashedPassword');
      mockUsersService.create.mockRejectedValue(new Error('User creation failed'));

      await expect(service.register(registerDto)).rejects.toThrow('User creation failed');
    });
  });

  describe('login', () => {
    it('should login user successfully and return tokens', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = createMockUser({ password: 'hashedPassword' });
      const expectedTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      };

      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as any).mockResolvedValue(true);
      const generateTokensSpy = jest.spyOn(service as any, 'generateTokens').mockResolvedValue(expectedTokens);

      const result = await service.login(loginDto);

      expect(mockUsersService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(generateTokensSpy).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(expectedTokens);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Неверные учетные данные')
      );

      expect(mockUsersService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      const mockUser = createMockUser({ password: 'hashedPassword' });

      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as any).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Неверные учетные данные')
      );

      expect(mockUsersService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockRefreshToken = createMockRefreshToken({
        token: refreshTokenDto.refreshToken,
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Завтра
      });

      const expectedTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);
      const generateTokensSpy = jest.spyOn(service as any, 'generateTokens').mockResolvedValue(expectedTokens);

      const result = await service.refreshTokens(refreshTokenDto);

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: refreshTokenDto.refreshToken, isActive: true },
        relations: ['user'],
      });
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({
        ...mockRefreshToken,
        isActive: false,
      });
      expect(generateTokensSpy).toHaveBeenCalledWith(mockRefreshToken.user.id);
      expect(result).toEqual(expectedTokens);
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      );

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: refreshTokenDto.refreshToken, isActive: true },
        relations: ['user'],
      });
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'expired-refresh-token',
      };

      const expiredRefreshToken = createMockRefreshToken({
        token: refreshTokenDto.refreshToken,
        isActive: true,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Вчера
      });

      mockRefreshTokenRepository.findOne.mockResolvedValue(expiredRefreshToken);
      mockRefreshTokenRepository.save.mockResolvedValue(expiredRefreshToken);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Refresh token expired')
      );

      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({
        ...expiredRefreshToken,
        isActive: false,
      });
    });
  });

  describe('refreshTokensByToken', () => {
    it('should refresh tokens by token string successfully', async () => {
      const refreshTokenString = 'valid-refresh-token';

      const mockRefreshToken = createMockRefreshToken({
        token: refreshTokenString,
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const expectedTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);
      const generateTokensSpy = jest.spyOn(service as any, 'generateTokens').mockResolvedValue(expectedTokens);

      const result = await service.refreshTokensByToken(refreshTokenString);

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: refreshTokenString, isActive: true },
        relations: ['user'],
      });
      expect(generateTokensSpy).toHaveBeenCalledWith(mockRefreshToken.user.id);
      expect(result).toEqual(expectedTokens);
    });

    it('should throw UnauthorizedException if token not found', async () => {
      const refreshTokenString = 'invalid-refresh-token';

      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokensByToken(refreshTokenString)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      );
    });
  });

  describe('logoutUser', () => {
    it('should logout user successfully', async () => {
      const userId = 'user-123';

      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.logoutUser(userId);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId, isActive: true },
        { isActive: false }
      );
      expect(result).toEqual({
        success: true,
        message: 'Выход выполнен успешно',
      });
    });

    it('should logout user even if no active tokens found', async () => {
      const userId = 'user-123';

      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 0 });

      const result = await service.logoutUser(userId);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId, isActive: true },
        { isActive: false }
      );
      expect(result).toEqual({
        success: true,
        message: 'Выход выполнен успешно',
      });
    });
  });

  describe('generateTokens (private method)', () => {
    it('should generate access and refresh tokens', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });

      const accessToken = 'generated-access-token';
      const refreshToken = 'generated-refresh-token';

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        switch (key) {
          case 'JWT_ACCESS_EXPIRES_IN':
            return '1h';
          case 'JWT_REFRESH_EXPIRES_IN':
            return '7d';
          case 'JWT_ACCESS_SECRET':
            return 'access-secret';
          case 'JWT_REFRESH_SECRET':
            return 'refresh-secret';
          default:
            return defaultValue;
        }
      });

      mockJwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      mockRefreshTokenRepository.save.mockResolvedValue(createMockRefreshToken());

      // Вызываем приватный метод напрямую
      const result = await (service as any).generateTokens(userId);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      
      // Проверяем вызов для access token
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: 'access-secret', expiresIn: '1h' }
      );

      // Проверяем вызов для refresh token
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role, tokenType: 'refresh' },
        { secret: 'refresh-secret', expiresIn: '7d' }
      );

      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({
        token: refreshToken,
        user: mockUser,
        userId: mockUser.id,
        expiresAt: expect.any(Date),
        isActive: true,
      });

      expect(result).toEqual({
        accessToken,
        refreshToken,
      });
    });

    it('should use default config values if not provided', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      mockRefreshTokenRepository.save.mockResolvedValue(createMockRefreshToken());

      await (service as any).generateTokens(userId);

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: 'test', expiresIn: '1h' }
      );

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role, tokenType: 'refresh' },
        { secret: 'default-refresh-secret', expiresIn: '7d' }
      );
    });
  });
});