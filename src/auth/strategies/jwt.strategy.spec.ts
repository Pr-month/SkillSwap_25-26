import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { Gender, UserRole } from '../../users/enums';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
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

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate JWT payload correctly', async () => {
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
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'uuid-123',
      email: 'test@example.com',
      role: 'user',
    });
  });
});
