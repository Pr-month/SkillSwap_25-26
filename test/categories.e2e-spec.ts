import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { Gender, UserRole } from '../src/users/enums';
import { Server } from 'http';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let authService: AuthService;
  let usersService: UsersService;
  let adminToken: string;
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
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Получаем HTTP сервер с типизацией
    httpServer = app.getHttpServer() as Server;

    // Получаем сервисы для аутентификации
    authService = app.get(AuthService);
    usersService = app.get(UsersService);

    // Создаем или находим администратора и получаем токен
    const adminUser = await usersService.findByEmail('admin@example.com');
    if (!adminUser) {
      // Создаем тестового администратора если его нет
      const adminData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'adminpassword',
        birthdate: new Date('1990-01-01'),
        gender: Gender.MALE,
        role: UserRole.ADMIN,
        about: 'Test admin user',
        city: 'Test City',
        avatar: 'test-avatar.jpg',
      };
      await usersService.create(adminData);
    }

    // Логинимся как администратор
    const tokens = await authService.login({
      email: 'admin@example.com',
      password: 'adminpassword',
    });
    adminToken = tokens.accessToken;
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

    it('/categories/:id (GET) - should get category by id', () => {
      return request(httpServer)
        .get(`/categories/${createdCategoryId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdCategoryId);
          expect(res.body.name).toBe(testCategory.name);
        });
    });

    it('/categories/:id (GET) - should return 404 for non-existent category', () => {
      return request(httpServer)
        .get('/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);
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
  });
});
