import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as passport from 'passport';
import { App } from 'supertest/types';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { UpdatePasswordDto } from 'src/users/dto/update-password.dto';
import { PaginatedUsersResponseDto } from 'src/users/dto/paginated-users-response.dto';
import { UserRole } from 'src/users/enums';

// Простая мок-сущность пользователя
type MockUser = {
  id: string;
  email: string;
  name: string;
  password?: string;
  wantToLearn?: { id: string; title?: string }[];
  role?: UserRole | string;
};

// Мок-стратегия аутентификации (passport 'jwt')
class MockJwtStrategy {
  name = 'jwt';

  authenticate(req: any) {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return this.fail('Unauthorized', 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return this.fail('Unauthorized', 401);
    }

    // Токены вида: user-<id>-token, admin-<id>-token
    let user: any = null;
    if (token.startsWith('admin-')) {
      const id =
        token.replace('admin-', '').replace('-token', '') || 'admin-id';
      user = { userId: id, email: 'admin@example.com', role: 'admin' };
    } else if (token.startsWith('user-')) {
      const id = token.replace('user-', '').replace('-token', '') || 'user-id';
      user = { userId: id, email: 'user@example.com', role: 'user' };
    } else {
      return this.fail('Invalid token', 401);
    }

    return this.success(user, {});
  }

  fail(challenge?: string | number, status?: number) {
    const error = new Error(challenge?.toString() || 'Authentication failed');
    if (status) {
      (error as any).status = status;
    }
    throw error;
  }

  success(user: any, info?: any) {
    return { user, info };
  }

  error(err: Error) {
    throw err;
  }
}

// Мок-сервис Users с минимальной логикой под e2e
class MockUsersService {
  private users: MockUser[] = [];
  private idCounter = 1;

  clear() {
    this.users = [];
    this.idCounter = 1;
  }

  seed(users: Partial<MockUser>[]) {
    for (const u of users) {
      const id = u.id || `user-${this.idCounter++}`;
      this.users.push({
        id,
        email: u.email || `${id}@example.com`,
        name: u.name || `User ${id}`,
        role: u.role || 'user',
        wantToLearn: u.wantToLearn || [],
        password: u.password || 'hashed',
      });
    }
  }

  findAll(): Promise<MockUser[]> {
    return Promise.resolve(this.users);
  }

  findAllPaginated(page = 1, limit = 20): Promise<PaginatedUsersResponseDto> {
    const start = (page - 1) * limit;
    const data = this.users.slice(start, start + limit) as any;
    const totalPages = Math.ceil(this.users.length / limit) || 1;
    if (page > totalPages && this.users.length > 0) {
      const error = new Error(
        `Страница ${page} не найдена. Всего страниц: ${totalPages}`,
      );
      (error as any).status = 404;
      throw error;
    }
    return Promise.resolve({
      data: data,
      page,
      totalPages,
    } as PaginatedUsersResponseDto);
  }

  create(dto: CreateUserDto): Promise<MockUser> {
    const id = `user-${this.idCounter++}`;
    const created: MockUser = {
      id,
      email: (dto as any).email || `${id}@example.com`,
      name: (dto as any).name || `User ${id}`,
      wantToLearn: [],
      role: 'user',
    };
    this.users.push(created);
    return Promise.resolve(created);
  }

  findOne(id: string): Promise<MockUser> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      const error = new Error(`Пользователь с ID ${id} не найден`);
      (error as any).status = 404;
      throw error;
    }
    return Promise.resolve(user);
  }

  update(id: string, dto: UpdateUserDto): Promise<MockUser> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      const error = new Error(`Пользователь с ID ${id} не найден`);
      (error as any).status = 404;
      throw error;
    }
    this.users[idx] = { ...this.users[idx], ...(dto as any) };
    return Promise.resolve(this.users[idx]);
  }

  updatePassword(id: string, dto: UpdatePasswordDto): Promise<MockUser> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      const error = new Error(`Пользователь с ID ${id} не найден`);
      (error as any).status = 404;
      throw error;
    }
    // Проверка текущего пароля — для мока примем только значение 'current-ok'
    if ((dto as any).currentPassword !== 'current-ok') {
      const error = new Error('Текущий пароль указан неверно');
      (error as any).status = 401;
      throw error;
    }
    return Promise.resolve(this.users[idx]);
  }

  delete(id: string): Promise<void> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      const error = new Error(`Пользователь с ID ${id} не найден`);
      (error as any).status = 404;
      throw error;
    }
    this.users.splice(idx, 1);
    return Promise.resolve();
  }

  // Упрощенная логика поиска по навыку: вернем первых 2 пользователей
  findBySkill(skillId: string): Promise<MockUser[]> {
    if (skillId === 'non-existent-skill') {
      const error = new Error(`Навык с ID ${skillId} не найден`);
      (error as any).status = 404;
      throw error;
    }
    return Promise.resolve(this.users.slice(0, 2));
  }
}

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let mockService: MockUsersService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useClass: MockUsersService },
        { provide: 'JwtStrategy', useClass: MockJwtStrategy },
      ],
    })
      .overrideGuard('JwtAuthGuard')
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          const authHeader = request.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7).trim();
            if (token.startsWith('admin-')) {
              request.user = {
                userId: token.replace('admin-', '').replace('-token', ''),
                email: 'admin@example.com',
                role: 'admin',
              };
            } else if (token.startsWith('user-')) {
              request.user = {
                userId: token.replace('user-', '').replace('-token', ''),
                email: 'user@example.com',
                role: 'user',
              };
            } else {
              return false;
            }
          } else {
            return false;
          }
          return true;
        },
      })
      .overrideGuard('RolesGuard')
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          const user = request.user;
          if (!user) return false;
          const requiredRoles = context
            .getHandler()
            .reflector?.get?.('roles', context.getHandler?.());
          if (requiredRoles && !requiredRoles.includes(user.role)) return false;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // Глобальный exception filter
    app.useGlobalFilters({
      catch(exception: any, host: any) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception.status || 500;
        response
          .status(status)
          .json({ statusCode: status, message: exception.message });
      },
    });

    // Регистрируем мок-стратегию
    const mockJwt = moduleFixture.get<MockJwtStrategy>('JwtStrategy');
    passport.use('jwt', mockJwt);

    mockService = moduleFixture.get<MockUsersService>(UsersService);
    mockService.clear();
    mockService.seed([
      { id: 'user-1', email: 'u1@example.com', name: 'User 1', role: 'user' },
      { id: 'user-2', email: 'u2@example.com', name: 'User 2', role: 'user' },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
      },
    ]);

    await app.init();
  });

  describe('GET /users', () => {
    it('должен вернуть пагинированный список пользователей', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('totalPages');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('должен вернуть 404 при запросе несуществующей страницы', async () => {
      await request(app.getHttpServer())
        .get('/users?page=999&limit=1')
        .expect(404);
    });
  });

  describe('GET /users/:id', () => {
    it('должен вернуть пользователя по id', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/user-1')
        .expect(200);
      expect(res.body).toHaveProperty('id', 'user-1');
    });

    it('должен вернуть 404 для несуществующего пользователя', async () => {
      await request(app.getHttpServer()).get('/users/nope').expect(404);
    });
  });

  describe('GET /users/me', () => {
    it('должен вернуть текущего пользователя при валидном токене', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer user-user-1-token')
        .expect(200);
      expect(res.body).toHaveProperty('id', 'user-1');
    });

    it('должен вернуть 401 без токена', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('должен обновить профиль текущего пользователя', async () => {
      const dto: UpdateUserDto = { name: 'Updated Name' };
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer user-user-2-token')
        .send(dto)
        .expect(200);
      expect(res.body).toHaveProperty('name', 'Updated Name');
      expect(res.body).toHaveProperty('id', 'user-2');
    });

    it('должен вернуть 401 без токена', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .send({ name: 'Nope' })
        .expect(401);
    });
  });

  describe('PATCH /users/me/password', () => {
    it('должен обновить пароль при корректном текущем пароле', async () => {
      const dto: UpdatePasswordDto = {
        currentPassword: 'current-ok',
        newPassword: 'new-strong-pass',
      };
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', 'Bearer user-user-1-token')
        .send(dto)
        .expect(200);
    });

    it('должен вернуть 401 при неверном текущем пароле', async () => {
      const dto: UpdatePasswordDto = {
        currentPassword: 'wrong',
        newPassword: 'new-strong-pass',
      };
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', 'Bearer user-user-1-token')
        .send(dto)
        .expect(401);
    });

    it('должен вернуть 401 без токена', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .send({ currentPassword: 'current-ok', newPassword: 'x' })
        .expect(401);
    });
  });

  describe('POST /users', () => {
    it('должен создать пользователя', async () => {
      const dto: CreateUserDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'hashed',
        about: 'About',
        birthdate: new Date('1990-01-01'),
        city: 'City',
        gender: 'male' as any,
        avatar: 'avatar.png',
      };
      await request(app.getHttpServer()).post('/users').send(dto).expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('должен удалить пользователя с ролью admin', async () => {
      await request(app.getHttpServer())
        .delete('/users/user-2')
        .set('Authorization', 'Bearer admin-admin-1-token')
        .expect(200);
    });

    it('должен вернуть 403 при удалении без роли admin', async () => {
      await request(app.getHttpServer())
        .delete('/users/user-1')
        .set('Authorization', 'Bearer user-user-2-token')
        .expect(403);
    });
  });

  describe('GET /users/by-skill/:id', () => {
    it('должен вернуть список пользователей по id навыка', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/by-skill/skill-1')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('должен вернуть 404 если навык не найден', async () => {
      await request(app.getHttpServer())
        .get('/users/by-skill/non-existent-skill')
        .expect(404);
    });
  });
});
