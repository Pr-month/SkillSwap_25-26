import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Category } from '../categories/entities/categories.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Gender, UserRole } from './enums';

describe('UsersService', () => {
  let service: UsersService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let usersRepository: Repository<User>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let categoriesRepository: Repository<Category>;

  const mockUser: User = {
    id: 'uuid-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    about: 'Test about',
    birthdate: new Date('1990-01-01'),
    city: 'Test City',
    gender: Gender.MALE,
    avatar: 'avatar.jpg',
    role: UserRole.USER,
    skills: [],
    wantToLearn: [],
    favoriteSkills: [],
  };

  const mockCategory: Category = {
    id: 'category-uuid-1',
    name: 'Programming',
    parent: null,
    children: [],
    skills: [],
  };

  const mockUsersRepository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockCategoriesRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    categoriesRepository = module.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const expectedUsers = [mockUser];
      mockUsersRepository.find.mockResolvedValue(expectedUsers);

      const result = await service.findAll();

      expect(result).toEqual(expectedUsers);
      expect(mockUsersRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated users with default page and limit', async () => {
      const expectedUsers = [mockUser];
      const total = 1;
      mockUsersRepository.findAndCount.mockResolvedValue([
        expectedUsers,
        total,
      ]);

      const result = await service.findAllPaginated();

      expect(result).toEqual({
        data: expectedUsers,
        page: 1,
        totalPages: 1,
      });
      expect(mockUsersRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
    });

    it('should return paginated users with custom page and limit', async () => {
      const expectedUsers = [mockUser];
      const total = 25;
      mockUsersRepository.findAndCount.mockResolvedValue([
        expectedUsers,
        total,
      ]);

      const result = await service.findAllPaginated(2, 10);

      expect(result).toEqual({
        data: expectedUsers,
        page: 2,
        totalPages: 3,
      });
      expect(mockUsersRepository.findAndCount).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
      });
    });

    it('should throw NotFoundException when page exceeds total pages', async () => {
      const expectedUsers = [mockUser];
      const total = 5;
      mockUsersRepository.findAndCount.mockResolvedValue([
        expectedUsers,
        total,
      ]);

      await expect(service.findAllPaginated(10, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findAllPaginated(10, 1)).rejects.toThrow(
        'Страница 10 не найдена. Всего страниц: 5',
      );
    });

    it('should not throw error when page exceeds total pages but total is 0', async () => {
      const expectedUsers = [];
      const total = 0;
      mockUsersRepository.findAndCount.mockResolvedValue([
        expectedUsers,
        total,
      ]);

      const result = await service.findAllPaginated(10, 1);

      expect(result).toEqual({
        data: [],
        page: 10,
        totalPages: 0,
      });
    });
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      about: 'Test about',
      birthdate: new Date('1990-01-01'),
      city: 'Test City',
      gender: Gender.MALE,
      avatar: 'avatar.jpg',
      categoryIds: ['category-uuid-1'],
    };

    it('should create user with categories', async () => {
      mockCategoriesRepository.find.mockResolvedValue([mockCategory]);
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockCategoriesRepository.find).toHaveBeenCalledWith({
        where: { id: In(['category-uuid-1']) },
      });
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        wantToLearn: [mockCategory],
      });
      expect(mockUsersRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should create user without categories when categoryIds is not provided', async () => {
      const createUserDtoWithoutCategories = { ...createUserDto };
      delete createUserDtoWithoutCategories.categoryIds;

      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDtoWithoutCategories);

      expect(result).toEqual(mockUser);
      expect(mockCategoriesRepository.find).not.toHaveBeenCalled();
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        ...createUserDtoWithoutCategories,
        wantToLearn: [],
      });
    });

    it('should throw NotFoundException when categories are not found', async () => {
      mockCategoriesRepository.find.mockResolvedValue([]);

      await expect(service.create(createUserDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Одна или несколько категорий не найдены',
      );
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('uuid-123');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('uuid-123')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('uuid-123')).rejects.toThrow(
        'Пользователь с ID uuid-123 не найден',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should return user with password when found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: User.SELECT_WITH_PASSWORD,
      });
    });

    it('should return null when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated User',
      about: 'Updated about',
      categoryIds: ['category-uuid-1'],
    };

    it('should update user with categories', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockCategoriesRepository.find.mockResolvedValue([mockCategory]);
      mockUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('uuid-123', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
      expect(mockCategoriesRepository.find).toHaveBeenCalledWith({
        where: { id: In(['category-uuid-1']) },
      });
      expect(mockUsersRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        ...updateUserDto,
        wantToLearn: [mockCategory],
      });
    });

    it('should update user without categories when categoryIds is not provided', async () => {
      const updateUserDtoWithoutCategories = { name: 'Updated User' };
      const updatedUser = { ...mockUser, ...updateUserDtoWithoutCategories };

      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(
        'uuid-123',
        updateUserDtoWithoutCategories,
      );

      expect(result).toEqual(updatedUser);
      expect(mockCategoriesRepository.find).not.toHaveBeenCalled();
      expect(mockUsersRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        ...updateUserDtoWithoutCategories,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.update('uuid-123', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePassword', () => {
    const updatePasswordDto: UpdatePasswordDto = {
      currentPassword: 'currentPassword',
      newPassword: 'newPassword',
    };

    it('should update password when current password is valid', async () => {
      const userWithPassword = {
        ...mockUser,
        password: 'hashedCurrentPassword',
      };
      const updatedUser = {
        ...userWithPassword,
        password: 'hashedNewPassword',
      };

      mockUsersRepository.findOne.mockResolvedValue(userWithPassword);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashedNewPassword' as never);
      mockUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updatePassword(
        'uuid-123',
        updatePasswordDto,
      );

      expect(result).toEqual(updatedUser);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'currentPassword',
        'hashedCurrentPassword',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(mockUsersRepository.save).toHaveBeenCalledWith({
        ...userWithPassword,
        password: 'hashedNewPassword',
      });
    });

    it('should throw UnauthorizedException when current password is invalid', async () => {
      const userWithPassword = {
        ...mockUser,
        password: 'hashedCurrentPassword',
      };

      mockUsersRepository.findOne.mockResolvedValue(userWithPassword);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.updatePassword('uuid-123', updatePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.updatePassword('uuid-123', updatePasswordDto),
      ).rejects.toThrow('Текущий пароль указан неверно');
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete user when found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUsersRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.delete('uuid-123');

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
      expect(mockUsersRepository.delete).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('uuid-123')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete('uuid-123')).rejects.toThrow(
        'Пользователь с ID uuid-123 не найден',
      );
      expect(mockUsersRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('validatePassword', () => {
    it('should return user when password is valid', async () => {
      const userWithPassword = { ...mockUser, password: 'hashedPassword' };

      mockUsersRepository.findOne.mockResolvedValue(userWithPassword);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validatePassword(
        'test@example.com',
        'password',
      );

      expect(result).toEqual(userWithPassword);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: User.SELECT_WITH_PASSWORD,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return null when user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.validatePassword(
        'test@example.com',
        'password',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      const userWithPassword = { ...mockUser, password: 'hashedPassword' };

      mockUsersRepository.findOne.mockResolvedValue(userWithPassword);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validatePassword(
        'test@example.com',
        'wrongPassword',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongPassword',
        'hashedPassword',
      );
    });
  });

  describe('findOrValidateCategories', () => {
    it('should return empty array when categoryIds is empty', async () => {
      const result = await service.findOrValidateCategories([]);

      expect(result).toEqual([]);
      expect(mockCategoriesRepository.find).not.toHaveBeenCalled();
    });

    it('should return empty array when categoryIds is null', async () => {
      const result = await service.findOrValidateCategories(null as any);

      expect(result).toEqual([]);
      expect(mockCategoriesRepository.find).not.toHaveBeenCalled();
    });

    it('should return categories when all found', async () => {
      const categoryIds = ['category-uuid-1', 'category-uuid-2'];
      const categories = [
        mockCategory,
        { ...mockCategory, id: 'category-uuid-2' },
      ];

      mockCategoriesRepository.find.mockResolvedValue(categories);

      const result = await service.findOrValidateCategories(categoryIds);

      expect(result).toEqual(categories);
      expect(mockCategoriesRepository.find).toHaveBeenCalledWith({
        where: { id: In(categoryIds) },
      });
    });

    it('should throw NotFoundException when some categories not found', async () => {
      const categoryIds = ['category-uuid-1', 'category-uuid-2'];
      const categories = [mockCategory]; // Only one category found

      mockCategoriesRepository.find.mockResolvedValue(categories);

      await expect(
        service.findOrValidateCategories(categoryIds),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOrValidateCategories(categoryIds),
      ).rejects.toThrow('Одна или несколько категорий не найдены');
    });
  });
});
