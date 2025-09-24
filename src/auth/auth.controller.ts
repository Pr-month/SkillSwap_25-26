import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { TokensDto } from './dto/tokens.dto';
import {
  AuthenticatedRequest,
  LoginDto,
  RefreshTokenUser,
} from './interfaces/auth.interface';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

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
}
