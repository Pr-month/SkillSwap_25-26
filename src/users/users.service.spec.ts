import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

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
      const existingUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        password: 'oldPassword',
        createdAt: new Date(),
      };
      const updatedUser = { ...existingUser, password: 'newPassword123' };

      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(existingUser as User);
      const saveSpy = jest
        .spyOn(repository, 'save')
        .mockResolvedValue(updatedUser as User);

      const result = await service.updatePassword(userId, updatePasswordDto);

      expect(findOneSpy).toHaveBeenCalledWith(userId);
      expect(saveSpy).toHaveBeenCalledWith(updatedUser);
      expect(result).toEqual(updatedUser);
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const userId = 1;
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };
      const existingUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        password: 'correctPassword',
        createdAt: new Date(),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingUser as User);

      await expect(
        service.updatePassword(userId, updatePasswordDto),
      ).rejects.toThrow('Текущий пароль указан неверно');
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
});
