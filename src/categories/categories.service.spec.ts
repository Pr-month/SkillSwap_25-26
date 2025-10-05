import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/categories.entity';

type MockRepo = Partial<Record<keyof Repository<any>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: MockRepo;

  beforeEach(async () => {
    jest.clearAllMocks();

    repo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('должен создаваться', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('возвращает корневые категории с детьми', async () => {
      const categories = [{ id: '1', name: 'A' }] as Category[];
      (repo.find as jest.Mock).mockResolvedValue(categories);

      const res = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({
        where: { parent: expect.any(Object) },
        relations: ['children'],
        order: { name: 'ASC' },
      });
      expect(res).toBe(categories);
    });
  });

  describe('update', () => {
    it('бросает NotFound, если категории нет', async () => {
      (repo.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.update('id1', {} as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('обновляет имя', async () => {
      const category: any = { id: 'id1', name: 'Old', parent: null };
      (repo.findOne as jest.Mock).mockResolvedValueOnce(category);
      (repo.save as jest.Mock).mockImplementation((c: any) =>
        Promise.resolve(c),
      );
      const res = await service.update('id1', { name: 'New' });
      expect(res.name).toBe('New');
      expect(repo.save).toHaveBeenCalledWith(category);
    });

    it('бросает BadRequest если parentId равен id категории', async () => {
      const category: any = { id: 'id1', name: 'Old', parent: null };
      (repo.findOne as jest.Mock).mockResolvedValueOnce(category);
      await expect(
        service.update('id1', { parentId: 'id1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('сбрасывает parent при parentId = null', async () => {
      const category: any = { id: 'id1', name: 'Old', parent: { id: 'p1' } };
      (repo.findOne as jest.Mock).mockResolvedValueOnce(category);
      (repo.save as jest.Mock).mockImplementation((c: any) =>
        Promise.resolve(c),
      );
      const res = await service.update('id1', { parentId: null });
      expect(res.parent).toBeNull();
    });

    it('устанавливает parent при валидном parentId', async () => {
      const category: any = { id: 'id1', name: 'Old', parent: null };
      const parent: any = { id: 'p1' };
      // первый findOne возвращает категорию, второй — родителя
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(parent);
      (repo.save as jest.Mock).mockImplementation((c: any) =>
        Promise.resolve(c),
      );

      const res = await service.update('id1', { parentId: 'p1' });
      expect(res.parent).toBe(parent);
      expect(repo.save).toHaveBeenCalledWith(category);
    });

    it('бросает BadRequest если parent не найден', async () => {
      const category: any = { id: 'id1', name: 'Old', parent: null };
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(null);
      await expect(
        service.update('id1', { parentId: 'missing' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('removeByID', () => {
    it('бросает NotFound если нет категории', async () => {
      (repo.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.removeByID('id1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('удаляет существующую категорию', async () => {
      (repo.findOne as jest.Mock).mockResolvedValueOnce({ id: 'id1' });
      (repo.delete as jest.Mock).mockResolvedValueOnce({ affected: 1 });
      const res = await service.removeByID('id1');
      expect(repo.delete).toHaveBeenCalledWith('id1');
      expect(res).toEqual({ message: 'Категория с ID id1 успешно удалена' });
    });
  });

  describe('create', () => {
    it('создаёт без родителя', async () => {
      const created: any = { id: 'id1', name: 'A' };
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(created);
      const res = await service.create({ name: 'A' } as any);
      expect(repo.create).toHaveBeenCalledWith({ name: 'A' });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(res).toBe(created);
    });

    it('бросает NotFound если parentId указан и не найден', async () => {
      (repo.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        service.create({ name: 'A', parentId: 'p1' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('создаёт с родителем', async () => {
      const parent: any = { id: 'p1' };
      const created: any = { id: 'id1', name: 'A', parent };
      (repo.findOne as jest.Mock).mockResolvedValueOnce(parent);
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(created);
      const res = await service.create({ name: 'A', parentId: 'p1' } as any);
      expect(repo.create).toHaveBeenCalledWith({ name: 'A', parent });
      expect(res).toBe(created);
    });
  });
});
