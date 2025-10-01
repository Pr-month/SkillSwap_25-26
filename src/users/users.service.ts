import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { Category } from '../categories/entities/categories.entity';
import { Skill } from '../skills/entities/skill.entity';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Skill)
    private skillsRepository: Repository<Skill>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedUsersResponseDto> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.usersRepository.findAndCount({
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && total > 0) {
      throw new NotFoundException(
        `Страница ${page} не найдена. Всего страниц: ${totalPages}`,
      );
    }

    return {
      data,
      page,
      totalPages,
    };
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    let categories: Category[] = [];

    // Проверяем наличие категорий
    if (createUserDto.categoryIds) {
      categories = await this.findOrValidateCategories(
        createUserDto.categoryIds,
      );
    }

    // Пароль уже должен быть захеширован в AuthService
    const user = this.usersRepository.create({
      ...createUserDto,
      wantToLearn: categories,
    });

    return this.usersRepository.save(user);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  // Находит пользователя по ID с паролем (для внутреннего использования)
  private async findOneWithPassword(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: User.SELECT_WITH_PASSWORD,
    });
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  // Находит по email (возвращает без пароля)
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Находит по email (возвращает с паролем)
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: User.SELECT_WITH_PASSWORD,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.categoryIds !== undefined) {
      const categories = await this.findOrValidateCategories(
        updateUserDto.categoryIds,
      );
      user.wantToLearn = categories;
    }

    // Обновляем только переданные поля
    Object.assign(user, updateUserDto);

    return this.usersRepository.save(user);
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<User> {
    // Получаем пользователя с паролем для валидации
    const user = await this.findOneWithPassword(id);

    // Проверяем текущий пароль с помощью bcrypt
    const isCurrentPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Текущий пароль указан неверно');
    }

    // Хешируем новый пароль
    const hashedNewPassword = await bcrypt.hash(
      updatePasswordDto.newPassword,
      10,
    );
    user.password = hashedNewPassword;

    return this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    await this.usersRepository.delete(id);
  }

  /**
   * Проверяет пароль пользователя (полезно для AuthService)
   */
  async validatePassword(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findByEmailWithPassword(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : null;
  }

  async findOrValidateCategories(categoryIds: string[]): Promise<Category[]> {
    if (!categoryIds || categoryIds.length === 0) {
      return [];
    }

    const categories = await this.categoriesRepository.find({
      where: {
        id: In(categoryIds),
      },
    });

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('Одна или несколько категорий не найдены');
    }

    return categories;
  }

  async findBySkill(skillId: string): Promise<User[]> {
    // Находим навык по ID с владельцем и его категориями wantToLearn
    const skill = await this.skillsRepository.findOne({
      where: { id: skillId },
      relations: ['owner', 'owner.wantToLearn'],
    });

    if (!skill) {
      throw new NotFoundException(`Навык с ID ${skillId} не найден`);
    }

    if (!skill.owner) {
      throw new NotFoundException(`Владелец навыка не найден`);
    }

    // Получаем категории, которые хочет изучить владелец навыка
    const ownerWantToLearnCategoryIds: string[] = skill.owner.wantToLearn.map(
      (category: Category) => category.id,
    );

    if (ownerWantToLearnCategoryIds.length === 0) {
      return []; // Если у владельца нет категорий для изучения, возвращаем пустой массив
    }

    // Находим пользователей, у которых в wantToLearn есть хотя бы одна из категорий владельца навыка
    const users = await this.usersRepository.find({
      where: {
        wantToLearn: {
          id: In(ownerWantToLearnCategoryIds),
        },
      },
      relations: ['wantToLearn'],
      take: 10, // Лимит 10 пользователей
    });

    return users;
  }
}
