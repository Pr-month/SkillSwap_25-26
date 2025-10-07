import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Server } from 'http';
import { AdminUserData, RegularUsersData } from 'src/scripts/users.data';
import { AllExpectionFilter } from 'src/common/all-exception.filter';
import { ConfigService } from '@nestjs/config';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let authService: AuthService;
  let adminToken: string;
  let userToken: string;
  let createdCategoryId: string;

  // Тестовые данные
  const testCategory = {
    name: 'Test Category',
  };

  const updatedCategory = {
    name: 'Updated Category',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
          if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
          if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
          if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
          if (key === 'JWT.accessSecret') return 'test-access-secret';
          if (key === 'JWT.refreshSecret') return 'test-refresh-secret';
          return process.env[key];
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Подключаем глобальные пайпы и фильтры
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExpectionFilter());

    await app.init();

    // Получаем HTTP сервер с типизацией
    httpServer = app.getHttpServer() as Server;

    // Получаем сервисы для аутентификации
    authService = app.get(AuthService);

    // Логинимся как администратор
    const tokens = await authService.login({
      email: AdminUserData.email,
      password: AdminUserData.password,
    });
    adminToken = tokens.accessToken;

    // Логинимся как обычный пользователь
    const userTokens = await authService.login({
      email: RegularUsersData[0].email,
      password: RegularUsersData[0].password,
    });
    userToken = userTokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // Тест создания категории
  describe('Create Category', () => {
    it('/categories (POST) - should create a new category', async () => {
      const response = await request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testCategory)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testCategory.name);

      createdCategoryId = response.body.id;
    });

    it('/categories (POST) - should fail with invalid data', async () => {
      return request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('/categories (POST) - should fail without authentication', async () => {
      return request(httpServer)
        .post('/categories')
        .send(testCategory)
        .expect(401);
    });

    it('/categories (POST) - should return 403 for regular user', async () => {
      return request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testCategory)
        .expect(403);
    });
  });

  // Тест получения категорий
  describe('Get Categories', () => {
    it('/categories (GET) - should get all categories', () => {
      return request(httpServer)
        .get('/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  // Тест обновления категории
  describe('Update Category', () => {
    it('/categories/:id (PATCH) - should update category', () => {
      return request(httpServer)
        .patch(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedCategory)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe(updatedCategory.name);
        });
    });

    it('/categories/:id (PATCH) - should return 404 for non-existent category', () => {
      return request(httpServer)
        .patch('/categories/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedCategory)
        .expect(404);
    });

    it('/categories/:id (PATCH) - should fail without authentication', () => {
      return request(httpServer)
        .patch(`/categories/${createdCategoryId}`)
        .send(updatedCategory)
        .expect(401);
    });

    it('/categories/:id (PATCH) - should return 403 for regular user', () => {
      return request(httpServer)
        .patch(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedCategory)
        .expect(403);
    });
  });

  // Тест удаления категории
  describe('Delete Category', () => {
    it('/categories/:id (DELETE) - should delete category', () => {
      return request(httpServer)
        .delete(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('/categories/:id (DELETE) - should return 404 for already deleted category', () => {
      return request(httpServer)
        .delete(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('/categories/:id (DELETE) - should fail without authentication', () => {
      return request(httpServer)
        .delete(`/categories/${createdCategoryId}`)
        .expect(401);
    });

    it('/categories/:id (DELETE) - should return 403 for regular user', () => {
      return request(httpServer)
        .delete(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
