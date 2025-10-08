import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { TokensDto } from './dto/tokens.dto';
import {
  AuthenticatedRequest,
  RefreshTokenUser,
} from './interfaces/auth.interface';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован',
    type: TokensDto,
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto): Promise<TokensDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход',
    type: TokensDto,
  })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto): Promise<TokensDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'Обновление токенов' })
  @ApiResponse({
    status: 200,
    description: 'Токены успешно обновлены',
    type: TokensDto,
  })
  @ApiResponse({ status: 401, description: 'Неверный refresh token' })
  async refresh(@Req() req: AuthenticatedRequest): Promise<TokensDto> {
    const user = req.user as RefreshTokenUser;
    return this.authService.refreshTokensByToken(user.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Выход пользователя' })
  @ApiResponse({ status: 200, description: 'Успешный выход' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async logoutUser(@Req() req: AuthenticatedRequest) {
    return await this.authService.logoutUser(req.user.userId);
  }
}
