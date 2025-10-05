import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { UsersService } from '../../users/users.service';
import {
  AuthenticatedUser,
  TokenPayload,
} from '../../auth/interfaces/auth.interface';

export interface SocketWithUser extends Socket {
  data: {
    user: AuthenticatedUser;
  };
}

@Injectable()
export class JwtWsGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async verify(client: Socket): Promise<SocketWithUser> {
    const tokenFromQuery = this.extractTokenFromHandshakeQuery(client);
    if (!tokenFromQuery) {
      throw new WsException('Unauthorized: access token is missing');
    }

    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify<TokenPayload>(tokenFromQuery);
    } catch {
      throw new WsException('Unauthorized: invalid or expired token');
    }

    const { sub: userId, email, role } = payload;
    if (!userId) {
      throw new WsException('Unauthorized: malformed token payload');
    }

    try {
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
    } catch {
      throw new WsException('Unauthorized: user not found');
    }

    const authenticatedUser: AuthenticatedUser = { userId, email, role };

    (client as SocketWithUser).data = {
      ...(client as any).data,
      user: authenticatedUser,
    };

    return client as SocketWithUser;
  }

  private extractTokenFromHandshakeQuery(client: Socket): string | null {
    const query = client.handshake?.query ?? {};

    const possibleKeys = [
      'token',
      'accessToken',
      'authorization',
      'auth',
      'bearer',
    ];

    let raw: unknown = null;
    for (const key of possibleKeys) {
      if (key in query) {
        raw = (query as Record<string, unknown>)[key];
        break;
      }
    }

    if (raw == null) {
      return null;
    }

    let value: string | null = null;
    if (Array.isArray(raw)) {
      const first = raw[0];
      if (typeof first === 'string') {
        value = first;
      }
    } else if (typeof raw === 'string') {
      value = raw;
    }

    if (!value) return null;

    const parts = value.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
    return value;
  }
}
 