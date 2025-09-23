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
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenType: 'refresh';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser | RefreshTokenUser;
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  tokenType: 'refresh';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenUser extends AuthenticatedUser {
  refreshToken: string;
  tokenType?: 'refresh';
}

export interface AuthGuardError extends Error {
  message: string;
  statusCode?: number;
}

export interface AuthGuardInfo {
  message?: string;
  scope?: string;
  realm?: string;
}
