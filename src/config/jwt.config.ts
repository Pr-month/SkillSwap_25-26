import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('JWT', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'jwt-access-secret',
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'jwt-refresh-secret',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
