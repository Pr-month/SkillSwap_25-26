import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SkillsService } from './skills.service';
import { Skill } from './entities/skill.entity';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/categories/entities/categories.entity';

type MockRepo = Partial<Record<keyof Repository<any>, jest.Mock>> & {
  createQueryBuilder?: jest.Mock;
};

const createMockRepo = (): MockRepo => ({
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('SkillsService', () => {
  let service: SkillsService;
  let skillRepo: MockRepo;
  let userRepo: MockRepo;
  let categoryRepo: MockRepo;

  const fsExistsSyncSpy = jest.spyOn(require('fs'), 'existsSync');
  const fsUnlinkSyncSpy = jest.spyOn(require('fs'), 'unlinkSync');

  beforeEach(async () => {
    jest.clearAllMocks();

    skillRepo = createMockRepo();
    userRepo = createMockRepo();
    categoryRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: getRepositoryToken(Skill), useValue: skillRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('должен создаваться', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('успешно создаёт навык', async () => {
      const dto: any = { title: 't', description: 'd', categoryId: 'cat1', images: [] };
      const category = { id: 'cat1' } as Category;
      const owner = { id: 'user1' } as User;
      const created = { id: 'skill1', ...dto, category, owner } as Skill;

      categoryRepo.findOneBy!.mockResolvedValue(category);
      userRepo.findOneBy!.mockResolvedValue(owner);
      skillRepo.create!.mockReturnValue(created);
      skillRepo.save!.mockResolvedValue(created);

      const result = await service.create(dto, 'user1');
      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({ id: 'cat1' });
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 'user1' });
      expect(skillRepo.create).toHaveBeenCalledWith({ ...dto, category, owner });
      expect(skillRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('бросает NotFound, если категория не найдена', async () => {
      categoryRepo.findOneBy!.mockResolvedValue(null);
      await expect(service.create({ categoryId: 'x' } as any, 'u'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('бросает NotFound, если пользователь не найден', async () => {
      categoryRepo.findOneBy!.mockResolvedValue({ id: 'cat' });
      userRepo.findOneBy!.mockResolvedValue(null);
      await expect(service.create({ categoryId: 'x' } as any, 'u'))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('возвращает навык через findOneOrFail', async () => {
      const skill = { id: 's1' } as Skill;
      skillRepo.findOneOrFail!.mockResolvedValue(skill);
      const result = await service.findOne('s1');
      expect(skillRepo.findOneOrFail).toHaveBeenCalledWith({ where: { id: 's1' }, relations: ['owner'] });
      expect(result).toBe(skill);
    });
  });

  describe('update', () => {
    it('обновляет существующий навык', async () => {
      const skill = { id: 's1', title: 'old' } as any;
      skillRepo.findOneBy!.mockResolvedValue(skill);
      skillRepo.save!.mockImplementation(async (s) => s);
      const result = await service.update('s1', { title: 'new' } as any);
      expect(skillRepo.findOneBy).toHaveBeenCalledWith({ id: 's1' });
      expect(result.title).toBe('new');
      expect(skillRepo.save).toHaveBeenCalled();
    });

    it('бросает NotFound, если навык не найден', async () => {
      skillRepo.findOneBy!.mockResolvedValue(null);
      await expect(service.update('s1', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('бросает Forbidden, если пользователь не владелец', async () => {
      const skill = { id: 's1', owner: { id: 'other' }, images: [] } as any;
      jest.spyOn(service, 'findOne').mockResolvedValue(skill);
      await expect(service.remove('s1', 'user1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('удаляет навык и изображения владельца', async () => {
      const skill = { id: 's1', owner: { id: 'user1' }, images: ['a.jpg', 'b.jpg'] } as any;
      jest.spyOn(service, 'findOne').mockResolvedValue(skill);
      fsExistsSyncSpy.mockReturnValue(true);
      fsUnlinkSyncSpy.mockImplementation(() => undefined);
      skillRepo.delete!.mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove('s1', 'user1');
      expect(skillRepo.delete).toHaveBeenCalledWith('s1');
      expect(result).toEqual({ message: 'Навык успешно удален' });
      expect(fsUnlinkSyncSpy).toHaveBeenCalled();
    });

    it('бросает NotFound, если запись не удалена', async () => {
      const skill = { id: 's1', owner: { id: 'user1' }, images: [] } as any;
      jest.spyOn(service, 'findOne').mockResolvedValue(skill);
      skillRepo.delete!.mockResolvedValue({ affected: 0 } as any);
      await expect(service.remove('s1', 'user1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('favorites', () => {
    it('addToFavorites — бросает NotFound, если навык не найден', async () => {
      skillRepo.findOne!.mockResolvedValue(null);
      await expect(service.addToFavorites('s1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('addToFavorites — бросает NotFound, если пользователь не найден', async () => {
      skillRepo.findOne!.mockResolvedValue({ id: 's1' });
      userRepo.findOne!.mockResolvedValue(null);
      await expect(service.addToFavorites('s1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('addToFavorites — бросает Conflict, если уже в избранном', async () => {
      skillRepo.findOne!.mockResolvedValue({ id: 's1' });
      userRepo.findOne!.mockResolvedValue({ id: 'u1', favoriteSkills: [{ id: 's1' }] });
      await expect(service.addToFavorites('s1', 'u1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('addToFavorites — добавляет и сохраняет', async () => {
      const skill = { id: 's1' };
      const user: any = { id: 'u1', favoriteSkills: [] };
      skillRepo.findOne!.mockResolvedValue(skill);
      userRepo.findOne!.mockResolvedValue(user);
      userRepo.save!.mockResolvedValue(undefined);

      const res = await service.addToFavorites('s1', 'u1');
      expect(user.favoriteSkills).toContain(skill);
      expect(userRepo.save).toHaveBeenCalledWith(user);
      expect(res).toEqual({ message: 'Навык успешно добавлен в избранное' });
    });

    it('removeFromFavorites — бросает NotFound, если пользователь не найден', async () => {
      userRepo.findOne!.mockResolvedValue(null);
      await expect(service.removeFromFavorites('s1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removeFromFavorites — фильтрует и сохраняет', async () => {
      const user: any = { id: 'u1', favoriteSkills: [{ id: 's1' }, { id: 's2' }] };
      userRepo.findOne!.mockResolvedValue(user);
      userRepo.save!.mockResolvedValue(undefined);
      await service.removeFromFavorites('s1', 'u1');
      expect(user.favoriteSkills).toEqual([{ id: 's2' }]);
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('getSkills', () => {
    it('возвращает результат из queryBuilder', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 's1' }], 1]),
      } as any;

      skillRepo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.getSkills({ page: 1, limit: 10, search: 'dev', category: 'it' } as any);
      expect(skillRepo.createQueryBuilder).toHaveBeenCalledWith('skill');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual([[{ id: 's1' }], 1]);
    });
  });
});
