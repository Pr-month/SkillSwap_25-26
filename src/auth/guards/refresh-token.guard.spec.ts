import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenGuard } from './refresh-token.guard';

describe('RefreshTokenGuard', () => {
  let guard: RefreshTokenGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshTokenGuard],
    }).compile();

    guard = module.get<RefreshTokenGuard>(RefreshTokenGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard', () => {
    expect(guard).toBeInstanceOf(RefreshTokenGuard);
  });
});
