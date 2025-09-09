import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from 'src/auth/dto/login.auth.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async loginUser(userData: LoginDto) {
    const user = await this.usersService.findByEmail(userData.email);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const isPasswordValid = userData.password === user.password;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    return {
      success: true,
      message: 'Авторизация прошла успешно',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async logoutUser(userId: number) {
    await this.usersService.removeRefreshToken(userId);
    return {
      success: true,
      message: 'Выход выполнен успешно',
    };
  }
}
