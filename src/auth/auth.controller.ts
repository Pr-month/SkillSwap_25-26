import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { TokensDto } from './dto/tokens.dto';
import {
  AuthenticatedRequest,
  LoginDto,
  RefreshTokenUser,
} from './interfaces/auth.interface';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { YandexAuthGuard } from './guards/yandex-auth.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<TokensDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<TokensDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  async refresh(@Req() req: AuthenticatedRequest): Promise<TokensDto> {
    const user = req.user as RefreshTokenUser;
    return this.authService.refreshTokensByToken(user.refreshToken);
  }

  @Post('logout')
  async logoutUser(@Req() req: AuthenticatedRequest) {
    return await this.authService.logoutUser(req.user.userId);
  }

  @Get('yandex/login')
  @UseGuards(YandexAuthGuard)
  async yandexLogin() {
    // Этот эндпоинт инициирует OAuth flow
    // Passport автоматически перенаправит на Яндекс
  }

  @Get('yandex/callback')
  @UseGuards(YandexAuthGuard)
  async yandexCallback(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    // После успешной авторизации через Яндекс
    const user = req.user;
    const tokens = await this.authService.generateTokens(user.userId);

    // Перенаправляем на фронтенд с токенами в query параметрах
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    res.redirect(redirectUrl);
  }
}
