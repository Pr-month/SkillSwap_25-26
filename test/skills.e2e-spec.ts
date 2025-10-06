import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as passport from 'passport';
import { App } from 'supertest/types';
import { SkillsController } from 'src/skills/skills.controller';
import { SkillsService } from 'src/skills/skills.service';
import { CreateSkillDto } from 'src/skills/dto/create-skill.dto';
import { UpdateSkillDto } from 'src/skills/dto/update-skill.dto';

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

    // Для e2e-моков разрешаем любые токены и формируем пользователя по токену
    const user = {
      userId: token.replace('-token', '') || 'mock-user-id',
      email: 'test@example.com',
      role: 'user',
    };

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

// Типы мок-сущностей
type MockSkill = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  owner: { id: string };
  images?: string[];
};

// Мок-сервис для Skills
class MockSkillsService {
  private skills: MockSkill[] = [];
  private idCounter = 1;
  private favoritesByUser: Record<string, Set<string>> = {};

  // Хелперы для тестов
  clear() {
    this.skills = [];
    this.idCounter = 1;
    this.favoritesByUser = {};
  }

  seed(skills: Partial<MockSkill>[]) {
    for (const s of skills) {
      const id = `skill-${this.idCounter++}`;
      this.skills.push({
        id,
        title: s.title || `Skill ${id}`,
        description: s.description || 'desc',
        categoryId: s.categoryId || 'cat-1',
        owner: s.owner || { id: 'owner-1' },
        images: s.images || [],
      });
    }
  }

  create(dto: CreateSkillDto, ownerId: string): MockSkill {
    if (!dto.title || !dto.description || !dto.categoryId) {
      const error = new Error('Validation failed');
      (error as any).status = 400;
      throw error;
    }
    if (dto.categoryId === 'non-existent-category') {
      const error = new Error('Категория не найдена');
      (error as any).status = 404;
      throw error;
    }
    const id = `skill-${this.idCounter++}`;
    const created: MockSkill = {
      id,
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      images: dto.images || [],
      owner: { id: ownerId },
    };
    this.skills.push(created);
    return created;
  }

  getSkills(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): [MockSkill[], number] {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    let filtered = [...this.skills];
    if (query.search) {
      const search = query.search.toLowerCase();
      filtered = filtered.filter((s) => s.title.toLowerCase().includes(search));
    }
    if (query.category) {
      filtered = filtered.filter((s) => s.categoryId === query.category);
    }
    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return [items, total];
  }

  findOne(id: string) {
    const skill = this.skills.find((s) => s.id === id);
    if (!skill) {
      const error = new Error('Skill not found');
      (error as any).status = 404;
      throw error;
    }
    return skill;
  }

  update(id: string, dto: UpdateSkillDto) {
    const idx = this.skills.findIndex((s) => s.id === id);
    if (idx === -1) {
      const error = new Error('Skill not found');
      (error as any).status = 404;
      throw error;
    }
    this.skills[idx] = { ...this.skills[idx], ...dto };
    return this.skills[idx];
  }

  remove(id: string, userId: string) {
    const idx = this.skills.findIndex((s) => s.id === id);
    if (idx === -1) {
      const error = new Error(`Навык с ID ${id} не найден`);
      (error as any).status = 404;
      throw error;
    }
    const skill = this.skills[idx];
    if (skill.owner.id !== userId) {
      const error = new Error('У вас нет прав на удаление этого навыка');
      (error as any).status = 403;
      throw error;
    }
    this.skills.splice(idx, 1);
    return { message: 'Навык успешно удален' };
  }

  addToFavorites(skillId: string, userId: string): { message: string } {
    const exists = this.skills.some((s) => s.id === skillId);
    if (!exists) {
      const error = new Error(`Навык с ID ${skillId} не найден`);
      (error as any).status = 404;
      throw error;
    }
    const set = (this.favoritesByUser[userId] =
      this.favoritesByUser[userId] || new Set());
    if (set.has(skillId)) {
      const error = new Error('Навык уже находится в избранном');
      (error as any).status = 409;
      throw error;
    }
    set.add(skillId);
    return { message: 'Навык успешно добавлен в избранное' };
  }

  removeFromFavorites(skillId: string, userId: string): void {
    const set = this.favoritesByUser[userId];
    if (set) {
      set.delete(skillId);
    }
  }
}

describe('SkillsController (e2e)', () => {
  let app: INestApplication<App>;
  let mockService: MockSkillsService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SkillsController],
      providers: [
        { provide: SkillsService, useClass: MockSkillsService },
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
            if (token) {
              request.user = {
                userId: token.replace('-token', ''),
                email: 'test@example.com',
                role: 'user',
              };
            }
          } else {
            // Без токена — отклоняем защищённые маршруты
            // Неглобально: сам guard вернёт false, а e2e ожидает 401 на защищённых ручках
            return false;
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // Глобальный хендлинг исключений под формат тестов
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
    const mockJwtStrategy = moduleFixture.get<MockJwtStrategy>('JwtStrategy');
    passport.use('jwt', mockJwtStrategy);

    mockService = moduleFixture.get<MockSkillsService>(SkillsService);
    mockService.clear();
    mockService.seed([
      {
        id: 'skill-1',
        title: 'Guitar',
        description: 'Learn guitar',
        categoryId: 'music',
        owner: { id: 'user-1' },
      },
      {
        id: 'skill-2',
        title: 'Piano',
        description: 'Play piano',
        categoryId: 'music',
        owner: { id: 'user-2' },
      },
      {
        id: 'skill-3',
        title: 'Cooking',
        description: 'Home cooking',
        categoryId: 'food',
        owner: { id: 'user-1' },
      },
    ]);

    await app.init();
  });

  describe('GET /skills', () => {
    it('должен вернуть список навыков с пагинацией', async () => {
      const res = await request(app.getHttpServer()).get('/skills').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(Array.isArray(res.body[0])).toBe(true);
      expect(typeof res.body[1]).toBe('number');
    });

    it('должен фильтровать по search и category', async () => {
      const res = await request(app.getHttpServer())
        .get('/skills')
        .query({ search: 'gui', category: 'music' })
        .expect(200);
      const items = res.body[0] as MockSkill[];
      expect(items.every((s: MockSkill) => s.categoryId === 'music')).toBe(
        true,
      );
      expect(
        items.some((s: MockSkill) => s.title.toLowerCase().includes('gui')),
      ).toBe(true);
    });
  });

  describe('GET /skills/:id', () => {
    it('должен возвращать навык по id', async () => {
      const res = await request(app.getHttpServer())
        .get('/skills/skill-1')
        .expect(200);
      expect(res.body).toHaveProperty('id', 'skill-1');
    });

    it('должен возвращать 404 для несуществующего навыка', async () => {
      await request(app.getHttpServer())
        .get('/skills/does-not-exist')
        .expect(404);
    });
  });

  describe('POST /skills', () => {
    const dto: CreateSkillDto = {
      title: 'Drums',
      description: 'Play drums',
      categoryId: 'music',
    };

    it('должен создать навык при валидных данных и токене', async () => {
      const res = await request(app.getHttpServer())
        .post('/skills')
        .set('Authorization', 'Bearer user-3-token')
        .send(dto)
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', dto.title);
      expect(res.body).toHaveProperty('owner');
      expect(res.body.owner.id).toBe('user-3');
    });

    it('должен вернуть 401 без токена', async () => {
      await request(app.getHttpServer()).post('/skills').send(dto).expect(401);
    });

    it('должен вернуть 404 при несуществующей категории', async () => {
      await request(app.getHttpServer())
        .post('/skills')
        .set('Authorization', 'Bearer user-4-token')
        .send({ ...dto, categoryId: 'non-existent-category' })
        .expect(404);
    });
  });

  describe('PATCH /skills/:id', () => {
    it('должен обновлять существующий навык', async () => {
      const res = await request(app.getHttpServer())
        .patch('/skills/skill-1')
        .send({ title: 'Guitar PRO' } as UpdateSkillDto)
        .expect(200);
      expect(res.body).toHaveProperty('title', 'Guitar PRO');
    });

    it('должен вернуть 404 при обновлении несуществующего навыка', async () => {
      await request(app.getHttpServer())
        .patch('/skills/skill-404')
        .send({ title: 'Nope' } as UpdateSkillDto)
        .expect(404);
    });
  });

  describe('DELETE /skills/:id', () => {
    it('должен удалять навык владельцем', async () => {
      const res = await request(app.getHttpServer())
        .delete('/skills/skill-3')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);
      expect(res.body).toHaveProperty('message', 'Навык успешно удален');
    });

    it('должен вернуть 403 при попытке удалить чужой навык', async () => {
      await request(app.getHttpServer())
        .delete('/skills/skill-2')
        .set('Authorization', 'Bearer user-1-token')
        .expect(403);
    });

    it('должен вернуть 404 для несуществующего навыка', async () => {
      await request(app.getHttpServer())
        .delete('/skills/skill-999')
        .set('Authorization', 'Bearer user-1-token')
        .expect(404);
    });

    it('должен вернуть 401 без токена', async () => {
      await request(app.getHttpServer()).delete('/skills/skill-1').expect(401);
    });
  });

  describe('Избранное', () => {
    it('POST /skills/:id/favorite — добавить в избранное', async () => {
      const res = await request(app.getHttpServer())
        .post('/skills/skill-2/favorite')
        .set('Authorization', 'Bearer user-5-token')
        .expect(201);
      expect(res.body).toHaveProperty(
        'message',
        'Навык успешно добавлен в избранное',
      );
    });

    it('POST /skills/:id/favorite — конфликт при повторном добавлении', async () => {
      await request(app.getHttpServer())
        .post('/skills/skill-2/favorite')
        .set('Authorization', 'Bearer user-6-token')
        .expect(201);
      await request(app.getHttpServer())
        .post('/skills/skill-2/favorite')
        .set('Authorization', 'Bearer user-6-token')
        .expect(409);
    });

    it('DELETE /skills/:id/favorite — убрать из избранного', async () => {
      // Сначала добавляем
      await request(app.getHttpServer())
        .post('/skills/skill-1/favorite')
        .set('Authorization', 'Bearer user-7-token')
        .expect(201);
      // Затем удаляем
      await request(app.getHttpServer())
        .delete('/skills/skill-1/favorite')
        .set('Authorization', 'Bearer user-7-token')
        .expect(200);
    });

    it('должен вернуть 404 при добавлении в избранное несуществующего навыка', async () => {
      await request(app.getHttpServer())
        .post('/skills/skill-404/favorite')
        .set('Authorization', 'Bearer user-8-token')
        .expect(404);
    });

    it('должен вернуть 401 без токена при работе с избранным', async () => {
      await request(app.getHttpServer())
        .post('/skills/skill-1/favorite')
        .expect(401);
      await request(app.getHttpServer())
        .delete('/skills/skill-1/favorite')
        .expect(401);
    });
  });
});
