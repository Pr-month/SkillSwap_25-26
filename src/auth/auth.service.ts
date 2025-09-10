import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { TokensDto } from './dto/tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // В реальном приложении здесь должна быть проверка пароля с bcrypt
    // const isPasswordValid = await comparePasswords(loginDto.password, user.password);
    // if (!isPasswordValid) {
    //   throw new UnauthorizedException('Invalid credentials');
    // }

    if (loginDto.password !== user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id);
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<TokensDto> {
    const { refreshToken } = refreshTokenDto;

    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isActive: true },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > tokenEntity.expiresAt) {
      tokenEntity.isActive = false;
      await this.refreshTokenRepository.save(tokenEntity);
      throw new UnauthorizedException('Refresh token expired');
    }
    tokenEntity.isActive = false;
    await this.refreshTokenRepository.save(tokenEntity);
    return this.generateTokens(tokenEntity.userId);
  }

  private async generateTokens(userId: number): Promise<TokensDto> {
    const user = await this.usersService.findOne(userId);

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      token: refreshToken,
      user,
      userId: user.id,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  async logoutUser(userId: number) {
    await this.usersService.removeRefreshToken(userId);
    return {
      success: true,
      message: 'Выход выполнен успешно',
    };
  }
}
