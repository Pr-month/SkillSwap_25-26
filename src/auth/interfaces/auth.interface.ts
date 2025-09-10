import { User } from '../../users/entities/user.entity';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenType: 'refresh';
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: string;
}
