import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponse } from './auth.interface';

export interface IAuthService {
  /**
   * Аутентификация пользователя по email и паролю
   */
  login(loginDto: LoginDto): Promise<AuthResponse>;

  /**
   * Регистрация нового пользователя
   */
  register(registerDto: RegisterDto): Promise<AuthResponse>;

  /**
   * Обновление access токена с помощью refresh токена
   */
  refreshTokens(refreshToken: string): Promise<AuthResponse>;

  /**
   * Выход пользователя (инвалидация refresh токена)
   */
  logout(refreshToken: string): Promise<void>;
}
