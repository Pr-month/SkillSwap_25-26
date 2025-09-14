import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenGuard } from './refresh-token.guard';
import { RefreshTokenUser, AuthGuardError } from '../interfaces/auth.interface';

describe('RefreshTokenGuard', () => {
  let guard: RefreshTokenGuard;

  const mockExecutionContext = (body: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ body }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshTokenGuard],
    }).compile();

    guard = module.get<RefreshTokenGuard>(RefreshTokenGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when refresh token is missing', () => {
      const context = mockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Refresh token is required',
      );
    });

    it('should throw UnauthorizedException when refresh token is not a string', () => {
      const context = mockExecutionContext({ refreshToken: 123 });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Refresh token must be a string',
      );
    });

    it('should throw UnauthorizedException when refresh token is empty string', () => {
      const context = mockExecutionContext({ refreshToken: '' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Refresh token cannot be empty',
      );
    });

    it('should throw UnauthorizedException when refresh token is only whitespace', () => {
      const context = mockExecutionContext({ refreshToken: '   ' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Refresh token cannot be empty',
      );
    });
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException when there is an error', () => {
      const error: AuthGuardError = {
        name: 'AuthError',
        message: 'Test error',
        statusCode: 401,
      };
      const user: RefreshTokenUser | null = null;

      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow(UnauthorizedException);
      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when user is null', () => {
      const error: AuthGuardError | null = null;
      const user: RefreshTokenUser | null = null;

      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow(UnauthorizedException);
      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      const error: AuthGuardError | null = null;
      const user: RefreshTokenUser | null = null;

      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow(UnauthorizedException);
      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when token type is not refresh', () => {
      const error: AuthGuardError | null = null;
      const user: RefreshTokenUser = {
        userId: '123',
        email: 'test@example.com',
        role: 'USER',
        refreshToken: 'test-token',
        tokenType: 'access' as any,
      };

      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow(UnauthorizedException);
      expect(() => {
        guard.handleRequest(error, user);
      }).toThrow('Invalid token type. Expected refresh token');
    });

    it('should return user when token type is refresh', () => {
      const error: AuthGuardError | null = null;
      const user: RefreshTokenUser = {
        userId: '123',
        email: 'test@example.com',
        role: 'USER',
        refreshToken: 'test-token',
        tokenType: 'refresh',
      };

      const result = guard.handleRequest(error, user);

      expect(result).toEqual(user);
    });

    it('should return user when token type is not specified', () => {
      const error: AuthGuardError | null = null;
      const user: RefreshTokenUser = {
        userId: '123',
        email: 'test@example.com',
        role: 'USER',
        refreshToken: 'test-token',
      };

      const result = guard.handleRequest(error, user);

      expect(result).toEqual(user);
    });
  });
});
