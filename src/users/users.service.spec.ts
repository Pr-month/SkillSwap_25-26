import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

// Мокаем bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockedBcrypt = bcrypt;

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userId = 1;
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
      const existingUser = {
        id: userId,
        name: 'Old Name',
        email: 'test@example.com',
        password: 'password',
        createdAt: new Date(),
      };
      const updatedUser = { ...existingUser, ...updateUserDto };

      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(existingUser as User);
      const saveSpy = jest
        .spyOn(repository, 'save')
        .mockResolvedValue(updatedUser as User);

      const result = await service.update(userId, updateUserDto);

      expect(findOneSpy).toHaveBeenCalledWith(userId);
      expect(saveSpy).toHaveBeenCalledWith(updatedUser);
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };

      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error('User not found'));

      await expect(service.update(userId, updateUserDto)).rejects.toThrow();
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const userId = 1;
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };
      const hashedOldPassword = 'hashedOldPassword';
      const hashedNewPassword = 'hashedNewPassword';
      const existingUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        password: hashedOldPassword,
        createdAt: new Date(),
      };
      const updatedUser = { ...existingUser, password: hashedNewPassword };

      // Мокаем bcrypt.compare для проверки текущего пароля
      (mockedBcrypt.compare as any).mockResolvedValue(true);
      // Мокаем bcrypt.hash для хеширования нового пароля
      (mockedBcrypt.hash as any).mockResolvedValue(hashedNewPassword);

      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(existingUser as User);
      const saveSpy = jest
        .spyOn(repository, 'save')
        .mockResolvedValue(updatedUser as User);

      const result = await service.updatePassword(userId, updatePasswordDto);

      expect(findOneSpy).toHaveBeenCalledWith(userId);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'oldPassword',
        hashedOldPassword,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(saveSpy).toHaveBeenCalledWith(updatedUser);
      expect(result).toEqual(updatedUser);
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const userId = 1;
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };
      const hashedPassword = 'hashedPassword';
      const existingUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        createdAt: new Date(),
      };

      // Мокаем bcrypt.compare для возврата false (неверный пароль)
      (mockedBcrypt.compare as any).mockResolvedValue(false);

      jest.spyOn(service, 'findOne').mockResolvedValue(existingUser as User);

      await expect(
        service.updatePassword(userId, updatePasswordDto),
      ).rejects.toThrow('Текущий пароль указан неверно');

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'wrongPassword',
        hashedPassword,
      );
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 999;
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new Error('User not found'));

      await expect(
        service.updatePassword(userId, updatePasswordDto),
      ).rejects.toThrow();
    });
  });

  describe('validatePassword', () => {
    it('should return user if password is valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedPassword';
      const user = {
        id: 1,
        name: 'Test User',
        email,
        password: hashedPassword,
        createdAt: new Date(),
      };

      // Мокаем findByEmail
      const findByEmailSpy = jest
        .spyOn(service, 'findByEmail')
        .mockResolvedValue(user as User);
      // Мокаем bcrypt.compare для возврата true
      (mockedBcrypt.compare as any).mockResolvedValue(true);

      const result = await service.validatePassword(email, password);

      expect(findByEmailSpy).toHaveBeenCalledWith(email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        hashedPassword,
      );
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      // Мокаем findByEmail для возврата null
      const findByEmailSpy = jest
        .spyOn(service, 'findByEmail')
        .mockResolvedValue(null);

      const result = await service.validatePassword(email, password);

      expect(findByEmailSpy).toHaveBeenCalledWith(email);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongPassword';
      const hashedPassword = 'hashedPassword';
      const user = {
        id: 1,
        name: 'Test User',
        email,
        password: hashedPassword,
        createdAt: new Date(),
      };

      // Мокаем findByEmail
      const findByEmailSpy = jest
        .spyOn(service, 'findByEmail')
        .mockResolvedValue(user as User);
      // Мокаем bcrypt.compare для возврата false
      (mockedBcrypt.compare as any).mockResolvedValue(false);

      const result = await service.validatePassword(email, password);

      expect(findByEmailSpy).toHaveBeenCalledWith(email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        password,
        hashedPassword,
      );
      expect(result).toBeNull();
    });
  });
});
