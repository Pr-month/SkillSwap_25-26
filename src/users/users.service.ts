import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Пароль уже должен быть захеширован в AuthService
    const user = this.usersRepository.create(createUserDto);

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
}
