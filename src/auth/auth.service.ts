import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { TokensDto } from './dto/tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokensDto> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      birthdate: new Date(registerDto.birthdate),
      gender: registerDto.gender,
    });
    return this.generateTokens(user.id);
  }

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверные учетные данные');
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
    return this.generateTokens(tokenEntity.user.id);
  }

  async refreshTokensByToken(refreshToken: string): Promise<TokensDto> {
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
    return this.generateTokens(tokenEntity.user.id);
  }

  private async generateTokens(userId: string): Promise<TokensDto> {
    const user = await this.usersService.findOne(userId);
    const accessTokenExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '1h',
    );
    const refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'test',
        expiresIn: accessTokenExpiresIn,
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenType: 'refresh',
      },
      {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'default-refresh-secret',
        ),
        expiresIn: refreshTokenExpiresIn,
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      token: refreshToken,
      user,
      userId: user.id,
      expiresAt,
      isActive: true,
    });

    return { accessToken, refreshToken };
  }

  async logoutUser(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );
    return {
      success: true,
      message: 'Выход выполнен успешно',
    };
  }
}
