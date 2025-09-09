import { Controller, Post, Body, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/auth/dto/login.auth.dto';
import { RequestWithUser } from 'src/users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async loginUser(@Body() loginDto: LoginDto) {
    return await this.authService.loginUser(loginDto);
  }

  @Post('logout')
  async logoutUser(@Request() req: RequestWithUser) {
    return await this.authService.logoutUser(req.user.id);
  }
}
