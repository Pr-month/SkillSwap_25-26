import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as passport from 'passport';
import { App } from 'supertest/types';
import { RequestsController } from 'src/requests/requests.controller';
import { RequestsService } from 'src/requests/requests.service';
import { CreateRequestDto } from 'src/requests/dto/create-request.dto';
import { UpdateRequestDto } from 'src/requests/dto/update-request.dto';
import { RequestStatus } from 'src/users/enums';
import { AdminUserData, RegularUsersData } from 'src/scripts/users.data';

// Мок-данные на основе сидинг-данных
const MOCK_USERS = {
  sender: {
    userId: 'sender-user-id',
    email: RegularUsersData[0].email, // Иван Иванов из сидинга
    role: RegularUsersData[0].role,
  },
  receiver: {
    userId: 'receiver-user-id',
    email: RegularUsersData[1].email, // Ольга Петрова из сидинга
    role: RegularUsersData[1].role,
  },
  admin: {
    userId: 'admin-user-id',
    email: AdminUserData.email, // Администратор из сидинга
    role: AdminUserData.role,
  },
  other: {
    userId: 'other-user-id',
    email: RegularUsersData[2].email, // Кот Котовский из сидинга
    role: RegularUsersData[2].role,
  },
};

// Мок-стратегии аутентификации
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

    // Определяем пользователя по токену
    let user;
    if (token === 'sender-token') {
      user = MOCK_USERS.sender;
    } else if (token === 'receiver-token') {
      user = MOCK_USERS.receiver;
    } else if (token === 'admin-token') {
      user = MOCK_USERS.admin;
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

// Мок-сервис для requests
class MockRequestsService {
  private requests: any[] = [];
  private requestIdCounter = 1;

  create(createRequestDto: CreateRequestDto, senderId: string): Promise<any> {
    const { offeredSkillId, requestedSkillId } = createRequestDto;

    // Проверяем, что пользователь не отправляет заявку самому себе
    if (offeredSkillId === requestedSkillId) {
      const error = new Error(
        'Нельзя отправить заявку на обмен одного и того же навыка',
      );
      (error as any).status = 400;
      throw error;
    }

    // Проверяем существование навыков (мок-данные)
    if (offeredSkillId === '550e8400-e29b-41d4-a716-446655440004') {
      const error = new Error('Предлагаемый навык не найден');
      (error as any).status = 404;
      throw error;
    }

    if (requestedSkillId === '550e8400-e29b-41d4-a716-446655440005') {
      const error = new Error('Запрашиваемый навык не найден');
      (error as any).status = 404;
      throw error;
    }

    // Проверяем, что предлагаемый навык принадлежит отправителю
    if (offeredSkillId === '550e8400-e29b-41d4-a716-446655440006') {
      const error = new Error('Вы можете предлагать только свои навыки');
      (error as any).status = 403;
      throw error;
    }

    // Проверяем, что запрашиваемый навык не принадлежит отправителю
    if (requestedSkillId === '550e8400-e29b-41d4-a716-446655440008') {
      const error = new Error('Нельзя отправить заявку на обмен самому себе');
      (error as any).status = 400;
      throw error;
    }

    const newRequest = {
      id: `request-${this.requestIdCounter++}`,
      createdAt: new Date(),
      sender: { id: senderId, email: MOCK_USERS.sender.email },
      receiver: { id: 'receiver-user-id', email: MOCK_USERS.receiver.email },
      status: RequestStatus.PENDING,
      offeredSkill: { id: offeredSkillId, title: 'Offered Skill' },
      requestedSkill: { id: requestedSkillId, title: 'Requested Skill' },
      isRead: false,
    };

    this.requests.push(newRequest);
    return Promise.resolve(newRequest);
  }

  getIncomingRequests(userId: string): Promise<any[]> {
    return Promise.resolve(
      this.requests.filter(
        (req) =>
          req.receiver.id === userId && req.status === RequestStatus.PENDING,
      ),
    );
  }

  getOutgoingRequests(userId: string): Promise<any[]> {
    return Promise.resolve(
      this.requests.filter(
        (req) =>
          req.sender.id === userId &&
          (req.status === RequestStatus.PENDING ||
            req.status === RequestStatus.IN_PROGRESS),
      ),
    );
  }

  remove(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<{ message: string }> {
    const requestIndex = this.requests.findIndex((req) => req.id === id);

    if (requestIndex === -1) {
      const error = new Error(`Заявка с ID ${id} не найдена`);
      (error as any).status = 404;
      throw error;
    }

    const request = this.requests[requestIndex];

    // Проверяем права доступа
    if (userRole !== 'admin' && request.sender.id !== userId) {
      const error = new Error('У вас нет прав на удаление этой заявки');
      (error as any).status = 403;
      throw error;
    }

    this.requests.splice(requestIndex, 1);
    return Promise.resolve({ message: 'Заявка успешно удалена' });
  }

  update(
    id: string,
    updateRequestDto: UpdateRequestDto,
    userId: string,
    userRole: string,
  ): Promise<{ message: string }> {
    const requestIndex = this.requests.findIndex((req) => req.id === id);

    if (requestIndex === -1) {
      const error = new Error('Заявка не найдена');
      (error as any).status = 404;
      throw error;
    }

    const request = this.requests[requestIndex];

    // Проверяем права доступа
    const isReceiver = request.receiver.id === userId;
    const isSender = request.sender.id === userId;
    const isAdmin = userRole === 'admin';

    if (!isReceiver && !isSender && !isAdmin) {
      const error = new Error('У вас нет прав для обновления этой заявки');
      (error as any).status = 403;
      throw error;
    }

    // Обновляем заявку
    if (updateRequestDto.isRead !== undefined) {
      this.requests[requestIndex].isRead = updateRequestDto.isRead;
    }
    if (updateRequestDto.status !== undefined) {
      this.requests[requestIndex].status = updateRequestDto.status;
    }

    return Promise.resolve({ message: 'Заявка успешно обновлена' });
  }

  // Методы для тестирования
  clearRequests(): void {
    this.requests = [];
    this.requestIdCounter = 1;
  }

  addMockRequest(request: any): void {
    this.requests.push(request);
  }

  getRequests(): any[] {
    return this.requests;
  }
}

// Тестовые данные
const TEST_REQUESTS = {
  valid: {
    offeredSkillId: '550e8400-e29b-41d4-a716-446655440001',
    requestedSkillId: '550e8400-e29b-41d4-a716-446655440002',
  },
  sameSkill: {
    offeredSkillId: '550e8400-e29b-41d4-a716-446655440003',
    requestedSkillId: '550e8400-e29b-41d4-a716-446655440003',
  },
  nonExistentOffered: {
    offeredSkillId: '550e8400-e29b-41d4-a716-446655440004',
    requestedSkillId: '550e8400-e29b-41d4-a716-446655440002',
  },
  nonExistentRequested: {
    offeredSkillId: '550e8400-e29b-41d4-a716-446655440001',
    requestedSkillId: '550e8400-e29b-41d4-a716-446655440005',
  },
  otherUserSkill: {
    offeredSkillId: '550e8400-e29b-41d4-a716-446655440006',
    requestedSkillId: '550e8400-e29b-41d4-a716-446655440002',
  },
  selfRequest: {
    offeredSkillId: '550e8400-e29b-41d4-a716-446655440007',
    requestedSkillId: '550e8400-e29b-41d4-a716-446655440008',
  },
  invalidUuid: {
    offeredSkillId: 'invalid-uuid',
    requestedSkillId: '550e8400-e29b-41d4-a716-446655440002',
  },
  empty: {},
};

const TEST_UPDATE_REQUESTS = {
  markAsRead: {
    isRead: true,
  },
  markAsUnread: {
    isRead: false,
  },
  accept: {
    status: RequestStatus.ACCEPTED,
  },
  reject: {
    status: RequestStatus.REJECTED,
  },
  inProgress: {
    status: RequestStatus.IN_PROGRESS,
  },
  done: {
    status: RequestStatus.DONE,
  },
  invalidStatus: {
    status: 'invalid-status',
  },
  bothFields: {
    isRead: true,
    status: RequestStatus.ACCEPTED,
  },
};

describe('RequestsController (e2e)', () => {
  let app: INestApplication<App>;
  let mockService: MockRequestsService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        {
          provide: RequestsService,
          useClass: MockRequestsService,
        },
        {
          provide: 'JwtStrategy',
          useClass: MockJwtStrategy,
        },
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
              // Устанавливаем пользователя в зависимости от токена
              if (token === 'admin-token') {
                request.user = {
                  userId: 'admin-user-id',
                  email: 'admin@example.com',
                  role: 'admin',
                };
              } else if (token === 'sender-token') {
                request.user = {
                  userId: 'sender-user-id',
                  email: MOCK_USERS.sender.email,
                  role: 'user',
                };
              } else if (token === 'receiver-token') {
                request.user = {
                  userId: 'receiver-user-id',
                  email: MOCK_USERS.receiver.email,
                  role: 'user',
                };
              } else {
                request.user = {
                  userId: 'mock-user-id',
                  email: 'test@example.com',
                  role: 'user',
                };
              }
            }
          }
          return true;
        },
      })
      .overrideGuard('RolesGuard')
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          const user = request.user;
          if (!user) {
            return false;
          }
          // Проверяем роль пользователя
          const requiredRoles = context
            .getHandler()
            .reflector.get('roles', context.getHandler());
          if (requiredRoles && !requiredRoles.includes(user.role)) {
            return false;
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // Настраиваем глобальный exception filter для тестов
    app.useGlobalFilters({
      catch(exception: any, host: any) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception.status || 500;
        response.status(status).json({
          statusCode: status,
          message: exception.message,
        });
      },
    });

    // Получаем мок-сервис для управления тестовыми данными
    mockService = moduleFixture.get<MockRequestsService>(RequestsService);
    mockService.clearRequests();

    // Настраиваем мок-стратегию для Passport
    const mockJwtStrategy = moduleFixture.get<MockJwtStrategy>('JwtStrategy');
    passport.use('jwt', mockJwtStrategy);

    await app.init();
  });

  describe('POST /requests - Создание заявки на обмен навыками', () => {
    it('должен успешно создать заявку с корректными данными', async () => {
      const response = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.valid)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', RequestStatus.PENDING);
      expect(response.body).toHaveProperty('isRead', false);
      expect(response.body).toHaveProperty('sender');
      expect(response.body).toHaveProperty('receiver');
      expect(response.body).toHaveProperty('offeredSkill');
      expect(response.body).toHaveProperty('requestedSkill');
      expect(response.body.sender.id).toBe('sender-user-id');
      expect(response.body.receiver.id).toBe('receiver-user-id');
    });

    it('должен отклонять заявку на обмен одного и того же навыка', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.sameSkill)
        .expect(400); // Мок-сервис возвращает 400 Bad Request
    });

    it('должен отклонять заявку с несуществующим предлагаемым навыком', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.nonExistentOffered)
        .expect(404); // Мок-сервис возвращает 404 Not Found
    });

    it('должен отклонять заявку с несуществующим запрашиваемым навыком', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.nonExistentRequested)
        .expect(404); // Мок-сервис возвращает 404 Not Found
    });

    it('должен отклонять заявку с чужим предлагаемым навыком', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.otherUserSkill)
        .expect(403); // Мок-сервис возвращает 403 Forbidden
    });

    it('должен отклонять заявку на обмен самому себе', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.selfRequest)
        .expect(400); // Мок-сервис возвращает 400 Bad Request
    });

    it('должен отклонять заявку без аутентификации', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .send(TEST_REQUESTS.valid)
        .expect(401); // Без токена должно быть 401 Unauthorized
    });

    it('должен отклонять заявку с невалидным UUID', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.invalidUuid)
        .expect(400); // Валидация DTO
    });

    it('должен отклонять пустую заявку', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_REQUESTS.empty)
        .expect(400); // Валидация DTO
    });
  });

  describe('GET /requests/incoming - Получение входящих заявок', () => {
    beforeEach(() => {
      // Добавляем тестовые заявки
      mockService.addMockRequest({
        id: 'incoming-request-1',
        createdAt: new Date(),
        sender: { id: 'sender-user-id', email: 'sender@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.PENDING,
        offeredSkill: { id: 'skill-1', title: 'Skill 1' },
        requestedSkill: { id: 'skill-2', title: 'Skill 2' },
        isRead: false,
      });

      mockService.addMockRequest({
        id: 'incoming-request-2',
        createdAt: new Date(),
        sender: { id: 'other-sender-id', email: 'other@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.PENDING,
        offeredSkill: { id: 'skill-3', title: 'Skill 3' },
        requestedSkill: { id: 'skill-4', title: 'Skill 4' },
        isRead: true,
      });

      // Заявка с другим статусом (не должна попасть в результат)
      mockService.addMockRequest({
        id: 'accepted-request',
        createdAt: new Date(),
        sender: { id: 'sender-user-id', email: 'sender@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.ACCEPTED,
        offeredSkill: { id: 'skill-5', title: 'Skill 5' },
        requestedSkill: { id: 'skill-6', title: 'Skill 6' },
        isRead: false,
      });
    });

    it('должен возвращать только входящие заявки со статусом PENDING', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests/incoming')
        .set('Authorization', 'Bearer receiver-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Проверяем, что все заявки имеют статус PENDING
      response.body.forEach((req: any) => {
        expect(req.status).toBe(RequestStatus.PENDING);
        expect(req.receiver.id).toBe('receiver-user-id');
      });
    });

    it('должен возвращать пустой массив для пользователя без входящих заявок', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests/incoming')
        .set('Authorization', 'Bearer sender-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('должен отклонять запрос без аутентификации', async () => {
      await request(app.getHttpServer()).get('/requests/incoming').expect(401); // Без токена должно быть 401 Unauthorized
    });
  });

  describe('GET /requests/outgoing - Получение исходящих заявок', () => {
    beforeEach(() => {
      // Добавляем тестовые заявки
      mockService.addMockRequest({
        id: 'outgoing-request-1',
        createdAt: new Date(),
        sender: { id: 'sender-user-id', email: 'sender@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.PENDING,
        offeredSkill: { id: 'skill-1', title: 'Skill 1' },
        requestedSkill: { id: 'skill-2', title: 'Skill 2' },
        isRead: false,
      });

      mockService.addMockRequest({
        id: 'outgoing-request-2',
        createdAt: new Date(),
        sender: { id: 'sender-user-id', email: 'sender@example.com' },
        receiver: { id: 'other-receiver-id', email: 'other@example.com' },
        status: RequestStatus.IN_PROGRESS,
        offeredSkill: { id: 'skill-3', title: 'Skill 3' },
        requestedSkill: { id: 'skill-4', title: 'Skill 4' },
        isRead: true,
      });

      // Заявка с другим статусом (не должна попасть в результат)
      mockService.addMockRequest({
        id: 'rejected-request',
        createdAt: new Date(),
        sender: { id: 'sender-user-id', email: 'sender@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.REJECTED,
        offeredSkill: { id: 'skill-5', title: 'Skill 5' },
        requestedSkill: { id: 'skill-6', title: 'Skill 6' },
        isRead: false,
      });
    });

    it('должен возвращать только исходящие заявки со статусом PENDING или IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests/outgoing')
        .set('Authorization', 'Bearer sender-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Проверяем, что все заявки имеют подходящий статус
      response.body.forEach((req: any) => {
        expect([RequestStatus.PENDING, RequestStatus.IN_PROGRESS]).toContain(
          req.status,
        );
        expect(req.sender.id).toBe('sender-user-id');
      });
    });

    it('должен возвращать пустой массив для пользователя без исходящих заявок', async () => {
      const response = await request(app.getHttpServer())
        .get('/requests/outgoing')
        .set('Authorization', 'Bearer receiver-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('должен отклонять запрос без аутентификации', async () => {
      await request(app.getHttpServer()).get('/requests/outgoing').expect(401); // Без токена должно быть 401 Unauthorized
    });
  });

  describe('DELETE /requests/:id - Удаление заявки', () => {
    beforeEach(() => {
      // Добавляем тестовую заявку
      mockService.addMockRequest({
        id: 'test-request-id',
        createdAt: new Date(),
        sender: { id: 'sender-user-id', email: 'sender@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.PENDING,
        offeredSkill: { id: 'skill-1', title: 'Skill 1' },
        requestedSkill: { id: 'skill-2', title: 'Skill 2' },
        isRead: false,
      });
    });

    it('должен успешно удалить заявку отправителем', async () => {
      const response = await request(app.getHttpServer())
        .delete('/requests/test-request-id')
        .set('Authorization', 'Bearer sender-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Заявка успешно удалена');
    });

    it('должен успешно удалить заявку администратором', async () => {
      const response = await request(app.getHttpServer())
        .delete('/requests/test-request-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Заявка успешно удалена');
    });

    it('должен отклонять удаление чужой заявки обычным пользователем', async () => {
      await request(app.getHttpServer())
        .delete('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .expect(403); // Мок-сервис должен возвращать 403 Forbidden
    });

    it('должен возвращать 404 для несуществующей заявки', async () => {
      await request(app.getHttpServer())
        .delete('/requests/non-existent-id')
        .set('Authorization', 'Bearer sender-token')
        .expect(404); // Мок-сервис должен возвращать 404 Not Found
    });

    it('должен отклонять запрос без аутентификации', async () => {
      await request(app.getHttpServer())
        .delete('/requests/test-request-id')
        .expect(401); // Без токена должно быть 401 Unauthorized
    });
  });

  describe('PATCH /requests/:id - Обновление заявки', () => {
    beforeEach(() => {
      // Добавляем тестовую заявку
      mockService.addMockRequest({
        id: 'test-request-id',
        createdAt: new Date(),
        sender: { id: 'sender-user-id', email: 'sender@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.PENDING,
        offeredSkill: { id: 'skill-1', title: 'Skill 1' },
        requestedSkill: { id: 'skill-2', title: 'Skill 2' },
        isRead: false,
      });
    });

    it('должен успешно отметить заявку как прочитанную', async () => {
      const response = await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.markAsRead)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Заявка успешно обновлена',
      );
    });

    it('должен успешно принять заявку', async () => {
      const response = await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.accept)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Заявка успешно обновлена',
      );
    });

    it('должен успешно отклонить заявку', async () => {
      const response = await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.reject)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Заявка успешно обновлена',
      );
    });

    it('должен успешно обновить статус на IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.inProgress)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Заявка успешно обновлена',
      );
    });

    it('должен успешно обновить статус на DONE', async () => {
      const response = await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.done)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Заявка успешно обновлена',
      );
    });

    it('должен успешно обновить оба поля одновременно', async () => {
      const response = await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.bothFields)
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Заявка успешно обновлена',
      );
    });

    it('должен отклонять обновление чужой заявки', async () => {
      // Создаем заявку от другого пользователя
      mockService.addMockRequest({
        id: 'other-request-id',
        createdAt: new Date(),
        sender: { id: 'other-user-id', email: 'other@example.com' },
        receiver: { id: 'receiver-user-id', email: 'receiver@example.com' },
        status: RequestStatus.PENDING,
        offeredSkill: { id: 'skill-1', title: 'Skill 1' },
        requestedSkill: { id: 'skill-2', title: 'Skill 2' },
        isRead: false,
      });

      await request(app.getHttpServer())
        .patch('/requests/other-request-id')
        .set('Authorization', 'Bearer sender-token')
        .send(TEST_UPDATE_REQUESTS.accept)
        .expect(403); // Мок-сервис должен возвращать 403 Forbidden
    });

    it('должен возвращать 404 для несуществующей заявки', async () => {
      await request(app.getHttpServer())
        .patch('/requests/non-existent-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.accept)
        .expect(404); // Мок-сервис должен возвращать 404 Not Found
    });

    it('должен отклонять запрос без аутентификации', async () => {
      await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .send(TEST_UPDATE_REQUESTS.accept)
        .expect(401); // Без токена должно быть 401 Unauthorized
    });

    it('должен отклонять невалидный статус', async () => {
      await request(app.getHttpServer())
        .patch('/requests/test-request-id')
        .set('Authorization', 'Bearer receiver-token')
        .send(TEST_UPDATE_REQUESTS.invalidStatus)
        .expect(400); // Валидация DTO
    });
  });

  describe('Граничные случаи и обработка ошибок', () => {
    it('должен корректно обрабатывать очень длинные UUID', async () => {
      const longUuid = 'a'.repeat(100);

      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send({
          offeredSkillId: longUuid,
          requestedSkillId: 'valid-requested-skill',
        })
        .expect(400); // Валидация UUID
    });

    it('должен корректно обрабатывать запросы с дополнительными полями', async () => {
      const response = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send({
          ...TEST_REQUESTS.valid,
          extraField: 'extra value',
          anotherField: 123,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('должен корректно обрабатывать запросы с null значениями', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send({
          offeredSkillId: null,
          requestedSkillId: null,
        })
        .expect(400); // Валидация DTO
    });

    it('должен корректно обрабатывать пустые строки в UUID', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', 'Bearer sender-token')
        .send({
          offeredSkillId: '',
          requestedSkillId: '',
        })
        .expect(400); // Валидация DTO
    });
  });

  describe('Доступность маршрутов', () => {
    it('должен иметь доступные маршруты для работы с заявками', async () => {
      // Проверяем, что основные эндпоинты доступны
      await request(app.getHttpServer())
        .get('/requests/incoming')
        .set('Authorization', 'Bearer receiver-token')
        .expect(200);

      await request(app.getHttpServer())
        .get('/requests/outgoing')
        .set('Authorization', 'Bearer sender-token')
        .expect(200);
    });

    it('должен возвращать 404 для несуществующих маршрутов', async () => {
      await request(app.getHttpServer())
        .get('/requests/non-existent')
        .set('Authorization', 'Bearer sender-token')
        .expect(404);
    });
  });
});
